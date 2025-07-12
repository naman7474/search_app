import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { supabase } from "../lib/supabase.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const productId = url.searchParams.get("product_id");
  
  if (!productId) {
    return json({ error: "Product ID is required" }, { status: 400 });
  }
  
  try {
    // Get product variants from our database
    const { data: variants, error } = await supabase
      .from('product_variants')
      .select(`
        id,
        shopify_variant_id,
        title,
        price,
        compare_at_price,
        available,
        inventory_quantity,
        sku
      `)
      .eq('product_id', productId)
      .order('price', { ascending: true });
    
    if (error) {
      console.error("Database error:", error);
      return json({ error: "Failed to fetch variants" }, { status: 500 });
    }
    
    if (!variants || variants.length === 0) {
      return json({ variants: [] });
    }
    
    // Transform data for frontend use
    const transformedVariants = variants.map(variant => ({
      id: variant.shopify_variant_id, // Use Shopify variant ID for cart API
      title: variant.title,
      price: variant.price,
      compare_at_price: variant.compare_at_price,
      available: variant.available && variant.inventory_quantity > 0,
      inventory_quantity: variant.inventory_quantity,
      sku: variant.sku
    }));
    
    return json({ 
      variants: transformedVariants,
      count: transformedVariants.length 
    });
    
  } catch (error) {
    console.error("API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}; 