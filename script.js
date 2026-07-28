// ==================== ERROR HANDLING ====================
// Handle service worker registration errors gracefully
console.log('App initializing...');

// ==================== DEFAULT STUDENTS ====================
const DEFAULT_STUDENTS = [
    "Rita Achieng", "Trizah Akinyi", "Angeline Scarlet", "Hellen Mueni",
    "Clansy Wairimu", "Shantel Wanjiru", "Brandon Kamau", "Juliet Apondi",
    "Yvonne Kasyoko", "John Njogu", "Serah Mbula", "Rhoda Aluoch",
    "Rich Paul Maina", "Rueben Onyango", "Michael Muthoko", "Francis Wagura",
    "Valentine Atieno", "Margaret Mbala", "Faith Wanjiku", "Samuel Kamande",
    "Hildah Jaraha", "Anne Ateko Jane", "Abel Gift", "Clifford Maina",
    "Brighton Rioba", "Esther Mbone", "Maureen Wangari", "Donald Were",
    "Tracy Awino", "Faith Valary", "Shantel Anyango", "Margaret Akinyi",
    "Faith Wanjiku", "Camara Adhiambo", "Rennus Achieng", "Leon Castro",
    "Peter Aswani", "Joseph Karuga", "Rober Ng' Anga", "Chanel Mbeneka",
    "Francis Mbuni", "Claret Wairimu", "Symon Wanjohi", "Jibril Gitau",
    "Ritah Arengo", "Time Atani", "Abigael Ashevaah", "Petra Akinyi",
    "Bianca Waithera", "Mary Njoki", "Latifa Wairimu", "Augustine Makumba",
    "Esther Njeri", "Stellah Muthoni", "Elvi Omondi", "Tiffany Nelii",
    "Nancy Nyambura", "Lavian Atieno", "Tiffah Mbeneka", "Ann Ateko",
    "Melsa Aluoch", "Sharlet Repha", "Travis Oduor", "Stephen Irungu",
    "Yvonne Wanjiru", "Christine Wanjiru", "Shaomi Wegesa", "Kate Mumbua",
    "Titus Wambua", "Adrian Otieno", "Purity Ann", "Dickson Peter",
    "Dylan Kurla", "Jael Pendo"
];

// ==================== APP STATE ====================
let appData = {
    orgName: '',
    admin1: '',
    admin2: '',
    students: [],
    teachers: [],
    attendance: [],
    dailyActivities: [],
    settings: {
        darkMode: false,
        setupComplete: false
    }
};

let currentAttendanceStatus = {};
let currentTeacherAttendance = {};

// ==================== UNDO/REDO SYSTEM ====================
let historyStack = [];
let historyIndex = -1;
const MAX_HISTORY = 50;

function pushToHistory(action, data) {
    try {
        // Remove any forward history
        historyStack = historyStack.slice(0, historyIndex + 1);
        
        // Add new action
        historyStack.push({
            action: action,
            data: data,
            timestamp: new Date().toISOString()
        });
        
        // Limit history size
        if (historyStack.length > MAX_HISTORY) {
            historyStack.shift();
        }
        
        historyIndex = historyStack.length - 1;
        updateUndoButtons();
    } catch (e) {
        console.error('Error pushing to history:', e);
    }
}

function undoAction() {
    try {
        if (historyIndex < 0) {
            showStatus('Nothing to undo', 'info');
            return;
        }
        
        const previousState = historyStack[historyIndex - 1];
        
        if (previousState) {
            restoreAttendanceState(previousState.data);
            historyIndex--;
            showStatus('↩️ Undo successful', 'info');
        } else {
            showStatus('Nothing to undo', 'info');
        }
        updateUndoButtons();
    } catch (e) {
        console.error('Error undoing:', e);
        showStatus('Error undoing action', 'error');
    }
}

function redoAction() {
    try {
        if (historyIndex >= historyStack.length - 1) {
            showStatus('Nothing to redo', 'info');
            return;
        }
        
        const nextState = historyStack[historyIndex + 1];
        if (nextState) {
            restoreAttendanceState(nextState.data);
            historyIndex++;
            showStatus('↪️ Redo successful', 'info');
        } else {
            showStatus('Nothing to redo', 'info');
        }
        updateUndoButtons();
    } catch (e) {
        console.error('Error redoing:', e);
        showStatus('Error redoing action', 'error');
    }
}

function restoreAttendanceState(data) {
    try {
        if (data.statusMap) {
            currentAttendanceStatus = JSON.parse(JSON.stringify(data.statusMap));
        }
        if (data.teacherMap) {
            currentTeacherAttendance = JSON.parse(JSON.stringify(data.teacherMap));
        }
        renderAttendanceGrid();
        updateAttendanceStats();
        renderTeacherCheckboxes();
    } catch (e) {
        console.error('Error restoring state:', e);
    }
}

function updateUndoButtons() {
    try {
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        
        if (undoBtn) {
            undoBtn.disabled = historyIndex < 0;
            undoBtn.style.opacity = historyIndex < 0 ? '0.5' : '1';
        }
        if (redoBtn) {
            redoBtn.disabled = historyIndex >= historyStack.length - 1;
            redoBtn.style.opacity = historyIndex >= historyStack.length - 1 ? '0.5' : '1';
        }
    } catch (e) {
        console.error('Error updating undo buttons:', e);
    }
}

// ==================== INITIALIZATION ====================
function init() {
    try {
        console.log('Initializing app...');
        loadData();
        
        // Initialize with default students if no students exist
        if (appData.students.length === 0) {
            console.log('Adding default students...');
            DEFAULT_STUDENTS.forEach(name => {
                appData.students.push({
                    id: 'STU' + String(appData.students.length + 1).padStart(3, '0'),
                    name: name,
                    daysToAttend: 5,
                    joined: new Date().toISOString(),
                    attendance: []
                });
            });
            saveData();
        }

        applyTheme();
        checkSetup();
        setDefaultDate();
        updateUI();
        updateUndoButtons();
        console.log('App initialized successfully!');
    } catch (e) {
        console.error('Error initializing app:', e);
        showStatus('Error initializing app. Please refresh.', 'error');
    }
}

// ==================== DATA MANAGEMENT ====================
function loadData() {
    try {
        const saved = localStorage.getItem('slumChildApp');
        if (saved) {
            const parsed = JSON.parse(saved);
            appData = { ...appData, ...parsed };
        }
    } catch (e) {
        console.error('Error loading data:', e);
    }
}

function saveData() {
    try {
        localStorage.setItem('slumChildApp', JSON.stringify(appData));
        updateUI();
    } catch (e) {
        console.error('Error saving data:', e);
        showStatus('Error saving data. Please check storage space.', 'error');
    }
}

function checkSetup() {
    if (appData.settings.setupComplete && appData.orgName) {
        document.getElementById('setupSection').style.display = 'none';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('orgNameDisplay').textContent = appData.orgName;
    } else {
        document.getElementById('setupSection').style.display = 'block';
        document.getElementById('mainContent').style.display = 'none';
        if (appData.orgName) {
            document.getElementById('orgName').value = appData.orgName;
            document.getElementById('admin1').value = appData.admin1 || '';
            document.getElementById('admin2').value = appData.admin2 || '';
        }
    }
}

// ==================== SETUP ====================
function saveSetup() {
    const orgName = document.getElementById('orgName').value.trim();
    const admin1 = document.getElementById('admin1').value.trim();
    const admin2 = document.getElementById('admin2').value.trim();

    if (!orgName || !admin1 || !admin2) {
        showStatus('Please fill in all setup fields.', 'error');
        return;
    }

    appData.orgName = orgName;
    appData.admin1 = admin1;
    appData.admin2 = admin2;
    appData.settings.setupComplete = true;
    saveData();
    checkSetup();
    showStatus('✅ Setup complete! Organization data saved.', 'success');
}

// ==================== STUDENT MANAGEMENT ====================
function addStudent() {
    const nameInput = document.getElementById('studentName');
    const name = nameInput.value.trim();
    const days = parseInt(document.getElementById('studentDays').value);

    if (!name) {
        showStatus('Please enter a student name.', 'error');
        nameInput.focus();
        return;
    }

    if (appData.students.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        showStatus('⚠️ Student already exists!', 'error');
        return;
    }

    const student = {
        id: 'STU' + String(appData.students.length + 1).padStart(3, '0'),
        name: name,
        daysToAttend: days,
        joined: new Date().toISOString(),
        attendance: []
    };

    appData.students.push(student);
    saveData();
    document.getElementById('studentName').value = '';
    showStatus(`✅ ${name} added successfully! ID: ${student.id}`, 'success');
    renderStudents();
    renderAttendanceGrid();
}

function renderStudents() {
    const list = document.getElementById('studentList');
    const search = document.getElementById('studentSearch').value.toLowerCase();
    const filtered = appData.students.filter(s => s.name.toLowerCase().includes(search));
    
    document.getElementById('studentCount').textContent = appData.students.length;

    if (filtered.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No students found.</p>';
        return;
    }

    list.innerHTML = filtered.map(student => {
        const totalDays = student.attendance ? student.attendance.length : 0;
        const presentDays = student.attendance ? student.attendance.filter(a => a.present).length : 0;
        const rate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        return `
            <div class="student-item">
                <div class="student-info">
                    <span class="student-id">${student.id}</span>
                    <span class="student-name">${student.name}</span>
                    <span class="student-days">📅 ${student.daysToAttend} days</span>
                    <span class="badge ${rate >= 80 ? 'badge-success' : rate >= 50 ? 'badge-warning' : 'badge-danger'}">
                        ${rate}% attendance
                    </span>
                </div>
                <div style="display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${totalDays} days</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">✓ ${presentDays}</span>
                    <button class="btn btn-danger btn-sm" onclick="removeStudent('${student.id}')">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function removeStudent(id) {
    if (confirm('Are you sure you want to remove this student?')) {
        appData.students = appData.students.filter(s => s.id !== id);
        saveData();
        renderStudents();
        renderAttendanceGrid();
        showStatus('Student removed.', 'success');
    }
}

// ==================== TEACHER MANAGEMENT ====================
function addTeacher() {
    const nameInput = document.getElementById('teacherName');
    const name = nameInput.value.trim();
    const role = document.getElementById('teacherRole').value;

    if (!name) {
        showStatus('Please enter a teacher name.', 'error');
        nameInput.focus();
        return;
    }

    const teacher = {
        id: 'TCH' + String(appData.teachers.length + 1).padStart(3, '0'),
        name: name,
        role: role,
        joined: new Date().toISOString()
    };

    appData.teachers.push(teacher);
    saveData();
    document.getElementById('teacherName').value = '';
    showStatus(`✅ ${name} added as ${role}!`, 'success');
    renderTeachers();
    renderTeacherCheckboxes();
}

function renderTeachers() {
    const list = document.getElementById('teacherList');
    document.getElementById('teacherCount').textContent = appData.teachers.length;

    if (appData.teachers.length === 0) {
        list.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No teachers added yet.</p>';
        return;
    }

    list.innerHTML = appData.teachers.map(teacher => `
        <div class="student-item">
            <div class="student-info">
                <span class="student-id">${teacher.id}</span>
                <span class="student-name">${teacher.name}</span>
                <span class="badge badge-success">${teacher.role}</span>
            </div>
            <button class="btn btn-danger btn-sm" onclick="removeTeacher('${teacher.id}')">✕</button>
        </div>
    `).join('');
}

function removeTeacher(id) {
    if (confirm('Are you sure you want to remove this teacher?')) {
        appData.teachers = appData.teachers.filter(t => t.id !== id);
        saveData();
        renderTeachers();
        renderTeacherCheckboxes();
        showStatus('Teacher removed.', 'success');
    }
}

// ==================== TEACHER ATTENDANCE CHECKBOXES ====================
function renderTeacherCheckboxes() {
    const container = document.getElementById('teacherAttendanceCheckboxes');
    
    if (appData.teachers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); font-size: 0.85rem;">No teachers added yet. Go to Teachers tab to add.</p>';
        return;
    }

    // Get existing teacher attendance for today's date
    const date = document.getElementById('attendanceDate').value;
    const existingRecord = appData.attendance.find(a => a.date === date);
    const presentTeachers = existingRecord ? existingRecord.presentTeachers || [] : [];

    container.innerHTML = appData.teachers.map(teacher => {
        const isChecked = presentTeachers.includes(teacher.id);
        currentTeacherAttendance[teacher.id] = isChecked;
        return `
            <label class="teacher-checkbox ${isChecked ? 'checked' : ''}" id="teacher-label-${teacher.id}">
                <input type="checkbox" 
                       id="teacher-${teacher.id}" 
                       ${isChecked ? 'checked' : ''}
                       onchange="toggleTeacherAttendance('${teacher.id}')">
                ${teacher.name} (${teacher.role})
            </label>
        `;
    }).join('');

    updateTeacherCount();
}

function toggleTeacherAttendance(teacherId) {
    const checkbox = document.getElementById(`teacher-${teacherId}`);
    const label = document.getElementById(`teacher-label-${teacherId}`);
    currentTeacherAttendance[teacherId] = checkbox.checked;
    
    if (checkbox.checked) {
        label.classList.add('checked');
    } else {
        label.classList.remove('checked');
    }
    
    updateTeacherCount();
    
    // Push to history
    pushToHistory('teacherToggle', {
        teacherId: teacherId,
        status: checkbox.checked,
        statusMap: currentAttendanceStatus,
        teacherMap: currentTeacherAttendance
    });
}

function updateTeacherCount() {
    const count = Object.values(currentTeacherAttendance).filter(v => v === true).length;
    document.getElementById('teacherPresentCount').textContent = count;
}

// ==================== ATTENDANCE ====================
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('attendanceDate').value = today;
}

function renderAttendanceGrid() {
    const grid = document.getElementById('attendanceGrid');
    const date = document.getElementById('attendanceDate').value;

    if (!date) {
        grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Please select a date.</p>';
        return;
    }

    if (appData.students.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No students added yet. Go to Students tab to add.</p>';
        return;
    }

    // Get existing attendance for this date
    const existingRecord = appData.attendance.find(a => a.date === date);
    const presentStudents = existingRecord ? existingRecord.presentStudents : [];
    const presentTeachers = existingRecord ? existingRecord.presentTeachers || [] : [];

    // Build status map
    currentAttendanceStatus = {};
    appData.students.forEach(student => {
        currentAttendanceStatus[student.id] = presentStudents.includes(student.id);
    });

    // Update teacher checkboxes
    appData.teachers.forEach(teacher => {
        currentTeacherAttendance[teacher.id] = presentTeachers.includes(teacher.id);
        const checkbox = document.getElementById(`teacher-${teacher.id}`);
        const label = document.getElementById(`teacher-label-${teacher.id}`);
        if (checkbox) {
            checkbox.checked = presentTeachers.includes(teacher.id);
        }
        if (label) {
            label.classList.toggle('checked', presentTeachers.includes(teacher.id));
        }
    });
    updateTeacherCount();

    // Update stats
    updateAttendanceStats();

    grid.innerHTML = appData.students.map((student, index) => {
        const isPresent = currentAttendanceStatus[student.id] || false;
        const statusClass = isPresent ? 'present' : 'absent';
        const statusText = isPresent ? '✅ Present' : '❌ Absent';
        
        return `
            <div class="attendance-item ${statusClass}" 
                 data-student-id="${student.id}"
                 onclick="toggleStudentStatus('${student.id}')">
                <div class="name">${student.name}</div>
                <div class="status-badge ${statusClass}">
                    ${statusText}
                </div>
            </div>
        `;
    }).join('');

    // Re-render teacher checkboxes to ensure they're in sync
    renderTeacherCheckboxes();
    updateUndoButtons();
}

function toggleStudentStatus(studentId) {
    // Toggle the status
    const newStatus = !currentAttendanceStatus[studentId];
    currentAttendanceStatus[studentId] = newStatus;
    
    // Push to history before changing
    pushToHistory('studentToggle', {
        studentId: studentId,
        newStatus: newStatus,
        statusMap: currentAttendanceStatus,
        teacherMap: currentTeacherAttendance
    });
    
    // Update UI
    renderAttendanceGrid();
    updateAttendanceStats();
    
    // Vibrate on mobile for feedback
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
}

function setAllStudents(status) {
    // Push current state to history
    pushToHistory('bulkAction', {
        action: status ? 'allPresent' : 'allAbsent',
        statusMap: currentAttendanceStatus,
        teacherMap: currentTeacherAttendance
    });
    
    // Set all students to the specified status
    appData.students.forEach(student => {
        currentAttendanceStatus[student.id] = status;
    });
    
    // Update UI
    renderAttendanceGrid();
    updateAttendanceStats();
    
    // Vibrate for feedback
    if (navigator.vibrate) {
        navigator.vibrate(20);
    }
    
    showStatus(`✅ All students marked as ${status ? 'Present' : 'Absent'}`, 'success');
}

function updateAttendanceStats() {
    const total = appData.students.length;
    const present = Object.values(currentAttendanceStatus).filter(v => v === true).length;
    const absent = total - present;
    const marked = Object.keys(currentAttendanceStatus).length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    const progress = total > 0 ? Math.round((marked / total) * 100) : 0;

    document.getElementById('totalStudentsStat').textContent = total;
    document.getElementById('presentCountStat').textContent = present;
    document.getElementById('absentCountStat').textContent = absent;
    document.getElementById('attendanceRateStat').textContent = rate + '%';
    
    // Update progress
    const progressBar = document.getElementById('attendanceProgress');
    const progressText = document.getElementById('attendanceProgressText');
    if (progressBar) {
        progressBar.style.width = progress + '%';
        progressBar.style.background = progress === 100 ? 'var(--success)' : 'var(--accent)';
    }
    if (progressText) {
        progressText.textContent = `${marked}/${total} (${progress}%)`;
    }
}

function submitAttendance() {
    const date = document.getElementById('attendanceDate').value;
    const activity = document.getElementById('activityToday').value.trim();

    if (!date) {
        showStatus('Please select a date.', 'error');
        return;
    }

    if (!activity) {
        showStatus('Please enter the activity done today.', 'error');
        document.getElementById('activityToday').focus();
        return;
    }

    // Check if all students are marked
    const total = appData.students.length;
    const marked = Object.keys(currentAttendanceStatus).length;
    if (marked < total) {
        if (!confirm(`⚠️ Only ${marked}/${total} students are marked. Continue anyway?`)) {
            return;
        }
    }

    // Get present students from current status
    const presentStudents = Object.keys(currentAttendanceStatus).filter(
        id => currentAttendanceStatus[id] === true
    );

    // Get present teachers from checkboxes
    const presentTeachers = Object.keys(currentTeacherAttendance).filter(
        id => currentTeacherAttendance[id] === true
    );

    // Update or create attendance record
    let attendanceRecord = appData.attendance.find(a => a.date === date);
    if (!attendanceRecord) {
        attendanceRecord = {
            date: date,
            presentStudents: [],
            presentTeachers: [],
            activity: activity
        };
        appData.attendance.push(attendanceRecord);
    } else {
        attendanceRecord.presentStudents = presentStudents;
        attendanceRecord.presentTeachers = presentTeachers;
        attendanceRecord.activity = activity;
    }

    // Update student attendance history
    appData.students.forEach(student => {
        const existing = student.attendance.find(a => a.date === date);
        if (!existing) {
            student.attendance.push({
                date: date,
                present: presentStudents.includes(student.id)
            });
        } else {
            existing.present = presentStudents.includes(student.id);
        }
    });

    // Save daily activity with teacher info
    appData.dailyActivities.push({
        date: date,
        activity: activity,
        presentCount: presentStudents.length,
        totalStudents: appData.students.length,
        presentTeachers: presentTeachers,
        teacherNames: presentTeachers.map(id => {
            const teacher = appData.teachers.find(t => t.id === id);
            return teacher ? teacher.name : '';
        }).filter(Boolean),
        submittedBy: 'Teacher',
        timestamp: new Date().toISOString()
    });

    saveData();
    renderAttendanceHistory();
    renderAttendanceGrid();
    
    // Clear activity field
    document.getElementById('activityToday').value = '';
    
    const teacherNames = presentTeachers.map(id => {
        const teacher = appData.teachers.find(t => t.id === id);
        return teacher ? teacher.name : '';
    }).filter(Boolean).join(', ');

    showStatus(
        `✅ Daily report submitted for ${new Date(date).toLocaleDateString()}! ` +
        `Activity: ${activity}. ` +
        `Teachers present: ${teacherNames || 'None'}`,
        'success'
    );
}

function renderAttendanceHistory() {
    const container = document.getElementById('attendanceHistory');
    const history = appData.attendance.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30);

    if (history.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No attendance records yet.</p>';
        return;
    }

    container.innerHTML = `
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Activity</th>
                        <th>Present</th>
                        <th>Total</th>
                        <th>Rate</th>
                        <th>Teachers Present</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(record => {
                        const rate = appData.students.length > 0 
                            ? Math.round((record.presentStudents.length / appData.students.length) * 100)
                            : 0;
                        const teacherNames = (record.presentTeachers || []).map(id => {
                            const teacher = appData.teachers.find(t => t.id === id);
                            return teacher ? teacher.name : '';
                        }).filter(Boolean).join(', ');
                        return `
                            <tr>
                                <td>${new Date(record.date).toLocaleDateString()}</td>
                                <td>${record.activity || 'N/A'}</td>
                                <td>${record.presentStudents.length}</td>
                                <td>${appData.students.length}</td>
                                <td>
                                    <span class="badge ${rate >= 80 ? 'badge-success' : rate >= 50 ? 'badge-warning' : 'badge-danger'}">
                                        ${rate}%
                                    </span>
                                </td>
                                <td style="font-size: 0.8rem;">${teacherNames || 'None'}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ==================== REPORTS ====================
function generateReports() {
    const statsGrid = document.getElementById('statsGrid');
    const reportContent = document.getElementById('reportContent');

    const totalStudents = appData.students.length;
    const totalTeachers = appData.teachers.length;
    const totalAttendance = appData.attendance.length;
    const totalActivities = appData.dailyActivities.length;

    let consistencyScores = [];
    appData.students.forEach(student => {
        if (student.attendance && student.attendance.length > 0) {
            const present = student.attendance.filter(a => a.present).length;
            const total = student.attendance.length;
            consistencyScores.push(Math.round((present / total) * 100));
        }
    });

    const avgConsistency = consistencyScores.length > 0 
        ? Math.round(consistencyScores.reduce((a, b) => a + b, 0) / consistencyScores.length)
        : 0;

    // Calculate total teacher attendance
    let teacherAttendanceCount = {};
    appData.attendance.forEach(record => {
        (record.presentTeachers || []).forEach(teacherId => {
            teacherAttendanceCount[teacherId] = (teacherAttendanceCount[teacherId] || 0) + 1;
        });
    });

    statsGrid.innerHTML = `
        <div class="stat-card">
            <div class="stat-number">${totalStudents}</div>
            <div class="stat-label">Total Students</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${totalTeachers}</div>
            <div class="stat-label">Total Teachers</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${totalAttendance}</div>
            <div class="stat-label">Attendance Days</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${avgConsistency}%</div>
            <div class="stat-label">Avg Consistency</div>
        </div>
    `;

    let reportHTML = `
        <h4 style="margin: 16px 0 10px;">📋 Student Consistency Report</h4>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Days Attended</th>
                        <th>Total Days</th>
                        <th>Consistency</th>
                    </tr>
                </thead>
                <tbody>
    `;

    appData.students.forEach(student => {
        const total = student.attendance ? student.attendance.length : 0;
        const present = student.attendance ? student.attendance.filter(a => a.present).length : 0;
        const rate = total > 0 ? Math.round((present / total) * 100) : 0;
        
        reportHTML += `
            <tr>
                <td>${student.id}</td>
                <td>${student.name}</td>
                <td>${present}</td>
                <td>${total}</td>
                <td>
                    <span class="badge ${rate >= 80 ? 'badge-success' : rate >= 50 ? 'badge-warning' : 'badge-danger'}">
                        ${rate}%
                    </span>
                </td>
            </tr>
        `;
    });

    reportHTML += `
                </tbody>
            </table>
        </div>
    `;

    // Teacher Attendance Report
    if (appData.teachers.length > 0) {
        reportHTML += `
            <h4 style="margin: 16px 0 10px;">👨‍🏫 Teacher Attendance Summary</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Role</th>
                            <th>Days Present</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        appData.teachers.forEach(teacher => {
            const daysPresent = teacherAttendanceCount[teacher.id] || 0;
            reportHTML += `
                <tr>
                    <td>${teacher.name}</td>
                    <td>${teacher.role}</td>
                    <td>${daysPresent}</td>
                </tr>
            `;
        });

        reportHTML += `
                    </tbody>
                </table>
            </div>
        `;
    }

    if (appData.dailyActivities.length > 0) {
        reportHTML += `
            <h4 style="margin: 16px 0 10px;">📝 Recent Activities</h4>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Activity</th>
                            <th>Present</th>
                            <th>Rate</th>
                            <th>Teachers</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        appData.dailyActivities.slice(-5).reverse().forEach(activity => {
            const rate = activity.totalStudents > 0 
                ? Math.round((activity.presentCount / activity.totalStudents) * 100)
                : 0;
            const teacherNames = activity.teacherNames ? activity.teacherNames.join(', ') : 'None';
            reportHTML += `
                <tr>
                    <td>${new Date(activity.date).toLocaleDateString()}</td>
                    <td>${activity.activity}</td>
                    <td>${activity.presentCount}/${activity.totalStudents}</td>
                    <td>${rate}%</td>
                    <td style="font-size: 0.8rem;">${teacherNames}</td>
                </tr>
            `;
        });

        reportHTML += `
                    </tbody>
                </table>
            </div>
        `;
    }

    reportContent.innerHTML = reportHTML;
}

// ==================== PDF EXPORT ====================
function exportPDF() {
    const element = document.getElementById('reportContent');
    const statsGrid = document.getElementById('statsGrid');

    if (appData.students.length === 0) {
        showStatus('No data to export. Please add students and attendance records.', 'error');
        return;
    }

    showStatus('📄 Generating PDF...', 'info');

    const pdfContainer = document.createElement('div');
    pdfContainer.style.padding = '20px';
    pdfContainer.style.fontFamily = 'Arial, sans-serif';
    pdfContainer.style.color = '#333';
    pdfContainer.style.background = 'white';
    pdfContainer.innerHTML = `
        <h1 style="text-align: center; color: #4CAF50;">${appData.orgName}</h1>
        <h3 style="text-align: center; color: #666;">Daily Report & Analytics</h3>
        <p style="text-align: center; color: #999;">Generated: ${new Date().toLocaleString()}</p>
        <hr style="margin: 20px 0;">
        ${statsGrid.innerHTML}
        <hr style="margin: 20px 0;">
        ${element.innerHTML}
        <hr style="margin: 20px 0;">
        <p style="text-align: center; color: #999; font-size: 0.8rem;">
            Teachers: ${appData.teachers.map(t => t.name).join(', ')}<br>
            Admins: ${appData.admin1}, ${appData.admin2}
        </p>
    `;

    document.body.appendChild(pdfContainer);

    if (typeof html2pdf !== 'undefined') {
        html2pdf()
            .from(pdfContainer)
            .set({
                margin: [10, 10],
                filename: `${appData.orgName}_Report_${new Date().toISOString().split('T')[0]}.pdf`,
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            })
            .save()
            .then(() => {
                document.body.removeChild(pdfContainer);
                showStatus('✅ PDF exported successfully!', 'success');
            })
            .catch(err => {
                console.error('PDF export error:', err);
                document.body.removeChild(pdfContainer);
                showStatus('Error exporting PDF. Please try again.', 'error');
            });
    } else {
        // Fallback - try print
        try {
            const win = window.open('', '_blank');
            win.document.write(pdfContainer.innerHTML);
            win.document.write(`
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; }
                    th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                    th { background: #f5f7fa; }
                </style>
            `);
            win.document.close();
            win.print();
            document.body.removeChild(pdfContainer);
            showStatus('✅ PDF printed successfully!', 'success');
        } catch(e) {
            document.body.removeChild(pdfContainer);
            showStatus('PDF export failed. Please use print (Ctrl+P).', 'error');
        }
    }
}

// ==================== SYNC ====================
function syncData() {
    saveData();
    
    // Create backup
    const dataStr = JSON.stringify(appData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    if (confirm('Data saved locally. Download backup file?')) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${appData.orgName}_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showStatus('✅ Data backed up successfully!', 'success');
    } else {
        showStatus('🔄 Data synced locally!', 'success');
    }
}

function restoreFromBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                if (confirm('This will overwrite ALL current data. Are you sure?')) {
                    appData = data;
                    saveData();
                    updateUI();
                    showStatus('✅ Data restored from backup!', 'success');
                }
            } catch(err) {
                showStatus('❌ Invalid backup file.', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ==================== DARK MODE ====================
function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'dark' ? '' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    appData.settings.darkMode = newTheme === 'dark';
    saveData();
    applyTheme();
}

function applyTheme() {
    const isDark = appData.settings.darkMode;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : '');
    const toggleBtn = document.querySelector('.theme-toggle');
    if (toggleBtn) {
        toggleBtn.textContent = isDark ? '☀️' : '🌙';
    }
}

// ==================== MODAL ====================
function openModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
}

document.getElementById('modalOverlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
});

// ==================== STATUS MESSAGES ====================
function showStatus(message, type = 'success') {
    const status = document.getElementById('statusMessage');
    status.textContent = message;
    status.className = `status-message show status-${type}`;
    clearTimeout(status._timeout);
    status._timeout = setTimeout(() => {
        status.classList.remove('show');
    }, 5000);
}

// ==================== TAB SWITCHING ====================
function switchTab(tabName) {
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.tab[onclick="switchTab('${tabName}')"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'students') renderStudents();
    if (tabName === 'teachers') {
        renderTeachers();
        renderTeacherCheckboxes();
    }
    if (tabName === 'attendance') {
        renderAttendanceGrid();
        renderAttendanceHistory();
        renderTeacherCheckboxes();
    }
    if (tabName === 'reports') generateReports();
}

// ==================== UPDATE UI ====================
function updateUI() {
    renderStudents();
    renderTeachers();
    renderAttendanceGrid();
    renderAttendanceHistory();
    renderTeacherCheckboxes();
    generateReports();
    updateUndoButtons();
}

// ==================== KEYBOARD SHORTCUTS ====================
document.addEventListener('keydown', function(e) {
    // Escape to close modal
    if (e.key === 'Escape') closeModal();
    
    // Ctrl+Z for undo
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undoAction();
    }
    
    // Ctrl+Y or Ctrl+Shift+Z for redo
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        redoAction();
    }
    
    // Ctrl+S to sync
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        syncData();
    }
    
    // Enter key on date or activity fields triggers submit
    if (e.key === 'Enter') {
        const active = document.activeElement;
        if (active && (active.id === 'attendanceDate' || active.id === 'activityToday')) {
            submitAttendance();
        }
    }
});

// ==================== SERVICE WORKER (with error handling) ====================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        // Try to register service worker, but don't fail if it's not found
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(err) {
                // Service worker not found - that's okay, app still works offline via localStorage
                console.log('ServiceWorker registration skipped (not found):', err);
            });
    });
}

// ==================== START APP ====================
document.addEventListener('DOMContentLoaded', init);
window.addEventListener('storage', function(e) {
    if (e.key === 'slumChildApp') {
        loadData();
        updateUI();
    }
});
