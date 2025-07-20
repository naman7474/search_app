import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { supabase } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const shopDomain = session.shop;
  
  try {
    // Get synced products from the database
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        id,
        title,
        handle,
        vendor,
        product_type,
        price_min,
        price_max,
        available,
        image_url,
        created_at,
        updated_at
      `)
      .eq('shop_domain', shopDomain)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Database error:", error);
      return json({
        success: false,
        error: "Failed to fetch synced products",
      }, { status: 500 });
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('shop_domain', shopDomain);

    if (countError) {
      console.error("Count error:", countError);
    }

    return json({
      success: true,
      data: products || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error) {
    console.error("Synced products API error:", error);
    return json({
      success: false,
      error: "Failed to fetch synced products",
      message: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}; 