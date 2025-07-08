import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getSearchAnalytics } from "../lib/search/search.server";
import { getIndexingStats } from "../lib/indexing/product-indexer.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get("days") || "30");
  const type = url.searchParams.get("type") || "search";
  const shopDomain = session.shop;
  
  try {
    if (type === "search") {
      const analytics = await getSearchAnalytics(shopDomain, days);
      return json({
        success: true,
        data: analytics,
      });
    }
    
    if (type === "indexing") {
      const stats = await getIndexingStats(shopDomain);
      return json({
        success: true,
        data: stats,
      });
    }
    
    if (type === "overview") {
      // Get both search analytics and indexing stats
      const [searchAnalytics, indexingStats] = await Promise.all([
        getSearchAnalytics(shopDomain, days),
        getIndexingStats(shopDomain),
      ]);
      
      return json({
        success: true,
        data: {
          search: searchAnalytics,
          indexing: indexingStats,
          period_days: days,
        },
      });
    }
    
    return json({
      success: false,
      error: "Invalid type parameter. Use 'search', 'indexing', or 'overview'",
    }, { status: 400 });
    
  } catch (error) {
    console.error("Analytics API error:", error);
    return json({
      success: false,
      error: "Failed to get analytics",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}; 