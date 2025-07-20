import { json } from "@remix-run/node";
import { BillingService } from "./billing.server";

/**
 * Billing middleware response types
 */
export interface BillingCheckResult {
  allowed: boolean;
  reason?: string;
  upgradeRequired?: boolean;
  currentUsage?: number;
  limit?: number;
  planType?: string;
}

/**
 * Middleware to check feature access and enforce billing limits
 */
export async function withBillingCheck(
  shopDomain: string,
  feature: 'ai_search' | 'conversations' | 'hybrid_search'
) {
  try {
    // Check feature access
    const accessCheck = await BillingService.checkFeatureAccess(shopDomain, feature);
    
    if (!accessCheck.allowed) {
      const subscription = await BillingService.getShopSubscription(shopDomain);
      
      return {
        success: false,
        error: 'BILLING_LIMIT_EXCEEDED',
        message: accessCheck.reason || 'Feature not available on current plan',
        billing: {
          planType: subscription.plan_type,
          upgradeRequired: accessCheck.upgradeRequired,
          feature,
        },
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Billing check failed:', error);
    // In case of billing system failure, allow the request but log the error
    return { 
      success: true, 
      warning: 'Billing check temporarily unavailable' 
    };
  }
}

/**
 * Middleware for AI search requests
 */
export async function checkAISearchAccess(shopDomain: string): Promise<BillingCheckResult> {
  try {
    const accessCheck = await BillingService.checkFeatureAccess(shopDomain, 'ai_search');
    const subscription = await BillingService.getShopSubscription(shopDomain);
    
    if (!accessCheck.allowed) {
      const currentUsage = await BillingService.getCurrentUsage(shopDomain, 'ai_search');
      const summary = await BillingService.getSubscriptionSummary(shopDomain);
      
      return {
        allowed: false,
        reason: accessCheck.reason,
        upgradeRequired: accessCheck.upgradeRequired,
        currentUsage,
        limit: summary.plan.aiSearchesPerMonth,
        planType: subscription.plan_type,
      };
    }

    return { allowed: true, planType: subscription.plan_type };
  } catch (error) {
    console.error('AI search billing check failed:', error);
    // Fail open in case of system errors
    return { allowed: true };
  }
}

/**
 * Middleware for conversation requests
 */
export async function checkConversationAccess(shopDomain: string): Promise<BillingCheckResult> {
  try {
    const accessCheck = await BillingService.checkFeatureAccess(shopDomain, 'conversations');
    const subscription = await BillingService.getShopSubscription(shopDomain);
    
    if (!accessCheck.allowed) {
      return {
        allowed: false,
        reason: accessCheck.reason,
        upgradeRequired: accessCheck.upgradeRequired,
        planType: subscription.plan_type,
      };
    }

    return { allowed: true, planType: subscription.plan_type };
  } catch (error) {
    console.error('Conversation billing check failed:', error);
    // Fail open in case of system errors
    return { allowed: true };
  }
}

/**
 * Middleware for hybrid search requests (usually always allowed)
 */
export async function checkHybridSearchAccess(shopDomain: string): Promise<BillingCheckResult> {
  try {
    const accessCheck = await BillingService.checkFeatureAccess(shopDomain, 'hybrid_search');
    const subscription = await BillingService.getShopSubscription(shopDomain);
    
    if (!accessCheck.allowed) {
      return {
        allowed: false,
        reason: accessCheck.reason,
        upgradeRequired: accessCheck.upgradeRequired,
        planType: subscription.plan_type,
      };
    }

    return { allowed: true, planType: subscription.plan_type };
  } catch (error) {
    console.error('Hybrid search billing check failed:', error);
    // Fail open in case of system errors
    return { allowed: true };
  }
}

/**
 * Record usage after successful API call
 */
export async function recordFeatureUsage(
  shopDomain: string,
  feature: 'ai_search' | 'conversation_message',
  quantity: number = 1
): Promise<void> {
  try {
    await BillingService.recordUsage(shopDomain, feature, quantity);
  } catch (error) {
    console.error(`Failed to record ${feature} usage for ${shopDomain}:`, error);
    // Don't fail the request if usage recording fails
  }
}

/**
 * Create a standardized billing error response
 */
export function createBillingErrorResponse(
  result: BillingCheckResult,
  feature: string
) {
  return json({
    success: false,
    error: 'BILLING_LIMIT_EXCEEDED',
    message: result.reason || `${feature} not available on current plan`,
    billing: {
      planType: result.planType,
      upgradeRequired: result.upgradeRequired,
      feature,
      currentUsage: result.currentUsage,
      limit: result.limit,
    },
    fallback_available: feature === 'ai_search', // Hybrid search is available as fallback for AI search
  }, { status: 402 }); // 402 Payment Required
}

/**
 * Wrapper function to apply billing protection to API routes
 */
export function withBilling<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  feature: 'ai_search' | 'conversations' | 'hybrid_search'
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    try {
      // Extract shop domain from the request
      const request = args[0]?.request || args[0]; // Handle both Remix and direct request patterns
      const url = new URL(request.url);
      const shopDomain = url.searchParams.get('shop');

      if (!shopDomain) {
        return json({ 
          success: false, 
          error: 'Missing shop parameter' 
        }, { status: 400 });
      }

      // Check billing access
      let billingResult: BillingCheckResult;
      
      switch (feature) {
        case 'ai_search':
          billingResult = await checkAISearchAccess(shopDomain);
          break;
        case 'conversations':
          billingResult = await checkConversationAccess(shopDomain);
          break;
        case 'hybrid_search':
          billingResult = await checkHybridSearchAccess(shopDomain);
          break;
        default:
          billingResult = { allowed: true };
      }

      if (!billingResult.allowed) {
        return createBillingErrorResponse(billingResult, feature);
      }

      // Execute the original handler
      const response = await handler(...args);
      
      // Record usage if the request was successful
      if (response.ok && (feature === 'ai_search' || feature === 'conversations')) {
        const usageType = feature === 'ai_search' ? 'ai_search' : 'conversation_message';
        recordFeatureUsage(shopDomain, usageType).catch(console.error);
      }

      return response;
    } catch (error) {
      console.error('Billing middleware error:', error);
      // In case of middleware failure, proceed with original handler
      return handler(...args);
    }
  }) as T;
} 