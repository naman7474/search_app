import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { BillingService } from "../lib/billing/billing.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { payload, session, topic, shop } = await authenticate.webhook(request);
    console.log(`🔔 Received ${topic} webhook for ${shop}`);

    // Handle the subscription update
    await BillingService.handleSubscriptionUpdate(payload);

    console.log(`✅ Successfully processed ${topic} webhook for ${shop}`);
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error(`❌ Failed to process subscription webhook:`, error);
    return new Response("Error", { status: 500 });
  }
}; 