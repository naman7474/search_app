import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { unifiedSearchService } from "../lib/search/unified-search.server";
import { trackProductClick } from "../lib/search/search.server";
import { 
  transcribeAudio, 
  parseAudioFromFormData, 
  validateAudioFile 
} from "../lib/ai/voice-transcription.server";
import { 
  checkAISearchAccess, 
  checkHybridSearchAccess, 
  recordFeatureUsage,
  createBillingErrorResponse 
} from "../lib/billing/billing-middleware.server";

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Validate request origin for security
 */
function validateRequestOrigin(request: Request): boolean {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");
  
  if (!shopDomain) return false;
  
  // Basic validation - in production, implement more robust checks
  return shopDomain.includes('.myshopify.com') || 
         !!shopDomain.match(/^[a-zA-Z0-9\-]+\.(com|net|org|io)$/);
}

/**
 * Rate limiting implementation
 */
async function checkRateLimit(request: Request): Promise<{ allowed: boolean; remaining?: number }> {
  const url = new URL(request.url);
  const shopDomain = url.searchParams.get("shop");
  const clientIP = request.headers.get("x-forwarded-for") || "unknown";
  const identifier = `${shopDomain}-${clientIP}`;
  
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 100; // 100 requests per minute
  
  const current = rateLimitStore.get(identifier);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (current.count >= maxRequests) {
    return { allowed: false };
  }
  
  current.count++;
  return { allowed: true, remaining: maxRequests - current.count };
}

/**
 * Fallback to Shopify Storefront API
 */
async function getStorefrontFallback(storefront: any, query: string) {
  if (!storefront) return null;
  
  try {
    const response = await storefront.graphql(
      `query search($query: String!) {
        search(query: $query, first: 10) {
          edges {
            node {
              ... on Product {
                id
                title
                handle
                description
                vendor
                productType
                availableForSale
                priceRange {
                  minVariantPrice {
                    amount
                    currencyCode
                  }
                  maxVariantPrice {
                    amount
                    currencyCode
                  }
                }
                images(first: 1) {
                  edges {
                    node {
                      url
                      altText
                      width
                      height
                    }
                  }
                }
                variants(first: 1) {
                  edges {
                    node {
                      id
                      availableForSale
                      price {
                        amount
                        currencyCode
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      { variables: { query } }
    );
    
    const result = await response.json();
    
    if (result.data?.search?.edges) {
      return result.data.search.edges.map((edge: any) => ({
        id: parseInt(edge.node.id.split('/').pop()),
        shopify_product_id: parseInt(edge.node.id.split('/').pop()),
        title: edge.node.title,
        description: edge.node.description || '',
        vendor: edge.node.vendor || '',
        product_type: edge.node.productType || '',
        price_min: parseFloat(edge.node.priceRange.minVariantPrice.amount),
        price_max: parseFloat(edge.node.priceRange.maxVariantPrice.amount),
        available: edge.node.availableForSale,
        tags: [],
        image_url: edge.node.images.edges[0]?.node.url || '',
        handle: edge.node.handle,
        similarity_score: 0.5,
        ai_explanation: "Retrieved via Shopify Storefront API fallback"
      }));
    }
    
    return null;
  } catch (error) {
    console.error('Storefront API fallback error:', error);
    return null;
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const startTime = Date.now();
  
  try {
    // Authenticate and get storefront access
    const { storefront } = await authenticate.public.appProxy(request);
  
    const url = new URL(request.url);
    let query = url.searchParams.get("q");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const shopDomain = url.searchParams.get("shop");
    
    // Check if this is a voice search request
    const contentType = request.headers.get("content-type");
    const isVoiceSearch = contentType?.includes("multipart/form-data");
    let transcriptionInfo = null;
    
    if (isVoiceSearch) {
      try {
        // Parse audio from request
        const audioData = await parseAudioFromFormData(request);
        
        if (!audioData) {
          return json({ 
            success: false,
            error: "No audio file provided",
            fallback_available: false
          }, { status: 400 });
        }
        
        // Validate audio file
        const validation = validateAudioFile({
          size: audioData.audioBuffer.length,
          type: 'audio/webm',
          name: audioData.filename
        });
        
        if (!validation.valid) {
          return json({ 
            success: false,
            error: validation.error,
            fallback_available: false
          }, { status: 400 });
        }
        
        console.log(`🎤 Processing voice search for ${shopDomain}`);
        
        // Transcribe audio to text
        const transcriptionResult = await transcribeAudio(
          audioData.audioBuffer,
          audioData.filename,
          {
            language: 'en', // Default to English, could be made configurable
            prompt: 'Product search query:', // Context hint for better accuracy
          }
        );
        
        query = transcriptionResult.text;
        transcriptionInfo = {
          original_text: transcriptionResult.text,
          language: transcriptionResult.language,
          transcription_time_ms: transcriptionResult.duration
        };
        
        console.log(`📝 Transcribed query: "${query}"`);
        
      } catch (error) {
        console.error('Voice transcription error:', error);
        return json({ 
          success: false,
          error: "Voice transcription failed",
          details: error instanceof Error ? error.message : "Unknown error",
          fallback_available: true
        }, { status: 500 });
      }
    }
    
    // Validate request origin
    if (!validateRequestOrigin(request)) {
      return json({ 
        success: false,
        error: "Invalid request origin",
        fallback_available: false
      }, { status: 403 });
    }
    
    // Rate limiting
    const rateLimitResult = await checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return json({ 
        success: false,
        error: "Rate limit exceeded",
        retry_after: 60,
        fallback_available: false
      }, { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Date.now() + 60000).toString()
        }
      });
    }
  
  if (!query || !shopDomain) {
      return json({ 
        success: false,
        error: "Missing required parameters: q and shop",
        fallback_available: false
      }, { status: 400 });
  }
    
      // Performance timeout for AI search
  const AI_SEARCH_TIMEOUT = 5000; // 5 seconds
  let aiResults = null;
  let usedFallback = false;
  let billingInfo: any = null;
  
  try {
    const sessionId = url.searchParams.get("session_id") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;
    
    // Check what type of search to perform based on billing plan
    const aiSearchAccess = await checkAISearchAccess(shopDomain);
    const hybridSearchAccess = await checkHybridSearchAccess(shopDomain);
    
    let searchStrategy: 'ai' | 'hybrid' | 'keyword' = 'hybrid';
    
    // Determine search strategy based on plan permissions
    if (aiSearchAccess.allowed) {
      // Can use AI search (which includes query understanding)
      searchStrategy = 'ai';
    } else if (hybridSearchAccess.allowed) {
      // Fall back to hybrid search (vector + keyword without AI query processing)
      searchStrategy = 'hybrid';
      billingInfo = {
        planType: aiSearchAccess.planType,
        upgradeAvailable: aiSearchAccess.upgradeRequired,
        currentUsage: aiSearchAccess.currentUsage,
        limit: aiSearchAccess.limit,
        message: 'Using hybrid search - upgrade for AI-powered search features'
      };
    } else {
      // Should not happen as hybrid search is available on all plans
      return createBillingErrorResponse(hybridSearchAccess, 'search');
    }
    
          // Wrap search in timeout
    const searchPromise = unifiedSearchService.search({
      query,
      shop_domain: shopDomain,
      limit,
      offset,
      session_id: sessionId,
      user_agent: userAgent,
      strategy: searchStrategy,
      use_cache: true,
    });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), AI_SEARCH_TIMEOUT)
      );
      
      aiResults = await Promise.race([searchPromise, timeoutPromise]);
      
      // Record usage for AI searches
      if (searchStrategy === 'ai' && aiResults && typeof aiResults === 'object' && (aiResults as any).products?.length > 0) {
        recordFeatureUsage(shopDomain, 'ai_search', 1).catch(console.error);
      }
      
    } catch (error) {
      console.error("AI search failed, attempting fallback:", error);
      
      // Fallback to Shopify Storefront API
      const fallbackResults = await getStorefrontFallback(storefront, query);
      
      if (fallbackResults && fallbackResults.length > 0) {
        usedFallback = true;
        aiResults = {
          products: fallbackResults,
          total_count: fallbackResults.length,
          query_info: {
            original_query: query,
            parsed_query: {
              query_text: query,
              filters: {},
              intent: 'product_search',
              confidence: 0.5
            },
            processing_time_ms: Date.now() - startTime,
          },
          search_id: 'fallback-' + Date.now(),
        };
      } else {
        // Complete fallback failure
        return json({
          success: false,
          error: "Search temporarily unavailable",
          message: "Both AI search and fallback failed",
          fallback_available: false,
          processing_time_ms: Date.now() - startTime
        }, { status: 503 });
      }
    }
    
    return json({
      success: true,
      data: aiResults,
      used_fallback: usedFallback,
      processing_time_ms: Date.now() - startTime,
      rate_limit: {
        remaining: rateLimitResult.remaining
      },
      ...(transcriptionInfo && { voice_search: transcriptionInfo }),
      ...(billingInfo && { billing: billingInfo })
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining?.toString() || '0',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error("Search API critical error:", error);
    return json({
      success: false,
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
      fallback_available: false,
      processing_time_ms: Date.now() - startTime
    }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
  await authenticate.public.appProxy(request);
    
    // Validate request origin for POST requests too
    if (!validateRequestOrigin(request)) {
      return json({ 
        success: false,
        error: "Invalid request origin" 
      }, { status: 403 });
    }
    
    // Rate limiting for POST requests
    const rateLimitResult = await checkRateLimit(request);
    if (!rateLimitResult.allowed) {
      return json({ 
        success: false,
        error: "Rate limit exceeded" 
      }, { status: 429 });
    }
  
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { search_id, product_id } = body;
      
      if (!search_id || !product_id) {
          return json({ 
            success: false,
            error: "Missing search_id or product_id" 
          }, { status: 400 });
      }
      
      await trackProductClick(search_id, product_id);
      
      return json({ success: true });
      
    } catch (error) {
      console.error("Click tracking error:", error);
      return json({
        success: false,
        error: "Failed to track click",
      }, { status: 500 });
    }
  }
  
    return json({ 
      success: false,
      error: "Method not allowed" 
    }, { status: 405 });
    
  } catch (error) {
    console.error("Action authentication error:", error);
    return json({
      success: false,
      error: "Authentication failed",
    }, { status: 401 });
  }
}; 