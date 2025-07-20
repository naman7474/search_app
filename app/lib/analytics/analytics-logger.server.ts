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
      // First, find or create a search result record
      let searchResultId: string | null = null;
      
      if (params.search_id) {
        // Try to find existing search result
        const { data: searchResult } = await supabase
          .from('search_results')
          .select('id')
          .eq('processed_query_id', params.search_id)
          .eq('shopify_product_id', params.product_id)
          .single();
        
        if (searchResult) {
          searchResultId = searchResult.id;
        }
      }
      
      // If no search result found, create a placeholder
      if (!searchResultId) {
        const { data: newSearchResult } = await supabase
          .from('search_results')
          .insert({
            processed_query_id: params.search_id || null,
            shopify_product_id: params.product_id,
            rank: params.position,
            similarity_score: 0, // Unknown
          })
          .select('id')
          .single();
        
        searchResultId = newSearchResult?.id || null;
      }
      
      if (!searchResultId) {
        console.error('Failed to create search result record');
        return false;
      }
      
      // Log the click event
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
          },
        });
      
      if (clickError) {
        console.error('Failed to log click event:', clickError);
        return false;
      }
      
      // Update search_queries with clicked product
      if (params.search_id) {
        // First get existing clicked products
        const { data: existingQuery } = await supabase
          .from('search_queries')
          .select('clicked_product_ids')
          .eq('id', params.search_id)
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
          .eq('id', params.search_id);
        
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
} 