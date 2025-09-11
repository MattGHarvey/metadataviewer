const CACHE_NAME = 'exif-viewer-v4';
const APP_VERSION = '4.0.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './js/app.js',
  './js/FileSaver.min.js',
  './js/jszip.min.js',
  './images/icon-192.png',
  './images/icon-512.png',
  // Google Fonts
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Open+Sans:wght@300;400;500;600;700&family=Lato:wght@300;400;700&family=Montserrat:wght@300;400;500;600;700&family=Nunito:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Source+Sans+Pro:wght@300;400;600;700&display=swap'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log(`Service Worker: Installing version ${APP_VERSION}...`);
  event.waitUntil(
    // Clear all caches first during development
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Clearing old cache during install', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return caches.open(CACHE_NAME);
    }).then((cache) => {
      console.log('Service Worker: Caching files');
      return cache.addAll(urlsToCache);
    }).then(() => {
      console.log(`Service Worker: Installation complete for version ${APP_VERSION}`);
      return self.skipWaiting();
    }).catch((error) => {
      console.error('Service Worker: Installation failed', error);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`Service Worker: Activating version ${APP_VERSION}...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`Service Worker: Activation complete for version ${APP_VERSION}`);
      
      // Force all clients to reload to get the new version
      return self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          console.log('Notifying client of update...');
          client.postMessage({ 
            type: 'SW_UPDATED', 
            version: APP_VERSION 
          });
        });
        return self.clients.claim();
      });
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests that aren't Google Fonts
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('fonts.googleapis.com') &&
      !event.request.url.includes('fonts.gstatic.com')) {
    return;
  }

  // Use network-first strategy for local development files
  const isLocalDevFile = event.request.url.includes('/js/') || 
                         event.request.url.endsWith('index.html') ||
                         event.request.url.endsWith('/') ||
                         event.request.url.includes('sw.js');

  if (isLocalDevFile) {
    // Network first for development files - always try to get latest with cache busting
    const cacheBustUrl = new URL(event.request.url);
    cacheBustUrl.searchParams.set('v', APP_VERSION);
    cacheBustUrl.searchParams.set('t', Date.now());
    
    event.respondWith(
      fetch(cacheBustUrl.toString()).then((response) => {
        if (response && response.status === 200) {
          // Clone and cache the fresh response (without cache-bust params)
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          console.log('Service Worker: Serving fresh from network (cache-busted)', event.request.url);
          return response;
        }
        throw new Error('Network response not ok');
      }).catch(() => {
        // Try without cache busting
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            console.log('Service Worker: Serving from network (fallback)', event.request.url);
            return response;
          }
          throw new Error('Network response not ok');
        });
      }).catch(() => {
        // Final fallback to cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            console.log('Service Worker: Network failed, serving from cache', event.request.url);
            return cachedResponse;
          }
          throw new Error('No cached version available');
        });
      })
    );
  } else {
    // Cache first for static assets like fonts, images
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // Return cached version if available
          if (response) {
            console.log('Service Worker: Serving from cache', event.request.url);
            return response;
          }

          // Fetch from network
          console.log('Service Worker: Fetching from network', event.request.url);
          return fetch(event.request).then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response as it can only be consumed once
            const responseToCache = response.clone();

            // Cache the fetched resource for future use
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }).catch((error) => {
            console.error('Service Worker: Fetch failed', error);
            
            // Return offline fallback for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            throw error;
          });
        })
    );
  }
});

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    // Clear all caches for development
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Clearing cache', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Service Worker: All caches cleared');
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      });
    });
  }
});

// Background sync for future enhancements
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync', event.tag);
  // Future: Handle background data synchronization
});

// Notification click handler (for future use)
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  event.notification.close();
  
  // Focus or open the app window
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
