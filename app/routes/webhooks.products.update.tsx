import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { indexProduct, type ShopifyProduct } from "../lib/indexing/product-indexer.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);
    
    console.log(`🔄 Product updated webhook received from ${shop}`);
    
    if (topic !== "PRODUCTS_UPDATE") {
      console.error(`❌ Unexpected webhook topic: ${topic}`);
      return new Response("Unexpected topic", { status: 400 });
    }
    
    // Transform webhook payload to our ShopifyProduct format
    // Note: Webhooks still use REST format even with GraphQL Admin API
    const product: ShopifyProduct = {
      id: payload.id,
      title: payload.title,
      body_html: payload.body_html,
      handle: payload.handle,
      product_type: payload.product_type,
      vendor: payload.vendor,
      tags: payload.tags,
      status: payload.status,
      variants: payload.variants?.map((variant: any) => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
        compare_at_price: variant.compare_at_price,
        sku: variant.sku,
        barcode: variant.barcode,
        inventory_quantity: variant.inventory_quantity || 0,
        available: variant.available || false,
        image_id: variant.image_id,
      })) || [],
      images: payload.images?.map((image: any) => ({
        id: image.id,
        src: image.src,
        alt: image.alt,
      })) || [],
      options: payload.options || [],
    };
    
    // Re-index the updated product
    const result = await indexProduct(product, shop);
    
    if (result.success) {
      console.log(`✅ Successfully re-indexed product: ${product.title}`);
    } else {
      console.error(`❌ Failed to re-index product: ${result.error}`);
    }
    
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("❌ Product update webhook error:", error);
    
    // Return 200 even on error to prevent webhook retry storms
    // Log the error for debugging but don't fail the webhook
    return new Response("Webhook processed", { status: 200 });
  }
}; 