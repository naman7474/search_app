import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { getSearchAnalytics } from "../lib/search/search.server";
import { getIndexingStats } from "../lib/indexing/product-indexer.server";
import { AnalyticsLogger } from "../lib/analytics/analytics-logger.server";
import type { ActionFunctionArgs } from "@remix-run/node";

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

    if (type === "query_performance") {
      const queryPerformance = await AnalyticsLogger.getQueryPerformanceAnalytics(shopDomain, days);
      return json({
        success: true,
        data: queryPerformance,
      });
    }

    if (type === "conversion_funnel") {
      const conversionFunnel = await AnalyticsLogger.getConversionFunnelAnalytics(shopDomain, days);
      return json({
        success: true,
        data: conversionFunnel,
      });
    }

    if (type === "summary") {
      const summary = await AnalyticsLogger.getAnalyticsSummary(shopDomain, days);
      return json({
        success: true,
        data: summary,
      });
    }
    
    return json({
      success: false,
      error: "Invalid type parameter. Use 'search', 'indexing', 'overview', 'query_performance', 'conversion_funnel', or 'summary'",
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

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // For public analytics events, we don't authenticate with admin
    await authenticate.public.appProxy(request);
  } catch (error) {
    // Fallback to admin authentication for internal analytics
    try {
      const { session } = await authenticate.admin(request);
    } catch (adminError) {
      return json({
        success: false,
        error: "Authentication failed",
      }, { status: 401 });
    }
  }

  if (request.method !== "POST") {
    return json({
      success: false,
      error: "Method not allowed",
    }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { event_type, shop_domain, ...eventData } = body;

    if (!event_type || !shop_domain) {
      return json({
        success: false,
        error: "Missing required fields: event_type and shop_domain",
      }, { status: 400 });
    }

    let result = false;

    switch (event_type) {
      case 'add_to_cart':
        result = await AnalyticsLogger.logCartEvent({
          shop_domain,
          product_id: parseInt(eventData.product_id),
          variant_id: eventData.variant_id ? parseInt(eventData.variant_id) : undefined,
          quantity: eventData.quantity || 1,
          session_id: eventData.session_id,
          user_agent: request.headers.get('user-agent') || undefined,
          click_event_id: eventData.click_event_id,
          search_query_id: eventData.search_query_id,
          event_type: 'add_to_cart',
          metadata: {
            product_title: eventData.product_title,
            price: eventData.price,
          },
        });
        break;

      case 'click':
        result = await AnalyticsLogger.logClick({
          shop_domain,
          product_id: parseInt(eventData.product_id),
          position: eventData.position || 0,
          search_query: eventData.search_query,
          search_id: eventData.search_id,
          session_id: eventData.session_id,
          user_agent: request.headers.get('user-agent') || undefined,
          page_url: eventData.page_url,
          referrer: eventData.referrer,
        });
        break;

      default:
        return json({
          success: false,
          error: `Unsupported event type: ${event_type}`,
        }, { status: 400 });
    }

    if (result) {
      return json({ success: true });
    } else {
      return json({
        success: false,
        error: "Failed to log analytics event",
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Analytics event logging error:", error);
    return json({
      success: false,
      error: "Failed to process analytics event",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}; 