// app/lib/search/hybrid-search.server.ts
import type { ProductCandidate } from './search.server';
import { supabase } from '../supabase.server';
import { generateQueryEmbedding } from '../ai/embedding.server';

export interface HybridSearchRequest {
  query: string;
  shopDomain: string;
  limit: number;
  filters?: Record<string, any>;
}

export interface HybridSearchResult {
  products: ProductCandidate[];
  method: 'hybrid' | 'vector' | 'keyword';
}

/**
 * Perform hybrid search combining vector and keyword search
 */
export async function hybridSearch(request: HybridSearchRequest): Promise<HybridSearchResult> {
  try {
    // Run both searches in parallel
    const [vectorResults, keywordResults] = await Promise.all([
      performVectorSearch(request),
      performKeywordSearch(request),
    ]);
    
    // Use RRF to combine results
    const fusedResults = reciprocalRankFusion(
      vectorResults,
      keywordResults,
      { k: 60, weights: { vector: 0.7, keyword: 0.3 } }
    );
    
    // Take top N results
    const topResults = fusedResults.slice(0, request.limit);
    
    return {
      products: topResults,
      method: 'hybrid',
    };
  } catch (error) {
    console.error('Hybrid search failed, falling back to keyword search:', error);
    
    // Fallback to keyword search
    const keywordResults = await performKeywordSearch(request);
    return {
      products: keywordResults.slice(0, request.limit),
      method: 'keyword',
    };
  }
}

/**
 * Perform vector similarity search
 */
async function performVectorSearch(request: HybridSearchRequest): Promise<ProductCandidate[]> {
  try {
    // Generate embedding for the query
    const embeddingResult = await generateQueryEmbedding(request.query);
    
    // Build base query with variant data
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
        handle,
        product_variants (
          id,
          price,
          compare_at_price,
          available,
          inventory_quantity
        )
      `)
      .eq('shop_domain', request.shopDomain);
    
    // Apply filters
    if (request.filters?.price_max) {
      query = query.lte('price_min', request.filters.price_max);
    }
    
    if (request.filters?.price_min) {
      query = query.gte('price_max', request.filters.price_min);
    }
    
    if (request.filters?.vendor) {
      query = query.ilike('vendor', `%${request.filters.vendor}%`);
    }
    
    if (request.filters?.product_type) {
      query = query.ilike('product_type', `%${request.filters.product_type}%`);
    }
    
    // Get filtered products first
    const { data: products, error } = await query;
    
    if (error || !products || products.length === 0) {
      return [];
    }
    
    // Perform vector search using RPC
    const shopifyProductIds = products
      .map(p => p.shopify_product_id)
      .filter((id): id is number => id !== null);
    
    const { data: vectorResults, error: vectorError } = await supabase
      .rpc('search_products_by_embedding', {
        query_embedding: embeddingResult.embedding,
        match_threshold: 0.4, // Lower threshold for hybrid search
        match_count: request.limit * 2, // Get more candidates
        shop_domain_filter: request.shopDomain,
        product_ids: shopifyProductIds
      });
    
    if (vectorError || !vectorResults) {
      // Return filtered products without scores, enriched with variant data
      return products.map(product => ({
        ...product,
        similarity_score: 0.5,
        // Calculate sale status from variants
        on_sale: product.product_variants?.some((v: any) => 
          v.compare_at_price && v.compare_at_price > v.price
        ) || false,
        // Get price range from variants
        price_range: calculatePriceRange(product.product_variants || []),
      }));
    }
    
    // Merge vector results with variant data
    return vectorResults.map((product: any) => {
      const fullProduct = products.find(p => p.shopify_product_id === product.shopify_product_id);
      return {
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
        // Add rich variant data
        product_variants: fullProduct?.product_variants || [],
        on_sale: fullProduct?.product_variants?.some((v: any) => 
          v.compare_at_price && v.compare_at_price > v.price
        ) || false,
        price_range: calculatePriceRange(fullProduct?.product_variants || []),
      };
    });
  } catch (error) {
    console.error('Vector search failed:', error);
    return [];
  }
}

/**
 * Perform keyword-based search
 */
async function performKeywordSearch(request: HybridSearchRequest): Promise<ProductCandidate[]> {
  try {
    // Build query with keyword matching and variant data
    let query = supabase
      .from('products')
      .select(`
        *,
        product_variants (
          id,
          price,
          compare_at_price,
          available,
          inventory_quantity
        )
      `)
      .eq('shop_domain', request.shopDomain);
    
    // Add keyword search conditions
    const searchTerms = request.query.toLowerCase().split(/\s+/).filter(Boolean);
    const orConditions = searchTerms.map(term => 
      `title.ilike.%${term}%,description.ilike.%${term}%,vendor.ilike.%${term}%,product_type.ilike.%${term}%`
    ).join(',');
    
    query = query.or(orConditions);
    
    // Apply filters
    if (request.filters?.price_max) {
      query = query.lte('price_min', request.filters.price_max);
    }
    
    if (request.filters?.price_min) {
      query = query.gte('price_max', request.filters.price_min);
    }
    
    if (request.filters?.vendor) {
      query = query.ilike('vendor', `%${request.filters.vendor}%`);
    }
    
    if (request.filters?.product_type) {
      query = query.ilike('product_type', `%${request.filters.product_type}%`);
    }
    
    // Limit results
    query = query.limit(request.limit * 2);
    
    const { data, error } = await query;
    
    if (error || !data) {
      console.error('Keyword search error:', error);
      return [];
    }
    
    // Calculate relevance scores based on keyword matches and enrich with variant data
    return data.map(product => {
      let score = 0.3; // Base score for keyword matches
      
      const titleLower = product.title?.toLowerCase() || '';
      const descriptionLower = product.description?.toLowerCase() || '';
      const vendorLower = product.vendor?.toLowerCase() || '';
      
      // Boost score for each matching term
      searchTerms.forEach(term => {
        if (titleLower.includes(term)) score += 0.2;
        if (vendorLower.includes(term)) score += 0.1;
        if (descriptionLower.includes(term)) score += 0.05;
      });
      
      // Exact match bonus
      if (titleLower === request.query.toLowerCase()) score += 0.3;
      
      return {
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
        similarity_score: Math.min(score, 1), // Cap at 1
        // Add rich variant data
        product_variants: product.product_variants || [],
        on_sale: product.product_variants?.some((v: any) => 
          v.compare_at_price && v.compare_at_price > v.price
        ) || false,
        price_range: calculatePriceRange(product.product_variants || []),
      };
    });
  } catch (error) {
    console.error('Keyword search failed:', error);
    return [];
  }
}

/**
 * Reciprocal Rank Fusion (RRF) to combine results from multiple sources
 */
function reciprocalRankFusion(
  vectorResults: ProductCandidate[],
  keywordResults: ProductCandidate[],
  options: { k: number; weights: { vector: number; keyword: number } }
): ProductCandidate[] {
  const scoreMap = new Map<string, { product: ProductCandidate; score: number }>();
  
  // Score vector results
  vectorResults.forEach((product, rank) => {
    const score = options.weights.vector / (options.k + rank + 1);
    const key = `${product.shopify_product_id}-${product.id}`;
    scoreMap.set(key, { product, score });
  });
  
  // Add keyword scores
  keywordResults.forEach((product, rank) => {
    const key = `${product.shopify_product_id}-${product.id}`;
    const existing = scoreMap.get(key);
    const keywordScore = options.weights.keyword / (options.k + rank + 1);
    
    if (existing) {
      // Product exists in both results - combine scores
      scoreMap.set(key, {
        product: existing.product,
        score: existing.score + keywordScore,
      });
    } else {
      // Product only in keyword results
      scoreMap.set(key, { product, score: keywordScore });
    }
  });
  
  // Sort by combined score and return products
  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map(({ product, score }) => ({
      ...product,
      similarity_score: score, // Use RRF score as similarity score
    }));
}

/**
 * Helper function to calculate price range from variants
 */
function calculatePriceRange(variants: any[]): { min: number; max: number; sale_min?: number; sale_max?: number } | null {
  if (!variants || variants.length === 0) return null;
  
  const prices = variants.map(v => v.price).filter(p => p !== null && p !== undefined);
  const comparePrices = variants
    .filter(v => v.compare_at_price && v.compare_at_price > v.price)
    .map(v => v.compare_at_price);
  
  if (prices.length === 0) return null;
  
  const result = {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };
  
  // Add original prices if on sale
  if (comparePrices.length > 0) {
    (result as any).sale_min = Math.min(...comparePrices);
    (result as any).sale_max = Math.max(...comparePrices);
  }
  
  return result;
}

/**
 * Helper to find product by ID in an array
 */
function findProductById(products: ProductCandidate[], id: string): ProductCandidate | undefined {
  return products.find(p => p.id === id);
} 