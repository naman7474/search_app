import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { searchProducts, trackProductClick } from "../lib/search/search.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.public.appProxy(request);
  
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const shopDomain = url.searchParams.get("shop");
  
  if (!query || !shopDomain) {
    return json({ error: "Missing required parameters: q and shop" }, { status: 400 });
  }
  
  try {
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
    console.error("Search API error:", error);
    return json({
      success: false,
      error: "Search failed",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.public.appProxy(request);
  
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { search_id, product_id } = body;
      
      if (!search_id || !product_id) {
        return json({ error: "Missing search_id or product_id" }, { status: 400 });
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
  
  return json({ error: "Method not allowed" }, { status: 405 });
}; 