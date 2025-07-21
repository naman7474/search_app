import { supabase } from '../supabase.server';
import type { 
  SearchEvent, 
  ClickEvent, 
  SearchAnalyticsEvent 
} from '../types/search.types';

export class AnalyticsLogger {
  /**
   * Log a search query
   */
  static async logSearch(params: {
    shop_domain: string;
    query: string;
    results_count: number;
    filters?: Record<string, any>;
    search_method: string;
    response_time_ms: number;
    session_id?: string;
    user_agent?: string;
  }): Promise<string | null> {
    try {
      const { data: searchQuery, error: searchError } = await supabase
        .from('search_queries')
        .insert({
          shop_domain: params.shop_domain,
          query_text: params.query,
          processed_query: params.query, // Can be enhanced with NLP processing
          filters: params.filters || {},
          results_count: params.results_count,
          session_id: params.session_id,
          user_agent: params.user_agent,
        })
        .select('id')
        .single();
      
      if (searchError || !searchQuery) {
        console.error('Failed to log search query:', searchError);
        return null;
      }
      
      // Log processed query details
      const { error: processedError } = await supabase
        .from('processed_queries')
        .insert({
          search_query_id: searchQuery.id,
          nlp_json: {
            query_text: params.query,
            filters: params.filters,
            search_method: params.search_method,
          },
          processing_time_ms: params.response_time_ms,
          confidence_score: 0.8, // Default confidence
        });
      
      if (processedError) {
        console.error('Failed to log processed query:', processedError);
      }
      
      console.log(`📊 Logged search: "${params.query}" with ${params.results_count} results`);
      return searchQuery.id;
      
    } catch (error) {
      console.error('Search logging error:', error);
      return null;
    }
  }
  
  /**
   * Log a product click from search results
   */
  static async logClick(params: {
    shop_domain: string;
    product_id: number;
    position: number;
    search_query?: string;
    search_id?: string;
    session_id?: string;
    user_agent?: string;
    page_url?: string;
    referrer?: string;
  }): Promise<boolean> {
    try {
      // Helper function to check if a string is a valid UUID
      const isValidUUID = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // Resolve search_id to actual processed query ID
      let resolvedSearchQueryId: string | null = null;
      let processedQueryId: string | null = null;

      if (params.search_id) {
        if (isValidUUID(params.search_id)) {
          // This is already a UUID, check if it's a search query ID or processed query ID
          const { data: searchQuery } = await supabase
            .from('search_queries')
            .select('id')
            .eq('id', params.search_id)
            .single();
          
          if (searchQuery) {
            resolvedSearchQueryId = params.search_id;
            
            // Find the corresponding processed query
            const { data: processedQuery } = await supabase
              .from('processed_queries')
              .select('id')
              .eq('search_query_id', params.search_id)
              .single();
            
            if (processedQuery) {
              processedQueryId = processedQuery.id;
            }
          } else {
            // Check if it's a processed query ID
            processedQueryId = params.search_id;
          }
        } else {
          // This might be a session ID, find the most recent search query for this session
          const { data: recentSearch } = await supabase
            .from('search_queries')
            .select('id')
            .eq('shop_domain', params.shop_domain)
            .eq('session_id', params.search_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (recentSearch) {
            resolvedSearchQueryId = recentSearch.id;
            
            // Find the corresponding processed query
            const { data: processedQuery } = await supabase
              .from('processed_queries')
              .select('id')
              .eq('search_query_id', recentSearch.id)
              .single();
            
            if (processedQuery) {
              processedQueryId = processedQuery.id;
            }
          }
        }
      }

      // Ensure we always have a processed query ID (create fallback if needed)
      if (!processedQueryId && resolvedSearchQueryId) {
        // Create a fallback processed query record
        const { data: fallbackProcessed, error: processedError } = await supabase
          .from('processed_queries')
          .insert({
            search_query_id: resolvedSearchQueryId,
            nlp_json: {
              query_text: params.search_query || 'unknown',
              click_tracking: true,
            },
            processing_time_ms: 0,
            confidence_score: 0.5,
          })
          .select('id')
          .single();
        
        if (fallbackProcessed && !processedError) {
          processedQueryId = fallbackProcessed.id;
        }
      }

      // If still no processed query ID, create a minimal fallback
      if (!processedQueryId) {
        console.warn('No search context found, creating minimal fallback for click tracking');
        
        // Create a minimal search query record for this click
        const { data: fallbackSearch, error: searchError } = await supabase
          .from('search_queries')
          .insert({
            shop_domain: params.shop_domain,
            query_text: params.search_query || 'click_without_search',
            processed_query: params.search_query || 'click_without_search',
            filters: {},
            results_count: 1,
            session_id: params.session_id,
          })
          .select('id')
          .single();
        
        if (fallbackSearch && !searchError) {
          resolvedSearchQueryId = fallbackSearch.id;
          
          // Create corresponding processed query
          const { data: fallbackProcessed, error: processedError } = await supabase
            .from('processed_queries')
            .insert({
              search_query_id: fallbackSearch.id,
              nlp_json: {
                query_text: params.search_query || 'click_without_search',
                fallback_for_click: true,
              },
              processing_time_ms: 0,
              confidence_score: 0.1,
            })
            .select('id')
            .single();
          
          if (fallbackProcessed && !processedError) {
            processedQueryId = fallbackProcessed.id;
          }
        }
      }

      // Now we should always have a processedQueryId - find or create search result
      let searchResultId: string | null = null;
      
      if (processedQueryId) {
        // Try to find existing search result
        const { data: searchResult } = await supabase
          .from('search_results')
          .select('id')
          .eq('processed_query_id', processedQueryId)
          .eq('shopify_product_id', params.product_id)
          .single();
        
        if (searchResult) {
          searchResultId = searchResult.id;
        } else {
          // Create new search result record
          const { data: newSearchResult, error: insertError } = await supabase
            .from('search_results')
            .insert({
              processed_query_id: processedQueryId,
              shopify_product_id: params.product_id,
              rank: params.position,
              similarity_score: 0, // Unknown
            })
            .select('id')
            .single();
          
          if (insertError) {
            console.error('Failed to create search result record:', insertError);
            return false; // Cannot continue without search_result_id
          }
          
          searchResultId = newSearchResult?.id || null;
        }
      }
      
      if (!searchResultId) {
        console.error('Failed to create search result record - cannot log click without it');
        return false;
      }
      
      // Log the click event (with or without search result linkage)
      const { error: clickError } = await supabase
        .from('click_events')
        .insert({
          search_result_id: searchResultId,
          session_id: params.session_id,
          user_agent: params.user_agent,
          page_url: params.page_url,
          referrer: params.referrer,
          metadata: {
            search_query: params.search_query,
            position: params.position,
            shop_domain: params.shop_domain,
            product_id: params.product_id,
          },
        });
      
      if (clickError) {
        console.error('Failed to log click event:', clickError);
        return false;
      }
      
      // Update search_queries with clicked product
      if (resolvedSearchQueryId) {
        // First get existing clicked products
        const { data: existingQuery } = await supabase
          .from('search_queries')
          .select('clicked_product_ids')
          .eq('id', resolvedSearchQueryId)
          .single();
        
        const clickedProducts = existingQuery?.clicked_product_ids || [];
        if (!clickedProducts.includes(params.product_id)) {
          clickedProducts.push(params.product_id);
        }
        
        const { error: updateError } = await supabase
          .from('search_queries')
          .update({
            clicked_product_ids: clickedProducts
          })
          .eq('id', resolvedSearchQueryId);
        
        if (updateError) {
          console.error('Failed to update search query:', updateError);
        }
      }
      
      console.log(`📊 Logged click: Product ${params.product_id} at position ${params.position}`);
      return true;
      
    } catch (error) {
      console.error('Click logging error:', error);
      return false;
    }
  }
  
  /**
   * Log a purchase attribution
   */
  static async logPurchase(params: {
    shop_domain: string;
    order_id: string;
    shopify_order_id?: number;
    purchased_product_id: number;
    customer_id?: string;
    session_id?: string;
    purchase_amount?: number;
    currency?: string;
    click_event_id?: string;
    search_query_id?: string;
  }): Promise<boolean> {
    try {
      // Calculate attribution type
      let attribution_type = 'direct';
      let time_to_purchase_minutes: number | null = null;
      
      if (params.click_event_id) {
        attribution_type = 'click_based';
        
        // Get click timestamp to calculate time to purchase
        const { data: clickEvent } = await supabase
          .from('click_events')
          .select('clicked_at')
          .eq('id', params.click_event_id)
          .single();
        
        if (clickEvent?.clicked_at) {
          const clickTime = new Date(clickEvent.clicked_at).getTime();
          const purchaseTime = new Date().getTime();
          time_to_purchase_minutes = Math.floor((purchaseTime - clickTime) / 60000);
        }
      } else if (params.search_query_id) {
        attribution_type = 'search_based';
      }
      
      const { error } = await supabase
        .from('purchase_attributions')
        .insert({
          click_event_id: params.click_event_id,
          search_query_id: params.search_query_id,
          order_id: params.order_id,
          shopify_order_id: params.shopify_order_id,
          purchased_product_id: params.purchased_product_id,
          customer_id: params.customer_id,
          session_id: params.session_id,
          purchase_amount: params.purchase_amount,
          currency: params.currency || 'USD',
          attribution_type,
          time_to_purchase_minutes,
          metadata: {
            shop_domain: params.shop_domain,
          },
        });
      
      if (error) {
        console.error('Failed to log purchase attribution:', error);
        return false;
      }
      
      console.log(`📊 Logged purchase: Order ${params.order_id}, Product ${params.purchased_product_id}`);
      return true;
      
    } catch (error) {
      console.error('Purchase logging error:', error);
      return false;
    }
  }

  /**
   * Log an add-to-cart event
   */
  static async logCartEvent(params: {
    shop_domain: string;
    product_id: number;
    variant_id?: number;
    quantity?: number;
    session_id?: string;
    user_agent?: string;
    click_event_id?: string;
    search_query_id?: string;
    event_type?: string;
    metadata?: Record<string, any>;
  }): Promise<boolean> {
    try {
      // Helper function to check if a string is a valid UUID
      const isValidUUID = (str: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      // If search_query_id looks like a session ID, try to find the actual search query ID
      let resolvedSearchQueryId: string | null = null;
      let resolvedClickEventId: string | null = null;

      if (params.search_query_id) {
        if (isValidUUID(params.search_query_id)) {
          resolvedSearchQueryId = params.search_query_id;
        } else {
          // This might be a session ID, try to find the most recent search query for this session
          const { data: recentSearch } = await supabase
            .from('search_queries')
            .select('id')
            .eq('shop_domain', params.shop_domain)
            .eq('session_id', params.search_query_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (recentSearch) {
            resolvedSearchQueryId = recentSearch.id;
          }
        }
      }

      if (params.click_event_id && isValidUUID(params.click_event_id)) {
        resolvedClickEventId = params.click_event_id;
      }

      const { error } = await supabase
        .from('cart_events')
        .insert({
          shop_domain: params.shop_domain,
          product_id: params.product_id,
          variant_id: params.variant_id,
          quantity: params.quantity || 1,
          session_id: params.session_id,
          user_agent: params.user_agent,
          click_event_id: resolvedClickEventId,
          search_query_id: resolvedSearchQueryId,
          event_type: params.event_type || 'add_to_cart',
          metadata: params.metadata || {},
        });
      
      if (error) {
        console.error('Failed to log cart event:', error);
        return false;
      }
      
      console.log(`🛒 Logged cart event: Product ${params.product_id} (${params.event_type || 'add_to_cart'})`);
      return true;
      
    } catch (error) {
      console.error('Cart event logging error:', error);
      return false;
    }
  }

  /**
   * Get analytics summary for a shop
   */
  static async getAnalyticsSummary(
    shop_domain: string, 
    days: number = 30
  ): Promise<{
    total_searches: number;
    unique_queries: number;
    total_clicks: number;
    click_through_rate: number;
    total_purchases: number;
    conversion_rate: number;
    popular_queries: Array<{ query: string; count: number }>;
    top_clicked_products: Array<{ product_id: number; clicks: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      // Get search queries
      const { data: searches, error: searchError } = await supabase
        .from('search_queries')
        .select('query_text, clicked_product_ids')
        .eq('shop_domain', shop_domain)
        .gte('created_at', startDate.toISOString());
      
      if (searchError || !searches) {
        throw searchError;
      }
      
      // Get click events
      const { data: clicks, error: clickError } = await supabase
        .from('click_events')
        .select('id, search_result_id')
        .gte('clicked_at', startDate.toISOString());
      
      if (clickError) {
        throw clickError;
      }
      
      // Get purchases
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchase_attributions')
        .select('id, purchased_product_id')
        .gte('created_at', startDate.toISOString());
      
      if (purchaseError) {
        throw purchaseError;
      }
      
      // Calculate metrics
      const total_searches = searches.length;
      const searches_with_clicks = searches.filter(s => 
        s.clicked_product_ids && s.clicked_product_ids.length > 0
      ).length;
      const click_through_rate = total_searches > 0 
        ? (searches_with_clicks / total_searches) * 100 
        : 0;
      
      // Popular queries
      const queryCount = searches.reduce((acc, search) => {
        const query = search.query_text.toLowerCase();
        acc[query] = (acc[query] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const popular_queries = Object.entries(queryCount)
        .map(([query, count]) => ({ query, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Top clicked products
      const productClicks = searches.reduce((acc, search) => {
        if (search.clicked_product_ids) {
          search.clicked_product_ids.forEach((productId: number) => {
            acc[productId] = (acc[productId] || 0) + 1;
          });
        }
        return acc;
      }, {} as Record<number, number>);
      
      const top_clicked_products = Object.entries(productClicks)
        .map(([product_id, clicks]) => ({ 
          product_id: parseInt(product_id), 
          clicks 
        }))
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);
      
      return {
        total_searches,
        unique_queries: Object.keys(queryCount).length,
        total_clicks: clicks?.length || 0,
        click_through_rate: Math.round(click_through_rate * 100) / 100,
        total_purchases: purchases?.length || 0,
        conversion_rate: total_searches > 0 
          ? Math.round((purchases?.length || 0) / total_searches * 10000) / 100 
          : 0,
        popular_queries,
        top_clicked_products,
      };
      
    } catch (error) {
      console.error('Failed to get analytics summary:', error);
      return {
        total_searches: 0,
        unique_queries: 0,
        total_clicks: 0,
        click_through_rate: 0,
        total_purchases: 0,
        conversion_rate: 0,
        popular_queries: [],
        top_clicked_products: [],
      };
    }
  }

  /**
   * Get enhanced query performance analytics
   */
  static async getQueryPerformanceAnalytics(
    shop_domain: string,
    days: number = 30
  ): Promise<{
    queries_with_clicks: Array<{
      query: string;
      total_searches: number;
      total_clicks: number;
      click_through_rate: number;
      avg_response_time: number;
      conversion_rate: number;
    }>;
    queries_without_clicks: Array<{
      query: string;
      search_count: number;
      last_searched: string;
      avg_response_time: number;
    }>;
    performance_by_response_time: {
      fast_queries: number; // <500ms
      medium_queries: number; // 500ms-2s
      slow_queries: number; // >2s
    };
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get comprehensive search data with response times
      const { data: searchData, error: searchError } = await supabase
        .from('search_queries')
        .select(`
          id,
          query_text,
          clicked_product_ids,
          created_at,
          processed_queries (
            processing_time_ms
          )
        `)
        .eq('shop_domain', shop_domain)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (searchError || !searchData) {
        throw searchError;
      }

      // Get purchase attributions for conversion tracking
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchase_attributions')
        .select('search_query_id, purchased_product_id')
        .gte('created_at', startDate.toISOString());

      if (purchaseError) {
        throw purchaseError;
      }

      // Group queries by text and calculate metrics
      const queryGroups = searchData.reduce((acc, search) => {
        const query = search.query_text.toLowerCase();
        
        if (!acc[query]) {
          acc[query] = {
            query: search.query_text,
            searches: [],
            total_clicks: 0,
            total_conversions: 0,
          };
        }
        
        acc[query].searches.push(search);
        
        // Count clicks for this search
        if (search.clicked_product_ids && search.clicked_product_ids.length > 0) {
          acc[query].total_clicks += search.clicked_product_ids.length;
        }
        
        // Count conversions for this search
        const conversions = purchases?.filter(p => p.search_query_id === search.id) || [];
        acc[query].total_conversions += conversions.length;
        
        return acc;
      }, {} as Record<string, any>);

      // Categorize queries with and without clicks
      const queries_with_clicks = [];
      const queries_without_clicks = [];
      let fast_queries = 0;
      let medium_queries = 0;
      let slow_queries = 0;

      for (const [queryText, data] of Object.entries(queryGroups)) {
        const totalSearches = data.searches.length;
        const hasClicks = data.total_clicks > 0;
        
        // Calculate average response time
        const responseTimes = data.searches
          .filter((s: any) => s.processed_queries && s.processed_queries.length > 0)
          .map((s: any) => s.processed_queries[0].processing_time_ms);
        
        const avgResponseTime = responseTimes.length > 0 
          ? responseTimes.reduce((sum: number, time: number) => sum + time, 0) / responseTimes.length 
          : 0;

        // Categorize by response time
        if (avgResponseTime > 0) {
          if (avgResponseTime < 500) fast_queries += totalSearches;
          else if (avgResponseTime < 2000) medium_queries += totalSearches;
          else slow_queries += totalSearches;
        }

        const queryMetrics = {
          query: data.query,
          total_searches: totalSearches,
          avg_response_time: Math.round(avgResponseTime),
          last_searched: data.searches[0].created_at,
        };

        if (hasClicks) {
          queries_with_clicks.push({
            ...queryMetrics,
            total_clicks: data.total_clicks,
            click_through_rate: Math.round((data.total_clicks / totalSearches) * 100),
            conversion_rate: Math.round((data.total_conversions / totalSearches) * 10000) / 100,
          });
        } else {
          queries_without_clicks.push({
            ...queryMetrics,
            search_count: totalSearches,
          });
        }
      }

      // Sort results
      queries_with_clicks.sort((a, b) => b.total_searches - a.total_searches);
      queries_without_clicks.sort((a, b) => b.search_count - a.search_count);

      return {
        queries_with_clicks: queries_with_clicks.slice(0, 20),
        queries_without_clicks: queries_without_clicks.slice(0, 20),
        performance_by_response_time: {
          fast_queries,
          medium_queries,
          slow_queries,
        },
      };

    } catch (error) {
      console.error('Failed to get query performance analytics:', error);
      return {
        queries_with_clicks: [],
        queries_without_clicks: [],
        performance_by_response_time: {
          fast_queries: 0,
          medium_queries: 0,
          slow_queries: 0,
        },
      };
    }
  }

  /**
   * Get cart and conversion funnel analytics
   */
  static async getConversionFunnelAnalytics(
    shop_domain: string,
    days: number = 30
  ): Promise<{
    funnel_metrics: {
      total_searches: number;
      searches_with_clicks: number;
      searches_with_cart_adds: number;
      searches_with_purchases: number;
      click_to_cart_rate: number;
      cart_to_purchase_rate: number;
      overall_conversion_rate: number;
    };
    cart_events_summary: {
      total_cart_events: number;
      unique_products_added: number;
      avg_time_to_add_to_cart: number; // in minutes
    };
    top_converting_queries: Array<{
      query: string;
      searches: number;
      clicks: number;
      cart_adds: number;
      purchases: number;
      conversion_rate: number;
    }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get search queries
      const { data: searchQueries, error: searchError } = await supabase
        .from('search_queries')
        .select('id, query_text, clicked_product_ids, created_at')
        .eq('shop_domain', shop_domain)
        .gte('created_at', startDate.toISOString());

      if (searchError || !searchQueries) {
        throw searchError;
      }

      // Get cart events
      const { data: cartEvents, error: cartError } = await supabase
        .from('cart_events')
        .select('id, product_id, search_query_id, click_event_id, created_at')
        .eq('shop_domain', shop_domain)
        .gte('created_at', startDate.toISOString());

      if (cartError) {
        throw cartError;
      }

      // Get purchase attributions
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchase_attributions')
        .select('search_query_id, click_event_id, cart_event_id, purchased_product_id')
        .gte('created_at', startDate.toISOString());

      if (purchaseError) {
        throw purchaseError;
      }

      const totalSearches = searchQueries.length;
      const searchesWithClicks = searchQueries.filter(s => 
        s.clicked_product_ids && s.clicked_product_ids.length > 0
      ).length;

      // Find searches that led to cart events
      const searchQueryIds = searchQueries.map(s => s.id);
      const searchesWithCartAdds = cartEvents?.filter(c => 
        c.search_query_id && searchQueryIds.includes(c.search_query_id)
      ).length || 0;

      // Find searches that led to purchases
      const searchesWithPurchases = purchases?.filter(p => 
        p.search_query_id && searchQueryIds.includes(p.search_query_id)
      ).length || 0;

      // Calculate conversion rates
      const clickToCartRate = searchesWithClicks > 0 
        ? (searchesWithCartAdds / searchesWithClicks) * 100 
        : 0;
      
      const cartToPurchaseRate = searchesWithCartAdds > 0 
        ? (searchesWithPurchases / searchesWithCartAdds) * 100 
        : 0;
      
      const overallConversionRate = totalSearches > 0 
        ? (searchesWithPurchases / totalSearches) * 100 
        : 0;

      // Cart events summary
      const uniqueProductsAdded = new Set(cartEvents?.map(c => c.product_id) || []).size;
      
      // Calculate average time to add to cart (simplified)
      const avgTimeToAddToCart = 0; // Would need more complex calculation with click timestamps

      // Top converting queries
      const queryPerformance = searchQueries.reduce((acc, search) => {
        const query = search.query_text.toLowerCase();
        
        if (!acc[query]) {
          acc[query] = {
            query: search.query_text,
            searches: 0,
            clicks: 0,
            cart_adds: 0,
            purchases: 0,
          };
        }
        
        acc[query].searches += 1;
        
        if (search.clicked_product_ids && search.clicked_product_ids.length > 0) {
          acc[query].clicks += search.clicked_product_ids.length;
        }
        
        // Count cart events for this search
        const searchCartEvents = cartEvents?.filter(c => c.search_query_id === search.id) || [];
        acc[query].cart_adds += searchCartEvents.length;
        
        // Count purchases for this search
        const searchPurchases = purchases?.filter(p => p.search_query_id === search.id) || [];
        acc[query].purchases += searchPurchases.length;
        
        return acc;
      }, {} as Record<string, any>);

      const topConvertingQueries = Object.values(queryPerformance)
        .map((q: any) => ({
          ...q,
          conversion_rate: q.searches > 0 ? (q.purchases / q.searches) * 100 : 0,
        }))
        .sort((a: any, b: any) => b.conversion_rate - a.conversion_rate)
        .slice(0, 10);

      return {
        funnel_metrics: {
          total_searches: totalSearches,
          searches_with_clicks: searchesWithClicks,
          searches_with_cart_adds: searchesWithCartAdds,
          searches_with_purchases: searchesWithPurchases,
          click_to_cart_rate: Math.round(clickToCartRate * 100) / 100,
          cart_to_purchase_rate: Math.round(cartToPurchaseRate * 100) / 100,
          overall_conversion_rate: Math.round(overallConversionRate * 100) / 100,
        },
        cart_events_summary: {
          total_cart_events: cartEvents?.length || 0,
          unique_products_added: uniqueProductsAdded,
          avg_time_to_add_to_cart: avgTimeToAddToCart,
        },
        top_converting_queries: topConvertingQueries,
      };

    } catch (error) {
      console.error('Failed to get conversion funnel analytics:', error);
      return {
        funnel_metrics: {
          total_searches: 0,
          searches_with_clicks: 0,
          searches_with_cart_adds: 0,
          searches_with_purchases: 0,
          click_to_cart_rate: 0,
          cart_to_purchase_rate: 0,
          overall_conversion_rate: 0,
        },
        cart_events_summary: {
          total_cart_events: 0,
          unique_products_added: 0,
          avg_time_to_add_to_cart: 0,
        },
        top_converting_queries: [],
      };
    }
  }
} 