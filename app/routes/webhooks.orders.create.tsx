import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { AnalyticsLogger } from "../lib/analytics/analytics-logger.server";
import { supabase } from "../lib/supabase.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);
    
    console.log(`💰 Order created webhook received from ${shop}`);
    
    if (topic !== "ORDERS_CREATE") {
      console.error(`❌ Unexpected webhook topic: ${topic}`);
      return new Response("Unexpected topic", { status: 400 });
    }
    
    // Extract order data
    const order = payload;
    const orderId = order.id;
    const customerId = order.customer?.id;
    const customerEmail = order.customer?.email;
    const lineItems = order.line_items || [];
    const totalAmount = parseFloat(order.total_price || '0');
    const currency = order.currency;
    
    console.log(`📦 Processing order ${orderId} with ${lineItems.length} items`);
    
    // Try to find the session/customer in recent search activities
    let sessionId: string | undefined;
    let lastClickEventId: string | undefined;
    let lastSearchQueryId: string | undefined;
    
    if (customerEmail) {
      // Look for recent searches or clicks by this customer
      // This is a simplified approach - in production, you'd want more sophisticated session tracking
      const lookbackHours = 24; // Look back 24 hours
      const lookbackTime = new Date();
      lookbackTime.setHours(lookbackTime.getHours() - lookbackHours);
      
      // Find recent search queries (you might want to match by session_id instead)
      const { data: recentSearches } = await supabase
        .from('search_queries')
        .select('id, session_id, clicked_product_ids')
        .eq('shop_domain', shop)
        .gte('created_at', lookbackTime.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (recentSearches && recentSearches.length > 0) {
        // Check if any of the purchased products were clicked in recent searches
        for (const lineItem of lineItems) {
          const productId = lineItem.product_id;
          
          for (const search of recentSearches) {
            if (search.clicked_product_ids?.includes(productId)) {
              lastSearchQueryId = search.id;
              sessionId = search.session_id;
              
              // Try to find the specific click event
              const { data: clickEvent } = await supabase
                .from('click_events')
                .select('id')
                .eq('session_id', search.session_id)
                .order('clicked_at', { ascending: false })
                .limit(1)
                .single();
              
              if (clickEvent) {
                lastClickEventId = clickEvent.id;
              }
              
              break;
            }
          }
          
          if (lastSearchQueryId) break;
        }
      }
    }
    
    // Log purchase attribution for each line item
    const attributionPromises = lineItems.map(async (lineItem: any) => {
      const productId = lineItem.product_id;
      const variantId = lineItem.variant_id;
      const price = parseFloat(lineItem.price || '0');
      const quantity = lineItem.quantity || 1;
      
      return AnalyticsLogger.logPurchase({
        shop_domain: shop,
        order_id: orderId.toString(),
        shopify_order_id: orderId,
        purchased_product_id: productId,
        customer_id: customerId?.toString(),
        session_id: sessionId,
        purchase_amount: price * quantity,
        currency: currency,
        click_event_id: lastClickEventId,
        search_query_id: lastSearchQueryId,
      });
    });
    
    const results = await Promise.all(attributionPromises);
    const successCount = results.filter(r => r === true).length;
    
    console.log(`✅ Successfully logged ${successCount}/${lineItems.length} purchase attributions for order ${orderId}`);
    
    // You can also update the stores table with last purchase info if needed
    const { data: storeData } = await supabase
      .from('stores')
      .select('metadata')
      .eq('domain', shop)
      .single();
    
    const currentMetadata = storeData?.metadata || {};
    const totalOrders = parseInt(currentMetadata.total_orders || '0') + 1;
    
    await supabase
      .from('stores')
      .update({
        metadata: {
          ...currentMetadata,
          last_order_id: orderId,
          last_order_date: order.created_at,
          total_orders: totalOrders,
        }
      })
      .eq('domain', shop);
    
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("❌ Order webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
};