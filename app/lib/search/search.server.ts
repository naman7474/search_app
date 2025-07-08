import { supabase } from '../supabase.server';
import { parseQuery, type ParsedQuery } from '../ai/query-understanding.server';
import { generateQueryEmbedding } from '../ai/embedding.server';
import { rankProducts, type ProductCandidate, type RankingResult } from '../ai/ranking.server';

export type { ProductCandidate };

export interface SearchRequest {
  query: string;
  shop_domain: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  session_id?: string;
  user_agent?: string;
}

export interface SearchResult {
  products: ProductCandidate[];
  total_count: number;
  query_info: {
    original_query: string;
    parsed_query: ParsedQuery;
    processing_time_ms: number;
  };
  ranking_info?: {
    model_used: string;
    reasoning?: string;
  };
  search_id: string;
}

/**
 * Main AI-powered search function
 */
export async function searchProducts(request: SearchRequest): Promise<SearchResult> {
  const startTime = Date.now();
  const limit = request.limit || 20;
  const offset = request.offset || 0;
  
  console.log("SEARCH_INITIATED", { query: request.query, shop: request.shop_domain });

  try {
    // Step 1: Parse and understand the query
    console.log('SEARCH_STEP_1_START: Parsing query:', request.query);
    const parsedQuery = await parseQuery(request.query);
    console.log('SEARCH_STEP_1_SUCCESS: Parsed query:', parsedQuery);
    
    // Step 2: Generate embedding for semantic search
    console.log('SEARCH_STEP_2_START: Generating query embedding');
    const queryEmbedding = await generateQueryEmbedding(parsedQuery.query_text);
    console.log('SEARCH_STEP_2_SUCCESS: Embedding generated using:', queryEmbedding.model);
    
    // Step 3: Perform vector similarity search
    console.log('SEARCH_STEP_3_START: Performing vector search');
    const candidates = await performVectorSearch(
      request.shop_domain,
      queryEmbedding.embedding,
      parsedQuery.filters,
      limit * 3 // Get more candidates for ranking
    );
    console.log(`SEARCH_STEP_3_SUCCESS: Found ${candidates.length} candidates`);
    
    // Step 4: Rank results using LLM
    console.log('SEARCH_STEP_4_START: Ranking results');
    const rankingResult = await rankProducts(
      parsedQuery.query_text,
      parsedQuery.intent,
      parsedQuery.filters,
      candidates
    );
    console.log('SEARCH_STEP_4_SUCCESS: Ranking completed using:', rankingResult.model_used);
    
    // Step 5: Apply pagination
    const paginatedResults = rankingResult.ranked_products.slice(offset, offset + limit);
    
    // Step 6: Log search query for analytics
    const searchId = await logSearchQuery(request, parsedQuery, candidates.length);
    
    const processingTime = Date.now() - startTime;
    console.log(`SEARCH_COMPLETE: Success, processed in ${processingTime}ms`);
    
    return {
      products: paginatedResults,
      total_count: candidates.length,
      query_info: {
        original_query: request.query,
        parsed_query: parsedQuery,
        processing_time_ms: processingTime,
      },
      ranking_info: {
        model_used: rankingResult.model_used,
        reasoning: rankingResult.reasoning,
      },
      search_id: searchId,
    };
    
  } catch (error) {
    console.error('SEARCH_PIPELINE_ERROR:', error);
    
    // Fallback to basic keyword search
    console.log('SEARCH_FALLBACK: Falling back to keyword search');
    const fallbackResults = await performKeywordSearch(
      request.shop_domain,
      request.query,
      limit,
      offset
    );
    
    const searchId = await logSearchQuery(request, {
      query_text: request.query,
      filters: {},
      intent: 'product_search',
      confidence: 0.3,
    }, fallbackResults.length);
    
    return {
      products: fallbackResults,
      total_count: fallbackResults.length,
      query_info: {
        original_query: request.query,
        parsed_query: {
          query_text: request.query,
          filters: {},
          intent: 'product_search',
          confidence: 0.3,
        },
        processing_time_ms: Date.now() - startTime,
      },
      ranking_info: {
        model_used: 'fallback',
      },
      search_id: searchId,
    };
  }
}

/**
 * Perform vector similarity search in Supabase
 */
async function performVectorSearch(
  shopDomain: string,
  queryEmbedding: number[],
  filters: Record<string, any>,
  limit: number
): Promise<ProductCandidate[]> {
  let query = supabase
    .from('products')
    .select(`
      id,
      shopify_product_id,
      title,
      description,
      price_min,
      price_max,
      vendor,
      product_type,
      tags,
      available,
      image_url,
      embedding
    `)
    .eq('shop_domain', shopDomain)
    .eq('available', true); // Only search available products by default
  
  // Apply filters
  if (filters.price_min) {
    query = query.gte('price_min', filters.price_min);
  }
  
  if (filters.price_max) {
    query = query.lte('price_max', filters.price_max);
  }
  
  if (filters.product_type) {
    query = query.ilike('product_type', `%${filters.product_type}%`);
  }
  
  if (filters.vendor) {
    query = query.ilike('vendor', `%${filters.vendor}%`);
  }
  
  if (filters.tags && filters.tags.length > 0) {
    query = query.overlaps('tags', filters.tags);
  }
  
  // Perform vector similarity search
  const { data, error } = await query
    .order('embedding <-> ' + JSON.stringify(queryEmbedding), { ascending: true })
    .limit(limit);
  
  if (error) {
    console.error('Vector search error:', error);
    throw error;
  }
  
  // Calculate similarity scores and transform to ProductCandidate format
  return (data || []).map(product => ({
    id: product.id,
    shopify_product_id: product.shopify_product_id,
    title: product.title,
    description: product.description,
    price_min: product.price_min,
    price_max: product.price_max,
    vendor: product.vendor,
    product_type: product.product_type,
    tags: product.tags,
    available: product.available,
    similarity_score: 0.85, // Placeholder - Supabase doesn't return actual similarity scores easily
  }));
}

/**
 * Fallback keyword search
 */
async function performKeywordSearch(
  shopDomain: string,
  query: string,
  limit: number,
  offset: number
): Promise<ProductCandidate[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      shopify_product_id,
      title,
      description,
      price_min,
      price_max,
      vendor,
      product_type,
      tags,
      available,
      image_url
    `)
    .eq('shop_domain', shopDomain)
    .eq('available', true)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,tags.cs.{${query}}`)
    .range(offset, offset + limit - 1);
  
  if (error) {
    console.error('Keyword search error:', error);
    return [];
  }
  
  return (data || []).map(product => ({
    id: product.id,
    shopify_product_id: product.shopify_product_id,
    title: product.title,
    description: product.description,
    price_min: product.price_min,
    price_max: product.price_max,
    vendor: product.vendor,
    product_type: product.product_type,
    tags: product.tags,
    available: product.available,
    similarity_score: 0.5, // Lower score for keyword search
  }));
}

/**
 * Log search query for analytics
 */
async function logSearchQuery(
  request: SearchRequest,
  parsedQuery: ParsedQuery,
  resultsCount: number
): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('search_queries')
      .insert({
        shop_domain: request.shop_domain,
        query_text: request.query,
        processed_query: parsedQuery.query_text,
        filters: parsedQuery.filters,
        results_count: resultsCount,
        session_id: request.session_id,
        user_agent: request.user_agent,
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Failed to log search query:', error);
      return 'unknown';
    }
    
    return data.id;
  } catch (error) {
    console.error('Failed to log search query:', error);
    return 'unknown';
  }
}

/**
 * Track product click for search analytics
 */
export async function trackProductClick(
  searchId: string,
  productId: number
): Promise<void> {
  try {
    // Get current clicked products
    const { data: searchQuery } = await supabase
      .from('search_queries')
      .select('clicked_product_ids')
      .eq('id', searchId)
      .single();
    
    if (searchQuery) {
      const currentClicks = searchQuery.clicked_product_ids || [];
      const updatedClicks = [...new Set([...currentClicks, productId])];
      
      await supabase
        .from('search_queries')
        .update({ clicked_product_ids: updatedClicks })
        .eq('id', searchId);
    }
  } catch (error) {
    console.error('Failed to track product click:', error);
  }
}

/**
 * Get search analytics for a shop
 */
export async function getSearchAnalytics(
  shopDomain: string,
  days: number = 30
): Promise<{
  total_searches: number;
  average_results: number;
  top_queries: Array<{ query: string; count: number; avg_results: number }>;
  click_through_rate: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  try {
    // Get search statistics
    const { data: searches, error } = await supabase
      .from('search_queries')
      .select('query_text, results_count, clicked_product_ids')
      .eq('shop_domain', shopDomain)
      .gte('created_at', since.toISOString());
    
    if (error || !searches) {
      return {
        total_searches: 0,
        average_results: 0,
        top_queries: [],
        click_through_rate: 0,
      };
    }
    
    const totalSearches = searches.length;
    const totalResults = searches.reduce((sum, s) => sum + (s.results_count || 0), 0);
    const averageResults = totalSearches > 0 ? totalResults / totalSearches : 0;
    
    // Calculate click-through rate
    const searchesWithClicks = searches.filter(s => s.clicked_product_ids && s.clicked_product_ids.length > 0);
    const clickThroughRate = totalSearches > 0 ? searchesWithClicks.length / totalSearches : 0;
    
    // Group queries and count
    const queryMap = new Map<string, { count: number; totalResults: number }>();
    searches.forEach(search => {
      const query = search.query_text.toLowerCase();
      const existing = queryMap.get(query) || { count: 0, totalResults: 0 };
      queryMap.set(query, {
        count: existing.count + 1,
        totalResults: existing.totalResults + (search.results_count || 0),
      });
    });
    
    // Get top queries
    const topQueries = Array.from(queryMap.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        avg_results: stats.count > 0 ? stats.totalResults / stats.count : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      total_searches: totalSearches,
      average_results: averageResults,
      top_queries: topQueries,
      click_through_rate: clickThroughRate,
    };
  } catch (error) {
    console.error('Failed to get search analytics:', error);
    return {
      total_searches: 0,
      average_results: 0,
      top_queries: [],
      click_through_rate: 0,
    };
  }
} 