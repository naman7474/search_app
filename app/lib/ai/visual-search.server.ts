import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../supabase.server';
import { generateQueryEmbedding } from './embedding.server';
import { rankProducts, type ProductCandidate } from './ranking.server';
import type { SearchResult } from '../search/search.server';

export interface ImageFeatures {
  category: string;
  colors: string[];
  style: string[];
  materials: string[];
  features: string[];
  confidence: number;
}

export interface VisualSearchResult extends SearchResult {
  visual_features?: ImageFeatures;
}

export interface VisualSearchRequest {
  imageBuffer: Buffer;
  mimeType: string;
  shopDomain: string;
  limit?: number;
  offset?: number;
  sessionId?: string;
  userAgent?: string;
}

export class VisualSearchEngine {
  private genAI: GoogleGenerativeAI | null;
  
  constructor() {
    this.genAI = process.env.GOOGLE_AI_API_KEY 
      ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
      : null;
  }
  
  async searchByImage(request: VisualSearchRequest): Promise<VisualSearchResult> {
    const startTime = Date.now();
    const limit = request.limit || 20;
    const offset = request.offset || 0;
    
    console.log("VISUAL_SEARCH_INITIATED", { shop: request.shopDomain });

    try {
      // Step 1: Extract image features using Gemini Vision
      console.log('VISUAL_SEARCH_STEP_1_START: Extracting image features');
      const imageFeatures = await this.extractImageFeatures(request.imageBuffer, request.mimeType);
      console.log('VISUAL_SEARCH_STEP_1_SUCCESS: Features extracted:', imageFeatures);
      
      // Step 2: Generate search query from image
      console.log('VISUAL_SEARCH_STEP_2_START: Generating search query from image');
      const searchQuery = await this.imageToQuery(request.imageBuffer, request.mimeType, imageFeatures);
      console.log('VISUAL_SEARCH_STEP_2_SUCCESS: Generated query:', searchQuery);
      
      // Step 3: Generate embedding for the search query
      console.log('VISUAL_SEARCH_STEP_3_START: Generating query embedding');
      const queryEmbedding = await generateQueryEmbedding(searchQuery);
      console.log('VISUAL_SEARCH_STEP_3_SUCCESS: Embedding generated');
      
      // Step 4: Find similar products using vector search
      console.log('VISUAL_SEARCH_STEP_4_START: Finding similar products');
      const candidates = await this.findSimilarProducts(
        queryEmbedding.embedding,
        imageFeatures,
        request.shopDomain,
        limit * 3 // Get more candidates for ranking
      );
      console.log(`VISUAL_SEARCH_STEP_4_SUCCESS: Found ${candidates.length} candidates`);
      
      // Step 5: Rank results using LLM with visual context
      console.log('VISUAL_SEARCH_STEP_5_START: Ranking visual search results');
      const rankingResult = await rankProducts(
        searchQuery,
        'visual_search',
        this.buildFiltersFromFeatures(imageFeatures),
        candidates
      );
      console.log('VISUAL_SEARCH_STEP_5_SUCCESS: Ranking completed');
      
      // Step 6: Apply pagination
      const paginatedResults = rankingResult.ranked_products.slice(offset, offset + limit);
      
      // Step 7: Log visual search query for analytics
      const searchId = await this.logVisualSearchQuery(request, imageFeatures, searchQuery, candidates.length);
      
      const processingTime = Date.now() - startTime;
      
      return {
        products: paginatedResults,
        total_count: rankingResult.ranked_products.length,
        query_info: {
          original_query: `[Visual Search: ${searchQuery}]`,
          parsed_query: {
            query_text: searchQuery,
            filters: this.buildFiltersFromFeatures(imageFeatures),
            intent: 'visual_search',
            confidence: imageFeatures.confidence
          },
          processing_time_ms: processingTime,
        },
        ranking_info: {
          model_used: rankingResult.model_used,
          reasoning: rankingResult.reasoning,
        },
        search_id: searchId,
        visual_features: imageFeatures,
      };
      
    } catch (error) {
      console.error("VISUAL_SEARCH_PIPELINE_ERROR:", error);
      
      // Fallback to basic category search if available
      if (error instanceof Error && error.message.includes('features')) {
        console.log("VISUAL_SEARCH_FALLBACK: Using basic image description");
        const basicQuery = await this.getBasicImageDescription(request.imageBuffer, request.mimeType);
        return this.performFallbackSearch(basicQuery, request.shopDomain, limit, offset);
      }
      
      throw error;
    }
  }
  
  private async extractImageFeatures(imageBuffer: Buffer, mimeType: string): Promise<ImageFeatures> {
    if (!this.genAI) {
      throw new Error('Google AI not available. Please configure GOOGLE_AI_API_KEY');
    }
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Analyze this product image and extract detailed features in JSON format:

    Required JSON structure:
    {
      "category": "specific product category (e.g., 'dress', 'sneakers', 'watch')",
      "colors": ["primary color", "secondary color"],
      "style": ["style attributes (e.g., 'casual', 'formal', 'vintage')"],
      "materials": ["visible materials (e.g., 'cotton', 'leather', 'metal')"],
      "features": ["distinctive features (e.g., 'striped', 'logo', 'buttons')"],
      "confidence": 0.95
    }

    Focus on visual elements that would help someone search for similar products. Be specific but not overly detailed.`;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString('base64'),
        },
      },
    ]);
    
    const responseText = result.response.text();
    
    try {
      // Clean up the response to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const features = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!features.category || !Array.isArray(features.colors)) {
        throw new Error('Invalid features structure');
      }
      
      return {
        category: features.category.toLowerCase(),
        colors: features.colors.map((c: string) => c.toLowerCase()),
        style: features.style || [],
        materials: features.materials || [],
        features: features.features || [],
        confidence: features.confidence || 0.8,
      };
    } catch (parseError) {
      console.error('Failed to parse image features:', parseError);
      console.error('Raw response:', responseText);
      
      // Fallback with basic parsing
      return {
        category: 'product',
        colors: [],
        style: [],
        materials: [],
        features: [],
        confidence: 0.5,
      };
    }
  }
  
  private async imageToQuery(imageBuffer: Buffer, mimeType: string, features: ImageFeatures): Promise<string> {
    if (!this.genAI) {
      throw new Error('Google AI not available. Please configure GOOGLE_AI_API_KEY');
    }
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Based on this product image and the extracted features, generate a natural search query that someone would use to find similar products.

    Extracted features: ${JSON.stringify(features)}

    Generate a concise, natural search query (2-8 words) that captures the essence of what someone would search for to find this product. Focus on the most distinctive and searchable attributes.

    Examples:
    - "black leather ankle boots"
    - "vintage floral summer dress"
    - "wireless bluetooth headphones"
    - "stainless steel watch"

    Query:`;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString('base64'),
        },
      },
    ]);
    
    const query = result.response.text().trim()
      .replace(/^["']|["']$/g, '') // Remove quotes
      .replace(/^Query:\s*/i, '') // Remove "Query:" prefix
      .toLowerCase();
    
    return query || `${features.category} ${features.colors.join(' ')}`.trim();
  }
  
  private async findSimilarProducts(
    queryEmbedding: number[],
    features: ImageFeatures,
    shopDomain: string,
    limit: number
  ): Promise<ProductCandidate[]> {
    try {
      // Build filters based on visual features
      const filters: any[] = [
        {
          column: 'shop_domain',
          operator: 'eq',
          value: shopDomain
        }
      ];
      
      // Add category filter if confident
      if (features.confidence > 0.7 && features.category !== 'product') {
        filters.push({
          column: 'product_type',
          operator: 'ilike',
          value: `%${features.category}%`
        });
      }
      
      // Search using vector similarity with feature-based filtering
      const { data, error } = await supabase
        .rpc('search_products_by_embedding', {
          query_embedding: queryEmbedding,
          match_threshold: 0.4, // Lower threshold for visual search
          match_count: limit,
          shop_domain_filter: shopDomain
        });
      
      if (error) {
        console.error('Vector search error:', error);
        return [];
      }
      
      if (!data || data.length === 0) {
        console.log('No vector search results, trying category fallback');
        return await this.performCategoryFallback(features, shopDomain, limit);
      }
      
      // Enhance results with visual similarity scores
      return data.map((product: any) => ({
        ...product,
        similarity_score: this.calculateVisualSimilarity(product, features),
      }));
      
    } catch (error) {
      console.error('Failed to find similar products:', error);
      return [];
    }
  }
  
  private async performCategoryFallback(
    features: ImageFeatures,
    shopDomain: string,
    limit: number
  ): Promise<ProductCandidate[]> {
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
      .eq('shop_domain', shopDomain)
      .eq('available', true)
      .limit(limit);
    
    // Try to match by category
    if (features.category !== 'product') {
      query = query.ilike('product_type', `%${features.category}%`);
    }
    
    // Try to match by colors in title or tags
    if (features.colors.length > 0) {
      const colorFilter = features.colors.map(color => `%${color}%`).join(',');
      query = query.or(`title.ilike.%${features.colors[0]}%,tags.cs.{${features.colors.join(',')}}`);
    }
    
    const { data, error } = await query;
    
    if (error || !data) {
      console.error('Category fallback error:', error);
      return [];
    }
    
    return data.map(product => ({
      ...product,
      similarity_score: 0.5, // Default similarity for fallback
    }));
  }
  
  private calculateVisualSimilarity(product: any, features: ImageFeatures): number {
    let score = product.similarity_score || 0.5;
    
    // Boost score for category matches
    if (features.category && product.product_type) {
      const productType = product.product_type.toLowerCase();
      if (productType.includes(features.category)) {
        score += 0.2;
      }
    }
    
    // Boost score for color matches in title or tags
    if (features.colors.length > 0) {
      const titleLower = (product.title || '').toLowerCase();
      const tags = product.tags || [];
      
      for (const color of features.colors) {
        if (titleLower.includes(color) || tags.some((tag: string) => tag.toLowerCase().includes(color))) {
          score += 0.1;
          break;
        }
      }
    }
    
    return Math.min(score, 1.0);
  }
  
  private buildFiltersFromFeatures(features: ImageFeatures): Record<string, any> {
    const filters: Record<string, any> = {};
    
    if (features.category && features.category !== 'product') {
      filters.product_type = features.category;
    }
    
    if (features.colors.length > 0) {
      filters.colors = features.colors;
    }
    
    if (features.style.length > 0) {
      filters.style = features.style;
    }
    
    return filters;
  }
  
  private async getBasicImageDescription(imageBuffer: Buffer, mimeType: string): Promise<string> {
    if (!this.genAI) {
      throw new Error('Google AI not available. Please configure GOOGLE_AI_API_KEY');
    }
    const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Describe this product image in 3-5 words that would be useful for searching. Focus on the product type and most obvious visual characteristics.`;
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType,
          data: imageBuffer.toString('base64'),
        },
      },
    ]);
    
    return result.response.text().trim().toLowerCase();
  }
  
  private async performFallbackSearch(
    query: string,
    shopDomain: string,
    limit: number,
    offset: number
  ): Promise<SearchResult> {
    // Simple keyword search as fallback
    const { data, error } = await supabase
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
      .eq('shop_domain', shopDomain)
      .eq('available', true)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%,product_type.ilike.%${query}%`)
      .range(offset, offset + limit - 1);
    
    const products = (data || []).map(product => ({
      ...product,
      similarity_score: 0.3,
    }));
    
    return {
      products,
      total_count: products.length,
      query_info: {
        original_query: `[Visual Search Fallback: ${query}]`,
        parsed_query: {
          query_text: query,
          filters: {},
          intent: 'visual_search_fallback',
          confidence: 0.3
        },
        processing_time_ms: 0,
      },
      search_id: 'visual-fallback-' + Date.now(),
    };
  }
  
  private async logVisualSearchQuery(
    request: VisualSearchRequest,
    features: ImageFeatures,
    searchQuery: string,
    resultsCount: number
  ): Promise<string> {
    try {
      const searchId = `visual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const { error } = await supabase
        .from('search_queries')
        .insert({
          id: searchId,
          shop_domain: request.shopDomain,
          query: searchQuery,
          query_type: 'visual_search',
          results_count: resultsCount,
          session_id: request.sessionId,
          user_agent: request.userAgent,
          metadata: {
            visual_features: features,
            image_mime_type: request.mimeType,
          },
          created_at: new Date().toISOString(),
        });
      
      if (error) {
        console.error('Failed to log visual search query:', error);
      }
      
      return searchId;
    } catch (error) {
      console.error('Failed to log visual search query:', error);
      return 'visual-' + Date.now();
    }
  }
}

// Export singleton instance
export const visualSearchEngine = new VisualSearchEngine(); 