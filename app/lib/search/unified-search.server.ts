import type { ProductCandidate } from './search.server';
import { supabase } from '../supabase.server';
import { generateQueryEmbedding } from '../ai/embedding.server';
import { parseQuery } from '../ai/query-understanding.server';
import { cachedHybridSearch } from './cached-hybrid-search.server';
import { hybridSearch } from './hybrid-search.server';
import { SearchCache } from '../cache/search-cache.server';
import { AnalyticsLogger } from '../analytics/analytics-logger.server';
import { calculatePriceRange, isOnSale } from '../utils/price.utils';

export type SearchStrategy = 'vector' | 'keyword' | 'hybrid' | 'ai';

export interface UnifiedSearchRequest {
  query: string;
  shop_domain: string;
  limit?: number;
  offset?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'title' | 'newest';
  filters?: Record<string, any>;
  strategy?: SearchStrategy;
  session_id?: string;
  user_agent?: string;
  use_cache?: boolean;
  debug?: boolean;
}

export interface UnifiedSearchResult {
  products: ProductCandidate[];
  total_count: number;
  has_more: boolean;
  query_info: {
    original_query: string;
    processed_query?: string;
    filters_applied?: Record<string, any>;
    search_method: SearchStrategy;
    processing_time_ms: number;
  };
  ranking_info?: {
    model_used: string;
    reasoning: string;
  };
  search_id: string;
  debug_info?: any;
}

export interface SearchConfig {
  default_strategy: SearchStrategy;
  vector_threshold: number;
  cache_ttl: number;
  enable_analytics: boolean;
  fallback_strategy: SearchStrategy;
}

// Default configuration
const DEFAULT_CONFIG: SearchConfig = {
  default_strategy: 'ai',
  vector_threshold: 0.5,
  cache_ttl: 3600,
  enable_analytics: true,
  fallback_strategy: 'hybrid',
};

// Per-shop configuration can be stored in database or environment
function getSearchConfig(shopDomain: string): SearchConfig {
  // For now, use environment variables with fallbacks
  const envStrategy = process.env.SEARCH_STRATEGY as SearchStrategy;
  
  return {
    default_strategy: envStrategy || DEFAULT_CONFIG.default_strategy,
    vector_threshold: parseFloat(process.env.VECTOR_THRESHOLD || '0.5'),
    cache_ttl: parseInt(process.env.SEARCH_CACHE_TTL || '3600'),
    enable_analytics: process.env.ENABLE_SEARCH_ANALYTICS !== 'false',
    fallback_strategy: (process.env.FALLBACK_STRATEGY as SearchStrategy) || DEFAULT_CONFIG.fallback_strategy,
  };
}

/**
 * Unified search service that supports multiple strategies
 */
export class UnifiedSearchService {
  private searchCache: SearchCache;
  
  constructor() {
    this.searchCache = new SearchCache();
  }
  
  /**
   * Main search method that routes to appropriate strategy
   */
  async search(request: UnifiedSearchRequest): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const config = getSearchConfig(request.shop_domain);
    const strategy = request.strategy || config.default_strategy;
    const useCache = request.use_cache !== false;
    
    console.log(`🔍 Starting ${strategy} search for: "${request.query}"`);
    
    try {
      let result: UnifiedSearchResult;
      
      switch (strategy) {
        case 'vector':
          result = await this.performVectorSearch(request, config);
          break;
          
        case 'keyword':
          result = await this.performKeywordSearch(request, config);
          break;
          
        case 'hybrid':
          result = await this.performHybridSearch(request, config, useCache);
          break;
          
        case 'ai':
          result = await this.performAISearch(request, config);
          break;
          
        default:
          throw new Error(`Unknown search strategy: ${strategy}`);
      }
      
      // Log analytics if enabled
      if (config.enable_analytics) {
        await this.logSearchAnalytics(request, result);
      }
      
      return result;
      
    } catch (error) {
      console.error(`❌ ${strategy} search failed:`, error);
      
      // Fallback to different strategy
      if (strategy !== config.fallback_strategy) {
        console.log(`🔄 Falling back to ${config.fallback_strategy} search`);
        return this.search({
          ...request,
          strategy: config.fallback_strategy,
          use_cache: false, // Skip cache for fallback
        });
      }
      
      // If fallback also fails, return empty result
      return {
        products: [],
        total_count: 0,
        has_more: false,
        query_info: {
          original_query: request.query,
          search_method: strategy,
          processing_time_ms: Date.now() - startTime,
        },
        search_id: `error-${Date.now()}`,
        debug_info: request.debug ? { error: error instanceof Error ? error.message : 'Unknown error' } : undefined,
      };
    }
  }
  
  /**
   * Pure vector similarity search
   */
  private async performVectorSearch(
    request: UnifiedSearchRequest,
    config: SearchConfig
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const limit = request.limit || 20;
    const offset = request.offset || 0;
    
    // Generate embedding for the query
    const embeddingResult = await generateQueryEmbedding(request.query);
    
    // Build base query
    let query = supabase
      .from('products')
      .select(`
        id, shopify_product_id, title, description, vendor, product_type,
        price_min, price_max, available, tags, image_url, handle,
        product_variants (id, price, compare_at_price, available, inventory_quantity)
      `)
      .eq('shop_domain', request.shop_domain);
    
    // Apply filters
    query = this.applyFilters(query, request.filters);
    
    const { data: products, error } = await query;
    if (error || !products) throw error;
    
    // Get vector similarity results
    const shopifyProductIds = products.map(p => p.shopify_product_id).filter(Boolean);
    
    const { data: vectorResults, error: vectorError } = await supabase
      .rpc('search_products_by_embedding', {
        query_embedding: embeddingResult.embedding,
        match_threshold: config.vector_threshold,
        match_count: limit * 2,
        shop_domain_filter: request.shop_domain,
        product_ids: shopifyProductIds
      });
    
    if (vectorError) throw vectorError;
    
    const enrichedResults = this.enrichWithVariantData(vectorResults || [], products);
    const total = enrichedResults.length;
    const paginatedResults = enrichedResults.slice(offset, offset + limit);
    
    return {
      products: paginatedResults,
      total_count: total,
      has_more: (offset + limit) < total,
      query_info: {
        original_query: request.query,
        filters_applied: request.filters,
        search_method: 'vector',
        processing_time_ms: Date.now() - startTime,
      },
      ranking_info: {
        model_used: embeddingResult.model,
        reasoning: 'Vector similarity search using semantic embeddings',
      },
      search_id: `vector-${Date.now()}`,
    };
  }
  
  /**
   * Pure keyword search
   */
  private async performKeywordSearch(
    request: UnifiedSearchRequest,
    config: SearchConfig
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const limit = request.limit || 20;
    const offset = request.offset || 0;
    
    let query = supabase
      .from('products')
      .select(`
        *, product_variants (id, price, compare_at_price, available, inventory_quantity, sku, title)
      `)
      .eq('shop_domain', request.shop_domain);
    
    // Build keyword search conditions
    const searchTerms = request.query.toLowerCase().split(/\s+/).filter(Boolean);
    const orConditions: string[] = [];
    
    searchTerms.forEach(term => {
      const conditions = [
        `title.ilike.%${term}%`,
        `description.ilike.%${term}%`,
        `vendor.ilike.%${term}%`,
        `product_type.ilike.%${term}%`,
        `handle.ilike.%${term}%`,
        `tags.cs.{${term}}`,
      ];
      orConditions.push(conditions.join(','));
    });
    
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }
    
    // Apply filters
    query = this.applyFilters(query, request.filters);
    query = query.limit((limit + offset) * 2);
    
    const { data, error } = await query;
    if (error) throw error;
    
    // Calculate relevance scores
    const scoredResults = this.calculateKeywordScores(data || [], request.query, searchTerms);
    
    // Apply sorting
    const sortedResults = this.applySorting(scoredResults, request.sortBy || 'relevance');
    
    const total = sortedResults.length;
    const paginatedResults = sortedResults.slice(offset, offset + limit);
    
    return {
      products: paginatedResults,
      total_count: total,
      has_more: (offset + limit) < total,
      query_info: {
        original_query: request.query,
        filters_applied: request.filters,
        search_method: 'keyword',
        processing_time_ms: Date.now() - startTime,
      },
      ranking_info: {
        model_used: 'keyword_scoring',
        reasoning: 'Keyword-based relevance scoring with title, description, and variant matching',
      },
      search_id: `keyword-${Date.now()}`,
    };
  }
  
  /**
   * Hybrid search combining vector and keyword
   */
  private async performHybridSearch(
    request: UnifiedSearchRequest,
    config: SearchConfig,
    useCache: boolean
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    
    const hybridRequest = {
      query: request.query,
      shopDomain: request.shop_domain,
      limit: request.limit || 20,
      offset: request.offset || 0,
      sortBy: request.sortBy,
      filters: request.filters,
    };
    
    const result = useCache 
      ? await cachedHybridSearch(hybridRequest)
      : await hybridSearch(hybridRequest);
    
    return {
      products: result.products,
      total_count: result.total || result.products.length,
      has_more: result.hasMore || false,
      query_info: {
        original_query: request.query,
        filters_applied: request.filters,
        search_method: 'hybrid',
        processing_time_ms: Date.now() - startTime,
      },
      ranking_info: {
        model_used: 'reciprocal_rank_fusion',
        reasoning: 'Hybrid search combining vector similarity and keyword relevance using RRF',
      },
      search_id: `hybrid-${Date.now()}`,
    };
  }
  
  /**
   * AI-powered search with query understanding
   */
  private async performAISearch(
    request: UnifiedSearchRequest,
    config: SearchConfig
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    
    // Parse query with AI
    const parsedQuery = await parseQuery(request.query);
    
    // Combine parsed filters with request filters
    const combinedFilters = {
      ...parsedQuery.filters,
      ...request.filters,
    };
    
    // Use hybrid search with AI-enhanced query and filters
    const enhancedRequest = {
      ...request,
      query: parsedQuery.query_text,
      filters: combinedFilters,
    };
    
    const result = await this.performHybridSearch(enhancedRequest, config, true);
    
    return {
      ...result,
      query_info: {
        ...result.query_info,
        processed_query: parsedQuery.query_text,
        search_method: 'ai',
      },
      ranking_info: {
        model_used: 'ai_query_understanding + hybrid',
        reasoning: 'AI-powered query understanding with hybrid search execution',
      },
      search_id: `ai-${Date.now()}`,
      debug_info: request.debug ? { parsed_query: parsedQuery } : undefined,
    };
  }
  
  /**
   * Apply filters to Supabase query
   */
  private applyFilters(query: any, filters?: Record<string, any>) {
    if (!filters) return query;
    
    if (filters.price_min) {
      query = query.gte('price_max', filters.price_min);
    }
    if (filters.price_max) {
      query = query.lte('price_min', filters.price_max);
    }
    if (filters.vendor) {
      query = query.ilike('vendor', `%${filters.vendor}%`);
    }
    if (filters.product_type) {
      query = query.ilike('product_type', `%${filters.product_type}%`);
    }
    if (filters.available !== undefined) {
      query = query.eq('available', filters.available);
    }
    if (filters.tags && Array.isArray(filters.tags)) {
      query = query.overlaps('tags', filters.tags);
    }
    
    return query;
  }
  
  /**
   * Calculate keyword relevance scores
   */
  private calculateKeywordScores(
    products: any[],
    originalQuery: string,
    searchTerms: string[]
  ): ProductCandidate[] {
    return products.map(product => {
      let score = 0.3; // Base score
      
      const titleLower = product.title?.toLowerCase() || '';
      const descriptionLower = product.description?.toLowerCase() || '';
      const vendorLower = product.vendor?.toLowerCase() || '';
      const productTypeLower = product.product_type?.toLowerCase() || '';
      const handleLower = product.handle?.toLowerCase() || '';
      const tagsLower = (product.tags || []).map((tag: any) => String(tag).toLowerCase());
      
      // Check variant SKUs and titles
      const variantMatches = product.product_variants?.some((variant: any) => {
        const skuLower = variant.sku?.toLowerCase() || '';
        const variantTitleLower = variant.title?.toLowerCase() || '';
        return searchTerms.some(term => 
          skuLower.includes(term) || variantTitleLower.includes(term)
        );
      });
      
      // Score individual terms
      searchTerms.forEach(term => {
        if (titleLower.includes(term)) score += 0.25;
        if (vendorLower.includes(term)) score += 0.15;
        if (productTypeLower.includes(term)) score += 0.1;
        if (descriptionLower.includes(term)) score += 0.05;
        if (handleLower.includes(term)) score += 0.1;
        if (tagsLower.some(tag => tag.includes(term))) score += 0.15;
        if (variantMatches) score += 0.2;
      });
      
      // Exact match bonuses
      if (titleLower === originalQuery.toLowerCase()) score += 0.3;
      const hasExactSkuMatch = product.product_variants?.some((variant: any) => 
        variant.sku?.toLowerCase() === originalQuery.toLowerCase()
      );
      if (hasExactSkuMatch) score += 0.5;
      
      const variants = product.product_variants || [];
      
              return {
          ...product,
          similarity_score: Math.min(score, 1),
          on_sale: isOnSale(variants),
          price_range: calculatePriceRange(variants),
        };
    });
  }
  
  /**
   * Apply sorting to results
   */
  private applySorting(
    products: ProductCandidate[],
    sortBy: string
  ): ProductCandidate[] {
    const sorted = [...products];
    
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => (a.price_min || 0) - (b.price_min || 0));
      case 'price_desc':
        return sorted.sort((a, b) => (b.price_max || 0) - (a.price_max || 0));
      case 'title':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'newest':
        return sorted; // Would need created_at field
      default: // relevance
        return sorted.sort((a, b) => b.similarity_score - a.similarity_score);
    }
  }
  
  /**
   * Enrich vector results with variant data
   */
  private enrichWithVariantData(vectorResults: any[], products: any[]): ProductCandidate[] {
    return vectorResults.map((result: any) => {
      const fullProduct = products.find(p => p.shopify_product_id === result.shopify_product_id);
      const variants = fullProduct?.product_variants || [];
      
              return {
          ...result,
          product_variants: variants,
          on_sale: isOnSale(variants),
          price_range: calculatePriceRange(variants),
        };
    });
  }
  
  /**
   * Log search analytics
   */
  private async logSearchAnalytics(
    request: UnifiedSearchRequest,
    result: UnifiedSearchResult
  ): Promise<void> {
    try {
      await AnalyticsLogger.logSearch({
        shop_domain: request.shop_domain,
        query: request.query,
        results_count: result.total_count,
        filters: request.filters,
        search_method: result.query_info.search_method,
        response_time_ms: result.query_info.processing_time_ms,
        session_id: request.session_id,
        user_agent: request.user_agent,
      });
    } catch (error) {
      console.error('Failed to log search analytics:', error);
      // Don't throw - analytics failure shouldn't break search
    }
  }
}

// Export singleton instance
export const unifiedSearchService = new UnifiedSearchService();

/**
 * Convenience function for backward compatibility
 */
export async function searchProducts(request: {
  query: string;
  shop_domain: string;
  limit?: number;
  offset?: number;
  session_id?: string;
  user_agent?: string;
}): Promise<any> {
  const result = await unifiedSearchService.search({
    ...request,
    strategy: 'ai', // Maintain backward compatibility with AI search
  });
  
  // Transform to legacy format
  return {
    products: result.products,
    total_count: result.total_count,
    query_info: {
      original_query: result.query_info.original_query,
      parsed_query: {
        query_text: result.query_info.processed_query || result.query_info.original_query,
        filters: result.query_info.filters_applied || {},
        intent: 'product_search',
        confidence: 0.8,
      },
      processing_time_ms: result.query_info.processing_time_ms,
    },
    ranking_info: result.ranking_info,
    search_id: result.search_id,
  };
} 