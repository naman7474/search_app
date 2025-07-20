/**
 * Shared types for search functionality
 */

/**
 * Product data exposed to UI (without internal fields like similarity scores)
 */
export interface SearchProductDTO {
  id: string;
  shopify_product_id: number;
  title: string;
  description?: string;
  handle: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  price: {
    min: number | null;
    max: number | null;
    currency?: string;
  };
  image_url?: string;
  available: boolean;
  on_sale?: boolean;
  variants?: ProductVariantDTO[];
}

/**
 * Product variant data for UI
 */
export interface ProductVariantDTO {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number;
  sku?: string;
  available: boolean;
  inventory_quantity: number;
  image_url?: string;
}

/**
 * Search request from client
 */
export interface SearchRequestDTO {
  query: string;
  shop_domain: string;
  limit?: number;
  offset?: number;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'title' | 'newest';
  filters?: SearchFilters;
  session_id?: string;
  debug?: boolean;
}

/**
 * Search filters
 */
export interface SearchFilters {
  price_min?: number;
  price_max?: number;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  availability?: 'all' | 'in_stock' | 'out_of_stock';
  on_sale?: boolean;
}

/**
 * Search response to client
 */
export interface SearchResponseDTO {
  success: boolean;
  data?: {
    products: SearchProductDTO[];
    total_count: number;
    has_more: boolean;
    query_info: {
      original_query: string;
      processed_query?: string;
      filters_applied?: SearchFilters;
      search_method: 'hybrid' | 'vector' | 'keyword' | 'fallback';
      processing_time_ms: number;
    };
    facets?: SearchFacets;
    search_id: string;
  };
  error?: string;
  debug?: {
    similarity_scores?: Record<string, number>;
    search_steps?: string[];
  };
}

/**
 * Voice search specific response
 */
export interface VoiceSearchResponseDTO extends SearchResponseDTO {
  voice_search?: {
    original_text: string;
    language?: string;
    transcription_time_ms?: number;
  };
}

/**
 * Search facets for filtering
 */
export interface SearchFacets {
  vendors: FacetValue[];
  product_types: FacetValue[];
  price_ranges: PriceRange[];
  tags: FacetValue[];
  availability: {
    in_stock: number;
    out_of_stock: number;
  };
}

export interface FacetValue {
  value: string;
  count: number;
  label?: string;
}

export interface PriceRange {
  min: number;
  max: number;
  count: number;
  label: string;
}

/**
 * Analytics event types
 */
export interface SearchAnalyticsEvent {
  event_type: 'search' | 'click' | 'add_to_cart' | 'purchase';
  shop_domain: string;
  session_id: string;
  timestamp: Date;
  data: Record<string, any>;
}

export interface SearchEvent extends SearchAnalyticsEvent {
  event_type: 'search';
  data: {
    query: string;
    results_count: number;
    filters?: SearchFilters;
    search_method: string;
    response_time_ms: number;
  };
}

export interface ClickEvent extends SearchAnalyticsEvent {
  event_type: 'click';
  data: {
    product_id: number;
    position: number;
    search_query?: string;
    search_id?: string;
  };
}

/**
 * Transform internal ProductCandidate to SearchProductDTO
 */
export function toSearchProductDTO(
  product: any,
  options: { includeDebug?: boolean } = {}
): SearchProductDTO {
  const dto: SearchProductDTO = {
    id: product.id,
    shopify_product_id: product.shopify_product_id,
    title: product.title,
    description: product.description,
    handle: product.handle,
    vendor: product.vendor,
    product_type: product.product_type,
    tags: product.tags || [],
    price: {
      min: product.price_min,
      max: product.price_max,
    },
    image_url: product.image_url,
    available: product.available,
    on_sale: product.on_sale || false,
  };

  // Include variants if available
  if (product.product_variants) {
    dto.variants = product.product_variants.map((variant: any) => ({
      id: variant.id,
      title: variant.title,
      price: variant.price,
      compare_at_price: variant.compare_at_price,
      sku: variant.sku,
      available: variant.available,
      inventory_quantity: variant.inventory_quantity,
      image_url: variant.image_url,
    }));
  }

  return dto;
}

/**
 * Transform search result to response DTO
 */
export function toSearchResponseDTO(
  result: any,
  request: SearchRequestDTO,
  options: { includeDebug?: boolean } = {}
): SearchResponseDTO {
  const response: SearchResponseDTO = {
    success: true,
    data: {
      products: result.products.map((p: any) => 
        toSearchProductDTO(p, { includeDebug: options.includeDebug })
      ),
      total_count: result.total || result.products.length,
      has_more: result.hasMore || false,
      query_info: {
        original_query: request.query,
        processed_query: result.processedQuery,
        filters_applied: request.filters,
        search_method: result.method || 'hybrid',
        processing_time_ms: result.processing_time_ms || 0,
      },
      search_id: result.search_id || `search-${Date.now()}`,
    },
  };

  // Include debug info if requested
  if (options.includeDebug && request.debug) {
    response.debug = {
      similarity_scores: result.products.reduce((acc: any, p: any) => {
        if (p.similarity_score !== undefined) {
          acc[p.id] = p.similarity_score;
        }
        return acc;
      }, {}),
      search_steps: result.debug_steps || [],
    };
  }

  return response;
} 