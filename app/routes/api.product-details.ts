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
    // Get product details from our database
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        id,
        shopify_product_id,
        title,
        description,
        vendor,
        product_type,
        price_min,
        price_max,
        available,
        tags,
        image_url,
        handle,
        product_variants (
          id,
          shopify_variant_id,
          title,
          price,
          compare_at_price,
          available,
          inventory_quantity,
          sku
        )
      `)
      .eq('id', productId)
      .single();
    
    if (error) {
      console.error("Database error:", error);
      return json({ error: "Product not found" }, { status: 404 });
    }
    
    if (!product) {
      return json({ error: "Product not found" }, { status: 404 });
    }
    
    // Calculate price range and sale status
    let priceRange = null;
    let onSale = false;
    
    if (product.product_variants && product.product_variants.length > 0) {
      const prices = product.product_variants.map((v: any) => v.price).filter((p: any) => p !== null);
      const comparePrices = product.product_variants
        .filter((v: any) => v.compare_at_price && v.compare_at_price > v.price)
        .map((v: any) => v.compare_at_price);
      
      if (prices.length > 0) {
        priceRange = {
          min: Math.min(...prices),
          max: Math.max(...prices),
        };
        
        if (comparePrices.length > 0) {
          onSale = true;
          (priceRange as any).sale_min = Math.min(...comparePrices);
          (priceRange as any).sale_max = Math.max(...comparePrices);
        }
      }
    }
    
    // Return enhanced product data
    return json({
      id: product.id,
      shopify_product_id: product.shopify_product_id,
      title: product.title,
      description: product.description,
      vendor: product.vendor,
      product_type: product.product_type,
      price_min: product.price_min,
      price_max: product.price_max,
      available: product.available,
      tags: product.tags,
      image_url: product.image_url,
      handle: product.handle,
      price_range: priceRange,
      on_sale: onSale,
      variants: product.product_variants || []
    });
    
  } catch (error) {
    console.error("API error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}; 