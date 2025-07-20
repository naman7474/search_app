import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { BillingService, PLANS, type PlanType } from "../lib/billing/billing.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;
  
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  
  try {
    switch (action) {
      case "subscription":
        // Get current subscription and usage
        const summary = await BillingService.getSubscriptionSummary(shop);
        return json({ success: true, data: summary });
        
      case "plans":
        // Get available plans
        const plans = await BillingService.getAvailablePlans();
        return json({ 
          success: true, 
          data: {
            plans,
            configs: PLANS // Include full plan configurations
          }
        });
        
      default:
        return json({ 
          success: false, 
          error: "Invalid action. Use: subscription, plans" 
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Billing API error:", error);
    return json({ 
      success: false, 
      error: "Failed to fetch billing information",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }
  
  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;
    
    switch (action) {
      case "create_subscription": {
        const planType = formData.get("plan_type") as PlanType;
        const returnUrl = formData.get("return_url") as string || 
          `${new URL(request.url).origin}/app/billing?status=success`;
        
        if (!planType || !PLANS[planType]) {
          return json({ 
            success: false, 
            error: "Invalid plan type" 
          }, { status: 400 });
        }
        
        if (planType === 'free') {
          return json({ 
            success: false, 
            error: "Cannot create subscription for free plan" 
          }, { status: 400 });
        }
        
        const result = await BillingService.createSubscription(
          admin,
          shop,
          planType,
          returnUrl
        );
        
        return json({ 
          success: true, 
          data: {
            confirmationUrl: result.confirmationUrl,
            subscriptionId: result.subscriptionId,
            planType,
            planName: PLANS[planType].displayName,
            price: PLANS[planType].price
          }
        });
      }
      
      case "cancel_subscription": {
        await BillingService.cancelSubscription(admin, shop);
        
        return json({ 
          success: true, 
          message: "Subscription cancelled successfully" 
        });
      }
      
      case "upgrade_to_free": {
        // Downgrade to free plan (cancel existing subscription)
        try {
          await BillingService.cancelSubscription(admin, shop);
        } catch (error) {
          // Might not have an active subscription, that's okay
          console.log('No subscription to cancel:', error);
        }
        
        // Create a free subscription record
        const subscription = await BillingService.getShopSubscription(shop);
        
        return json({ 
          success: true, 
          message: "Downgraded to free plan successfully",
          data: subscription
        });
      }
      
      default:
        return json({ 
          success: false, 
          error: "Invalid action. Use: create_subscription, cancel_subscription, upgrade_to_free" 
        }, { status: 400 });
    }
  } catch (error) {
    console.error("Billing action error:", error);
    return json({ 
      success: false, 
      error: "Billing operation failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}; 