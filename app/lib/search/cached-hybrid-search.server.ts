import { hybridSearch, type HybridSearchRequest, type HybridSearchResult } from './hybrid-search.server';
import { SearchCache } from '../cache/search-cache.server';

// Initialize search cache
const searchCache = new SearchCache();

export interface CachedSearchOptions {
  useCache?: boolean;
  cacheTTL?: number;
}

/**
 * Cached hybrid search wrapper
 */
export async function cachedHybridSearch(
  request: HybridSearchRequest,
  options: CachedSearchOptions = { useCache: true }
): Promise<HybridSearchResult> {
  const { useCache = true } = options;
  
  // Skip cache for debug requests or if disabled
  if (!useCache || request.offset !== 0) {
    return hybridSearch(request);
  }
  
  try {
    // Try to get from cache
    const cacheKey = {
      limit: request.limit,
      sortBy: request.sortBy,
      ...request.filters
    };
    
    const cached = await searchCache.get(
      request.query,
      request.shopDomain,
      cacheKey
    );
    
    if (cached) {
      console.log(`🎯 Cache hit for query: "${request.query}"`);
      // Transform cached result to HybridSearchResult format
      return {
        products: cached.products as any[], // Cast to any[] to avoid type issues
        method: 'hybrid',
        total: cached.total_count,
        hasMore: cached.total_count > request.limit,
      };
    }
    
    console.log(`❌ Cache miss for query: "${request.query}"`);
    
    // Perform actual search
    const result = await hybridSearch(request);
    
    // Cache the result (only cache successful searches)
    if (result.products.length > 0) {
      await searchCache.set(
        request.query,
        request.shopDomain,
        {
          products: result.products,
          total_count: result.total || result.products.length,
          search_id: `search-${Date.now()}`,
          query_info: {
            original_query: request.query,
            processing_time_ms: 0,
          }
        },
        cacheKey
      );
      
      console.log(`💾 Cached results for query: "${request.query}"`);
    }
    
    return result;
    
  } catch (error) {
    console.error('Cache operation failed, proceeding without cache:', error);
    // If cache fails, just proceed with normal search
    return hybridSearch(request);
  }
}

/**
 * Clear search cache for a shop
 */
export async function clearSearchCache(shopDomain: string): Promise<void> {
  try {
    await searchCache.clearCacheForShop(shopDomain);
    console.log(`🧹 Cleared search cache for shop: ${shopDomain}`);
  } catch (error) {
    console.error('Failed to clear search cache:', error);
  }
}

/**
 * Get popular search queries for a shop
 */
export async function getPopularSearches(
  shopDomain: string, 
  limit: number = 10
): Promise<Array<{ query: string; count: number }>> {
  try {
    const popular = await searchCache.getPopularQueries(shopDomain, limit);
    return popular.map(item => ({
      query: item.value,
      count: item.score
    }));
  } catch (error) {
    console.error('Failed to get popular searches:', error);
    return [];
  }
} 