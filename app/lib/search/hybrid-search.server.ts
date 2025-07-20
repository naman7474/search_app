// app/lib/search/hybrid-search.server.ts
import type { ProductCandidate } from './search.server';
import { supabase } from '../supabase.server';
import { generateQueryEmbedding } from '../ai/embedding.server';

export interface HybridSearchRequest {
  query: string;
  shopDomain: string;
  limit: number;
  offset?: number;
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'title' | 'newest';
  filters?: Record<string, any>;
}

export interface HybridSearchResult {
  products: ProductCandidate[];
  method: 'hybrid' | 'vector' | 'keyword';
  total?: number;
  hasMore?: boolean;
}

/**
 * Perform hybrid search combining vector and keyword search
 */
export async function hybridSearch(request: HybridSearchRequest): Promise<HybridSearchResult> {
  try {
    const offset = request.offset || 0;
    const sortBy = request.sortBy || 'relevance';
    
    // Run both searches in parallel (get extra results for better ranking)
    const [vectorResults, keywordResults] = await Promise.all([
      performVectorSearch({ ...request, limit: request.limit * 3 }),
      performKeywordSearch({ ...request, limit: request.limit * 3 }),
    ]);
    
    // Use RRF to combine results
    let fusedResults = reciprocalRankFusion(
      vectorResults,
      keywordResults,
      { k: 60, weights: { vector: 0.7, keyword: 0.3 } }
    );
    
    // Apply sorting
    if (sortBy !== 'relevance') {
      fusedResults = applySorting(fusedResults, sortBy);
    }
    
    // Apply pagination
    const total = fusedResults.length;
    const paginatedResults = fusedResults.slice(offset, offset + request.limit);
    const hasMore = (offset + request.limit) < total;
    
    return {
      products: paginatedResults,
      method: 'hybrid',
      total,
      hasMore,
    };
  } catch (error) {
    console.error('Hybrid search failed, falling back to keyword search:', error);
    
    // Fallback to keyword search
    const keywordResults = await performKeywordSearch(request);
    const offset = request.offset || 0;
    const total = keywordResults.length;
    const paginatedResults = keywordResults.slice(offset, offset + request.limit);
    
    return {
      products: paginatedResults,
      method: 'keyword',
      total,
      hasMore: (offset + request.limit) < total,
    };
  }
}

/**
 * Apply sorting to search results
 */
function applySorting(
  products: ProductCandidate[], 
  sortBy: 'price_asc' | 'price_desc' | 'title' | 'newest'
): ProductCandidate[] {
  const sorted = [...products];
  
  switch (sortBy) {
    case 'price_asc':
      return sorted.sort((a, b) => (a.price_min || 0) - (b.price_min || 0));
      
    case 'price_desc':
      return sorted.sort((a, b) => (b.price_max || 0) - (a.price_max || 0));
      
    case 'title':
      return sorted.sort((a, b) => 
        (a.title || '').localeCompare(b.title || '')
      );
      
    case 'newest':
      // Would need created_at field - for now, maintain original order
      return sorted;
      
    default:
      return sorted;
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
          inventory_quantity,
          sku,
          title
        )
      `)
      .eq('shop_domain', request.shopDomain);
    
    // Add keyword search conditions - expanded to include more fields
    const searchTerms = request.query.toLowerCase().split(/\s+/).filter(Boolean);
    
    // Build OR conditions for each search term across multiple fields
    const orConditions: string[] = [];
    
    searchTerms.forEach(term => {
      const conditions = [
        `title.ilike.%${term}%`,
        `description.ilike.%${term}%`,
        `vendor.ilike.%${term}%`,
        `product_type.ilike.%${term}%`,
        `handle.ilike.%${term}%`, // Add handle for URL-based searches
      ];
      
      // Add tag matching (tags is an array, so we use contains)
      conditions.push(`tags.cs.{${term}}`);
      
      orConditions.push(conditions.join(','));
    });
    
    // Apply the OR conditions for each term
    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }
    
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
      const productTypeLower = product.product_type?.toLowerCase() || '';
      const handleLower = product.handle?.toLowerCase() || '';
      const tagsLower: string[] = (product.tags || []).map((tag) => String(tag).toLowerCase());
      
      // Check variant SKUs and titles for matches
      const variantMatches = product.product_variants?.some((variant: any) => {
        const skuLower = variant.sku?.toLowerCase() || '';
        const variantTitleLower = variant.title?.toLowerCase() || '';
        return searchTerms.some(term => 
          skuLower.includes(term) || variantTitleLower.includes(term)
        );
      });
      
      // Boost score for each matching term
      searchTerms.forEach(term => {
        if (titleLower.includes(term)) score += 0.25; // Highest boost for title matches
        if (vendorLower.includes(term)) score += 0.15;
        if (productTypeLower.includes(term)) score += 0.1;
        if (descriptionLower.includes(term)) score += 0.05;
        if (handleLower.includes(term)) score += 0.1;
        if (tagsLower.some(tag => tag.includes(term))) score += 0.15;
        if (variantMatches) score += 0.2; // Good boost for variant matches
      });
      
      // Exact match bonus
      if (titleLower === request.query.toLowerCase()) score += 0.3;
      
      // SKU exact match bonus
      const hasExactSkuMatch = product.product_variants?.some((variant: any) => 
        variant.sku?.toLowerCase() === request.query.toLowerCase()
      );
      if (hasExactSkuMatch) score += 0.5; // High boost for exact SKU match
      
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