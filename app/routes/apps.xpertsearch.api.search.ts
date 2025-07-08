// app/routes/apps.xpertsearch.api.search.ts
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { searchProducts } from "../lib/search/search.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("q");
  const shop = url.searchParams.get("shop");
  const limit = url.searchParams.get("limit");
  
  // Validate required parameters
  if (!query || !shop) {
    return json(
      { 
        error: "Missing required parameters: 'q' (query) and 'shop' are required" 
      },
      { 
        status: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Content-Type": "application/json",
        }
      }
    );
  }
  
  // Add proper CORS headers
  const headers = new Headers({
    "Access-Control-Allow-Origin": `https://${shop}`,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=300", // Cache for 5 minutes
  });
  
  try {
    // Call existing search function
    const results = await searchProducts({
      query,
      shop_domain: shop,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    
    return json(results, { headers });
  } catch (error) {
    console.error("Search error:", error);
    
    return json(
      { 
        error: "An error occurred while searching",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { 
        status: 500,
        headers 
      }
    );
  }
};

// Handle OPTIONS requests for CORS preflight
export const action = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    const url = new URL(request.url);
    const shop = url.searchParams.get("shop");
    
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": shop ? `https://${shop}` : "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400", // 24 hours
      },
    });
  }
  
  // For non-OPTIONS requests, return method not allowed
  return new Response("Method not allowed", { status: 405 });
}; 