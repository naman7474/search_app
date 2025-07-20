import type { LoaderFunctionArgs } from "@remix-run/node";

export async function loader({ request }: LoaderFunctionArgs) {
  // Service Worker for AI Search App
  const serviceWorkerCode = `
// AI Search Service Worker - Updated cache version to clear old assets
const CACHE_NAME = 'ai-search-v2-formatted';
const SEARCH_CACHE = 'ai-search-data-v2';

// Assets to cache for offline functionality
const STATIC_ASSETS = [
  '/apps/xpertsearch/',
  '/apps/xpertsearch/assets/main.css',
  '/apps/xpertsearch/assets/main.js'
];

// Search API endpoints to cache
const SEARCH_ENDPOINTS = [
  '/apps/xpertsearch/api/search',
  '/apps/xpertsearch/api/conversation'
];

// Install event - cache essential assets
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).catch(err => {
      console.log('[SW] Cache installation failed:', err);
    })
  );
  
  // Take control immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME && cacheName !== SEARCH_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients
  self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Only handle requests to our app
  if (!url.pathname.startsWith('/apps/xpertsearch/')) {
    return;
  }
  
  // Handle search API requests
  if (SEARCH_ENDPOINTS.some(endpoint => url.pathname.includes(endpoint))) {
    event.respondWith(handleSearchRequest(request));
    return;
  }
  
  // Handle static assets
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        console.log('[SW] Serving from cache:', request.url);
        return response;
      }
      
      // Try network, fallback to cache
      return fetch(request).then(networkResponse => {
        // Cache successful responses
        if (networkResponse.ok) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      }).catch(() => {
        console.log('[SW] Network failed, no cache available for:', request.url);
        // Return a basic offline response for HTML requests
        if (request.headers.get('accept')?.includes('text/html')) {
          return new Response(
            '<h1>Offline</h1><p>Search functionality is currently unavailable. Please check your connection.</p>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        }
        throw new Error('Network error and no cache available');
      });
    })
  );
});

// Handle search requests with caching
async function handleSearchRequest(request) {
  const url = new URL(request.url);
  const cacheKey = \`\${url.pathname}\${url.search}\`;
  
  try {
    // Try network first for fresh results
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful search responses
      const responseClone = networkResponse.clone();
      const cache = await caches.open(SEARCH_CACHE);
      
      // Only cache GET requests
      if (request.method === 'GET') {
        await cache.put(cacheKey, responseClone);
      }
      
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('[SW] Search request failed, trying cache:', error);
    
    // Fallback to cached response
    const cache = await caches.open(SEARCH_CACHE);
    const cachedResponse = await cache.match(cacheKey);
    
    if (cachedResponse) {
      console.log('[SW] Serving cached search result');
      
      // Add a header to indicate this is a cached response
      const response = cachedResponse.clone();
      response.headers.set('X-Served-From', 'cache');
      return response;
    }
    
    // No cache available - return error response
    return new Response(
      JSON.stringify({
        error: 'Search unavailable offline',
        message: 'Please check your internet connection and try again.',
        cached: false
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-From': 'offline'
        }
      }
    );
  }
}

// Handle background sync for search analytics
self.addEventListener('sync', event => {
  if (event.tag === 'search-analytics') {
    event.waitUntil(syncSearchAnalytics());
  }
});

// Sync offline search analytics when back online
async function syncSearchAnalytics() {
  try {
    // Get stored analytics data
    const cache = await caches.open(SEARCH_CACHE);
    const analyticsData = await cache.match('offline-analytics');
    
    if (analyticsData) {
      const data = await analyticsData.json();
      
      // Send to analytics endpoint
      await fetch('/apps/xpertsearch/api/analytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      // Clear stored analytics
      await cache.delete('offline-analytics');
      console.log('[SW] Analytics synced successfully');
    }
  } catch (error) {
    console.log('[SW] Analytics sync failed:', error);
  }
}

// Handle messages from the main thread
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'STORE_OFFLINE_ANALYTICS') {
    storeOfflineAnalytics(event.data.payload);
  }
});

// Store analytics data for later sync
async function storeOfflineAnalytics(data) {
  try {
    const cache = await caches.open(SEARCH_CACHE);
    const existingData = await cache.match('offline-analytics');
    
    let analyticsArray = [];
    if (existingData) {
      analyticsArray = await existingData.json();
    }
    
    analyticsArray.push({
      ...data,
      timestamp: Date.now(),
      offline: true
    });
    
    await cache.put('offline-analytics', new Response(JSON.stringify(analyticsArray)));
    console.log('[SW] Offline analytics stored');
  } catch (error) {
    console.log('[SW] Failed to store offline analytics:', error);
  }
}

console.log('[SW] Service Worker loaded');
`;

  return new Response(serviceWorkerCode, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=0", // Don't cache service worker
    },
  });
} 