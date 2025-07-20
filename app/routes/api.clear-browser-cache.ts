import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Return a simple JavaScript response that clears browser cache
  const cacheCleaningScript = `
// AI Search Browser Cache Cleaner
console.log('🧹 Clearing browser cache for AI Search...');

// Clear service worker caches
if ('caches' in window) {
  caches.keys().then(function(cacheNames) {
    const deletePromises = cacheNames.map(function(cacheName) {
      if (cacheName.includes('ai-search') || cacheName.includes('search-page')) {
        console.log('Clearing cache:', cacheName);
        return caches.delete(cacheName);
      }
    });
    
    Promise.all(deletePromises).then(function() {
      console.log('✅ Browser caches cleared!');
      alert('Browser caches cleared! The page will now reload to fetch fresh assets.');
      window.location.reload(true); // Force reload from server
    });
  });
} else {
  console.log('⚠️  Cache API not available, forcing page reload...');
  alert('Forcing page reload to clear cached assets.');
  window.location.reload(true);
}
  `;

  return new Response(cacheCleaningScript, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}; 