import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { removeProduct } from "../lib/indexing/product-indexer.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { shop, topic, payload } = await authenticate.webhook(request);
    
    console.log(`🗑️ Product deleted webhook received from ${shop}`);
    
    if (topic !== "PRODUCTS_DELETE") {
      console.error(`❌ Unexpected webhook topic: ${topic}`);
      return new Response("Unexpected topic", { status: 400 });
    }
    
    const productId = payload.id;
    
    if (!productId) {
      console.error("❌ No product ID in webhook payload");
      return new Response("Missing product ID", { status: 400 });
    }
    
    // Remove the product from the search index
    const result = await removeProduct(productId, shop);
    
    if (result.success) {
      console.log(`✅ Successfully removed product ${productId} from search index`);
    } else {
      console.error(`❌ Failed to remove product ${productId}: ${result.error}`);
    }
    
    return new Response("OK", { status: 200 });
    
  } catch (error) {
    console.error("❌ Product delete webhook error:", error);
    
    // Return 200 even on error to prevent webhook retry storms
    // Log the error for debugging but don't fail the webhook
    return new Response("Webhook processed", { status: 200 });
  }
}; 