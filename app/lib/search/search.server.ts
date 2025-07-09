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
      limit * 2 // Get more candidates for better selection
    );
    console.log(`SEARCH_STEP_3_SUCCESS: Found ${candidates.length} candidates`);
    
    // Step 4: Sort by similarity score (highest first) - replaces AI ranking
    console.log('SEARCH_STEP_4_START: Sorting by similarity score');
    const sortedProducts = candidates.sort((a, b) => {
      // Primary sort: similarity score (highest first)
      if (b.similarity_score !== a.similarity_score) {
        return b.similarity_score - a.similarity_score;
      }
      
      // Secondary sort: availability (available products first)
      if (a.available !== b.available) {
        return a.available ? -1 : 1;
      }
      
      // Tertiary sort: price (lower first, if available)
      const priceA = a.price_min || 0;
      const priceB = b.price_min || 0;
      return priceA - priceB;
    });
    console.log('SEARCH_STEP_4_SUCCESS: Products sorted by similarity score');
    
    // Step 5: Apply pagination
    const paginatedResults = sortedProducts.slice(offset, offset + limit);
    
    // Step 6: Log search query for analytics
    const searchId = await logSearchQuery(request, parsedQuery, candidates.length);
    
    const processingTime = Date.now() - startTime;
    
    return {
      products: paginatedResults,
      total_count: sortedProducts.length,
      query_info: {
        original_query: request.query,
        parsed_query: parsedQuery,
        processing_time_ms: processingTime,
      },
      ranking_info: {
        model_used: 'similarity_score_sort',
        reasoning: 'Products sorted by semantic similarity score (highest first), then by availability, then by price',
      },
      search_id: searchId,
    };
    
  } catch (error) {
    console.error("SEARCH_PIPELINE_ERROR:", error);
    
    // Fallback to keyword search
    console.log("SEARCH_FALLBACK: Falling back to keyword search");
    const fallbackResults = await performKeywordSearch(
      request.shop_domain,
      request.query,
      limit,
      offset
    );
    
    const processingTime = Date.now() - startTime;
    
    return {
      products: fallbackResults,
      total_count: fallbackResults.length,
      query_info: {
        original_query: request.query,
        parsed_query: {
          query_text: request.query,
          filters: {},
          intent: 'product_search',
          confidence: 0.3
        },
        processing_time_ms: processingTime,
      },
      search_id: 'fallback-' + Date.now(),
    };
  }
}

/**
 * Perform vector similarity search using pgvector
 */
async function performVectorSearch(
  shopDomain: string,
  queryEmbedding: number[],
  filters: Record<string, any>,
  limit: number
): Promise<ProductCandidate[]> {
  try {
    // Build the base query with proper pgvector syntax
    let query = supabase
      .from('products')
      .select(`
        id,
        shopify_product_id,
        title,
        description,
        vendor,
        product_type,
        price_min,
        price_max,
        available,
        tags,
        image_url,
        handle
      `)
      .eq('shop_domain', shopDomain);
    
    // Apply filters if provided
    if (filters.price_max) {
      query = query.lte('price_min', filters.price_max);
    }
    
    if (filters.color) {
      query = query.ilike('title', `%${filters.color}%`);
    }
    
    if (filters.product_type) {
      query = query.ilike('product_type', `%${filters.product_type}%`);
    }
    
    if (filters.tags && Array.isArray(filters.tags)) {
      // Use containedBy for array overlap
      query = query.overlaps('tags', filters.tags);
    }
    
    // Execute the query first to get filtered products
    const { data: products, error: filterError } = await query;
    
    if (filterError || !products || products.length === 0) {
      console.error('Filter query error:', filterError);
      return [];
    }
    
    // Now perform vector similarity search using RPC function
    // Use the numeric Shopify product IDs for the RPC call to avoid UUID ↔︎ integer mismatch
    const shopifyProductIds = products
      .map(p => p.shopify_product_id)
      .filter((id: number | null | undefined) => id !== null && id !== undefined);

    const { data, error } = await supabase
      .rpc('search_products_by_embedding', {
        query_embedding: queryEmbedding,
        match_threshold: 0.5,
        match_count: limit,
        shop_domain_filter: shopDomain,
        product_ids: shopifyProductIds
      });
    
    if (error) {
      console.error('Vector search error:', error);
      // If RPC fails, use the filtered products without similarity scores
      return products.map(product => ({
        ...product,
        similarity_score: 0.7 // Default score
      }));
    }
    
    // Map the results to ProductCandidate format
    return (data || []).map((product: any) => ({
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
      image_url: product.image_url,
      handle: product.handle,
      similarity_score: product.similarity || 0.5,
    }));
    
  } catch (error) {
    console.error('Vector search error:', error);
    throw error;
  }
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
    .select('*')
    .eq('shop_domain', shopDomain)
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,vendor.ilike.%${query}%,tags.cs.{${query}}`)
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
    image_url: product.image_url,
    handle: product.handle,
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
 * Get search analytics for a shop
 */
export async function getSearchAnalytics(shopDomain: string, days: number = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get search queries within the time period
    const { data: queries, error: queriesError } = await supabase
      .from('search_queries')
      .select('*')
      .eq('shop_domain', shopDomain)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (queriesError) {
      console.error('Failed to fetch search queries:', queriesError);
      return {
        total_searches: 0,
        unique_queries: 0,
        avg_results_per_search: 0,
        click_through_rate: 0,
        top_queries: [],
        searches_by_day: [],
        zero_result_queries: []
      };
    }
    
    if (!queries || queries.length === 0) {
      return {
        total_searches: 0,
        unique_queries: 0,
        avg_results_per_search: 0,
        click_through_rate: 0,
        top_queries: [],
        searches_by_day: [],
        zero_result_queries: []
      };
    }
    
    // Calculate metrics
    const totalSearches = queries.length;
    const uniqueQueries = new Set(queries.map(q => q.query_text.toLowerCase())).size;
    const avgResultsPerSearch = queries.reduce((sum, q) => sum + (q.results_count || 0), 0) / totalSearches;
    
    // Calculate click-through rate
    const searchesWithClicks = queries.filter(q => q.clicked_product_ids && q.clicked_product_ids.length > 0).length;
    const clickThroughRate = totalSearches > 0 ? (searchesWithClicks / totalSearches) * 100 : 0;
    
    // Find zero result queries
    const zeroResultQueries = queries
      .filter(q => (q.results_count || 0) === 0)
      .map(q => ({
        query: q.query_text,
        count: 1,
        last_searched: q.created_at
      }))
      .reduce((acc, curr) => {
        const existing = acc.find(q => q.query.toLowerCase() === curr.query.toLowerCase());
        if (existing) {
          existing.count += 1;
          if (new Date(curr.last_searched) > new Date(existing.last_searched)) {
            existing.last_searched = curr.last_searched;
          }
        } else {
          acc.push(curr);
        }
        return acc;
      }, [] as Array<{query: string, count: number, last_searched: string}>)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Get top queries
    const queryFrequency = queries.reduce((acc, q) => {
      const query = q.query_text.toLowerCase();
      if (!acc[query]) {
        acc[query] = {
          query: q.query_text,
          count: 0,
          avg_results: 0,
          click_rate: 0,
          total_results: 0,
          total_clicks: 0
        };
      }
      acc[query].count += 1;
      acc[query].total_results += q.results_count || 0;
      if (q.clicked_product_ids && q.clicked_product_ids.length > 0) {
        acc[query].total_clicks += 1;
      }
      return acc;
    }, {} as Record<string, any>);
    
    const topQueries = Object.values(queryFrequency)
      .map((q: any) => ({
        ...q,
        avg_results: q.count > 0 ? q.total_results / q.count : 0,
        click_rate: q.count > 0 ? (q.total_clicks / q.count) * 100 : 0
      }))
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);
    
    // Get searches by day
    const searchesByDay = queries.reduce((acc, q) => {
      const date = new Date(q.created_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = 0;
      }
      acc[date] += 1;
      return acc;
    }, {} as Record<string, number>);
    
    const searchesByDayArray = Object.entries(searchesByDay)
      .map(([date, count]) => ({ date, searches: count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return {
      total_searches: totalSearches,
      unique_queries: uniqueQueries,
      avg_results_per_search: Math.round(avgResultsPerSearch * 100) / 100,
      click_through_rate: Math.round(clickThroughRate * 100) / 100,
      top_queries: topQueries,
      searches_by_day: searchesByDayArray,
      zero_result_queries: zeroResultQueries
    };
    
  } catch (error) {
    console.error('Failed to get search analytics:', error);
    throw error;
  }
}

/**
 * Track product click for search analytics
 */
export async function trackProductClick(
  searchId: string,
  productId: number, // Expect shopify_product_id
): Promise<void> {
  try {
    // Get current clicked products
    const { data: searchQuery, error: fetchError } = await supabase
      .from('search_queries')
      .select('clicked_product_ids')
      .eq('id', searchId)
      .single();
      
    if (fetchError) {
      console.error('Failed to fetch search query for tracking:', fetchError);
      return;
    }
    
    if (searchQuery) {
      const currentClicks = searchQuery.clicked_product_ids || [];
      // Ensure IDs are integers
      const updatedClicks = [...new Set([...currentClicks, productId])].map(id => parseInt(id, 10));
      
      const { error: updateError } = await supabase
        .from('search_queries')
        .update({ clicked_product_ids: updatedClicks, updated_at: new Date().toISOString() })
        .eq('id', searchId);
        
      if (updateError) {
        console.error('Failed to track product click:', updateError);
      }
    }
  } catch (error) {
    console.error('Failed to track product click:', error);
  }
}