// ==================== SERVICE WORKER ====================
// This service worker enables offline functionality and PWA features

const CACHE_NAME = 'slum-child-register-v3';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json'
];

// Assets that should be cached but won't break the app if they fail
const EXTERNAL_ASSETS = [
    'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Caching static assets...');
                // Cache main assets
                return cache.addAll(STATIC_ASSETS)
                    .then(() => {
                        // Try to cache external assets but don't fail if they don't work
                        return Promise.allSettled(
                            EXTERNAL_ASSETS.map(url => 
                                cache.add(url).catch(err => {
                                    console.log('⚠️ Failed to cache external asset:', url, err);
                                    // Don't fail the whole installation
                                    return Promise.resolve();
                                })
                            )
                        );
                    })
                    .then(() => {
                        console.log('✅ All assets cached successfully!');
                    });
            })
            .then(() => self.skipWaiting())
            .catch(err => {
                console.error('❌ Service Worker installation failed:', err);
            })
    );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => {
                            console.log('🗑️ Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('✅ Service Worker activated, cache cleaned');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
    // Skip cross-origin requests (for security)
    if (!event.request.url.startsWith(self.location.origin) && 
        !event.request.url.includes('cdnjs.cloudflare.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached response if found
                if (response) {
                    return response;
                }
                
                // Clone the request
                const fetchRequest = event.request.clone();
                
                // Try network
                return fetch(fetchRequest)
                    .then(response => {
                        // Check if valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        // Cache the fetched response
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                try {
                                    cache.put(event.request, responseToCache);
                                } catch (e) {
                                    // Some things can't be cached (like streaming responses)
                                    console.log('⚠️ Could not cache:', event.request.url);
                                }
                            });
                        
                        return response;
                    })
                    .catch(() => {
                        // Offline fallback for HTML requests
                        if (event.request.headers.get('accept').includes('text/html')) {
                            return caches.match('/index.html')
                                .then(cached => {
                                    if (cached) {
                                        return cached;
                                    }
                                    // If even index.html is not cached, return a basic offline page
                                    return new Response(
                                        '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Offline</title><style>body{font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f0f4f8;color:#1a202c;text-align:center;padding:20px;}.container{max-width:400px;background:white;padding:40px;border-radius:12px;box-shadow:0 2px 10px rgba(0,0,0,0.1);}h1{color:#4CAF50;font-size:2rem;}p{color:#718096;line-height:1.6;}button{padding:12px 24px;background:#4CAF50;color:white;border:none;border-radius:8px;font-size:1rem;cursor:pointer;}</style></head><body><div class="container"><h1>📚 Offline</h1><p>You are currently offline. Please check your internet connection.</p><button onclick="location.reload()">Retry</button></div></body></html>',
                                        { 
                                            headers: { 'Content-Type': 'text/html' },
                                            status: 503
                                        }
                                    );
                                });
                        }
                        
                        // For non-HTML requests, return a simple error response
                        return new Response(
                            JSON.stringify({ 
                                error: 'Offline', 
                                message: 'You are currently offline. Please check your connection.' 
                            }),
                            { 
                                headers: { 'Content-Type': 'application/json' },
                                status: 503
                            }
                        );
                    });
            })
    );
});

// Background sync for when online
self.addEventListener('sync', event => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

// Function to sync data when online
function syncData() {
    console.log('🔄 Background sync triggered');
    // This is where you would implement cloud sync if needed
    // For now, just log and resolve
    return new Promise((resolve) => {
        // Check if there's any pending sync data
        caches.open('pending-sync')
            .then(cache => {
                return cache.keys();
            })
            .then(keys => {
                if (keys.length > 0) {
                    console.log(`📤 Found ${keys.length} items to sync`);
                    // Process each item
                    return Promise.all(
                        keys.map(key => {
                            return cache.match(key)
                                .then(response => response.json())
                                .then(data => {
                                    console.log('📤 Syncing data:', data);
                                    // Here you would send to your server
                                    // Then delete from cache
                                    return cache.delete(key);
                                });
                        })
                    );
                }
                return [];
            })
            .then(() => {
                console.log('✅ Sync complete');
                resolve();
            })
            .catch(err => {
                console.error('❌ Sync error:', err);
                resolve();
            });
    });
}

// Push notification support
self.addEventListener('push', event => {
    let data = {
        title: '📚 Child Register',
        body: 'Time to mark today\'s attendance!',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        vibrate: [200, 100, 200]
    };

    try {
        if (event.data) {
            const pushData = event.data.json();
            data = { ...data, ...pushData };
        }
    } catch (e) {
        console.log('Push data parse error:', e);
    }

    const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        vibrate: data.vibrate,
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'open',
                title: '📖 Open Register'
            },
            {
                action: 'dismiss',
                title: '⏰ Remind Later'
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();

    if (event.action === 'open') {
        // Open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'dismiss') {
        // Just close notification
        event.waitUntil(
            clients.matchAll().then(clients => {
                if (clients.length > 0) {
                    // Focus existing client
                    clients[0].focus();
                }
            })
        );
    } else {
        // Default: open the app
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Handle offline/online status changes
self.addEventListener('online', () => {
    console.log('🟢 App is online!');
    // Try to sync any pending data
    self.registration.sync.register('sync-data')
        .catch(err => console.log('Sync registration error:', err));
});

self.addEventListener('offline', () => {
    console.log('🔴 App is offline!');
});

// Log cache status
console.log('📦 Service Worker loaded successfully!');
