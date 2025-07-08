import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { indexProduct, type ShopifyProduct } from "../lib/indexing/product-indexer.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);
    
    console.log(`📦 Product created webhook received from ${shop}`);
    
    if (topic !== "PRODUCTS_CREATE") {
      console.error(`❌ Unexpected webhook topic: ${topic}`);
      return new Response("Unexpected topic", { status: 400 });
    }
    
    // Transform webhook payload to our ShopifyProduct format
    const product: ShopifyProduct = {
      id: payload.id,
      title: payload.title,
      body_html: payload.body_html,
      handle: payload.handle,
      product_type: payload.product_type,
      vendor: payload.vendor,
      tags: payload.tags,
      status: payload.status,
      variants: payload.variants.map((variant: any) => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
        compare_at_price: variant.compare_at_price,
        sku: variant.sku,
        barcode: variant.barcode,
        inventory_quantity: variant.inventory_quantity || 0,
        available: variant.available || false,
        image_id: variant.image_id,
      })),
      images: payload.images.map((image: any) => ({
        id: image.id,
        src: image.src,
        alt: image.alt,
      })),
      options: payload.options || [],
    };
    
    // Index the product
    const result = await indexProduct(product, shop);
    
    if (result.success) {
      console.log(`✅ Successfully indexed product: ${product.title}`);
    } else {
      console.error(`❌ Failed to index product: ${result.error}`);
    }
    
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("❌ Product create webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}; 