import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { searchProducts, trackProductClick } from "../lib/search/search.server";

/**
 * Handle direct /search requests from the app proxy
 * This route proxies to the main search API functionality
 */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    // Authenticate using app proxy
    const { storefront } = await authenticate.public.appProxy(request);
    
    const url = new URL(request.url);
    const query = url.searchParams.get("q");
    const limit = parseInt(url.searchParams.get("limit") || "20");
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const shopDomain = url.searchParams.get("shop");
    
    if (!query || !shopDomain) {
      return json({ 
        success: false,
        error: "Missing required parameters: q and shop"
      }, { status: 400 });
    }
    
    // Use the same search functionality as the API route
    const sessionId = url.searchParams.get("session_id") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;
    
    const searchResult = await searchProducts({
      query,
      shop_domain: shopDomain,
      limit,
      offset,
      session_id: sessionId,
      user_agent: userAgent,
    });
    
    return json({
      success: true,
      data: searchResult,
    });
    
  } catch (error) {
    console.error("Search route error:", error);
    return json({
      success: false,
      error: "Search failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
};

/**
 * Handle POST requests for product click tracking
 */
export const action = async ({ request }: LoaderFunctionArgs) => {
  try {
    await authenticate.public.appProxy(request);
    
    const body = await request.json();
    const { search_id, product_id } = body;
    
    if (!search_id || !product_id) {
      return json({ 
        success: false,
        error: "Missing required parameters: search_id and product_id"
      }, { status: 400 });
    }
    
    await trackProductClick(search_id, product_id);
    
    return json({ success: true });
    
  } catch (error) {
    console.error("Product click tracking error:", error);
    return json({
      success: false,
      error: "Failed to track product click",
    }, { status: 500 });
  }
}; 