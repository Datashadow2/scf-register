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
                // Show a non-blocking message
                const status = document.getElementById('statusMessage');
                if (status) {
                    status.textContent = 'ℹ️ Running in offline mode. Service worker not available.';
                    status.className = 'status-message show status-info';
                    setTimeout(() => {
                        status.classList.remove('show');
                    }, 4000);
                }
            });
    });
}
