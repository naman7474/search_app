import type { AdminApiContext } from "@shopify/shopify-app-remix/server";
import { supabase, supabaseAdmin } from "../supabase.server";

// Database types for our billing tables
export interface ShopSubscription {
  id: string;
  shop_domain: string;
  shopify_subscription_id?: string;
  plan_type: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  trial_ends_at?: string;
  canceled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UsageRecord {
  id: string;
  shop_domain: string;
  subscription_id: string;
  usage_type: string;
  quantity: number;
  billing_period: string;
  created_at: string;
}

export interface PlanLimits {
  id: string;
  plan_type: string;
  display_name: string;
  price: number;
  currency: string;
  ai_searches_per_month: number;
  conversations_enabled: boolean;
  hybrid_search_enabled: boolean;
  sort_order: number;
}

// Plan definitions
export const PLAN_TYPES = {
  FREE: 'free',
  BASIC: 'basic',
  PRO: 'pro',
  PREMIUM: 'premium',
} as const;

export type PlanType = (typeof PLAN_TYPES)[keyof typeof PLAN_TYPES];

export interface PlanConfig {
  type: PlanType;
  displayName: string;
  price: number; // in cents
  currency: string;
  aiSearchesPerMonth: number; // -1 for unlimited
  conversationsEnabled: boolean;
  hybridSearchEnabled: boolean;
  description: string;
  features: string[];
}

export const PLANS: Record<PlanType, PlanConfig> = {
  [PLAN_TYPES.FREE]: {
    type: 'free',
    displayName: 'Free Plan',
    price: 0,
    currency: 'USD',
    aiSearchesPerMonth: 0,
    conversationsEnabled: false,
    hybridSearchEnabled: true,
    description: 'Perfect for small stores getting started with advanced search',
    features: [
      'Unlimited Vector Search',
      'Hybrid search combining vector and keyword',
      'Basic analytics',
      'Email support'
    ],
  },
  [PLAN_TYPES.BASIC]: {
    type: 'basic',
    displayName: 'Basic Plan',
    price: 4900, // $49.00
    currency: 'USD',
    aiSearchesPerMonth: 10000,
    conversationsEnabled: false,
    hybridSearchEnabled: true,
    description: 'Great for growing stores that need AI-powered search',
    features: [
      'Unlimited Hybrid Search',
      '10,000 AI Searches per month',
      'Natural language query understanding',
      'Advanced analytics',
      'Priority email support'
    ],
  },
  [PLAN_TYPES.PRO]: {
    type: 'pro',
    displayName: 'Pro Plan',
    price: 9900, // $99.00
    currency: 'USD',
    aiSearchesPerMonth: -1, // unlimited
    conversationsEnabled: false,
    hybridSearchEnabled: true,
    description: 'Perfect for established stores with high search volume',
    features: [
      'Unlimited Hybrid Search',
      'Unlimited AI Searches',
      'Advanced query understanding',
      'Real-time analytics dashboard',
      'Phone and email support'
    ],
  },
  [PLAN_TYPES.PREMIUM]: {
    type: 'premium',
    displayName: 'Premium Plan',
    price: 14900, // $149.00
    currency: 'USD',
    aiSearchesPerMonth: -1, // unlimited
    conversationsEnabled: true,
    hybridSearchEnabled: true,
    description: 'Complete solution with conversational AI for enterprise stores',
    features: [
      'Unlimited Hybrid Search',
      'Unlimited AI Searches',
      'Conversational AI Assistant',
      'Advanced personalization',
      'Custom analytics reports',
      'Dedicated support'
    ],
  },
};

export class BillingService {
  
  /**
   * Get or create shop subscription
   */
  static async getShopSubscription(shopDomain: string): Promise<ShopSubscription> {
    // Try to get existing subscription
    const { data: existingSubscription, error: selectError } = await supabase
      .from('shop_subscriptions')
      .select('*')
      .eq('shop_domain', shopDomain)
      .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching subscription:', selectError);
      throw selectError;
    }

    if (existingSubscription) {
      return existingSubscription;
    }

    // Create free plan subscription for new shop
    const now = new Date();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()); // 1 month from now

    const { data: newSubscription, error: insertError } = await supabase
      .from('shop_subscriptions')
      .insert({
        shop_domain: shopDomain,
        plan_type: PLAN_TYPES.FREE,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: endDate.toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating subscription:', insertError);
      throw insertError;
    }

    return newSubscription;
  }
  
  /**
   * Create a Shopify subscription charge
   */
  static async createSubscription(
    admin: AdminApiContext,
    shopDomain: string,
    planType: PlanType,
    returnUrl: string
  ): Promise<{ confirmationUrl: string; subscriptionId: string }> {
    const plan = PLANS[planType];
    
    if (!plan || plan.type === PLAN_TYPES.FREE) {
      throw new Error('Invalid plan type for paid subscription');
    }
    
    // Create the GraphQL mutation for app subscription
    const mutation = `
      mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $lineItems: [AppSubscriptionLineItemInput!]!) {
        appSubscriptionCreate(name: $name, returnUrl: $returnUrl, lineItems: $lineItems) {
          userErrors {
            field
            message
          }
          confirmationUrl
          appSubscription {
            id
            status
          }
        }
      }
    `;
    
    const variables = {
      name: plan.displayName,
      returnUrl,
      lineItems: [
        {
          plan: {
            appRecurringPricingDetails: {
              price: {
                amount: plan.price / 100, // Convert cents to dollars
                currencyCode: plan.currency
              },
              interval: 'EVERY_30_DAYS'
            }
          }
        }
      ]
    };
    
    try {
      const response = await admin.graphql(mutation, { variables });
      const data = await response.json() as any;
      
      if (data.errors || data.data.appSubscriptionCreate.userErrors.length > 0) {
        const errors = data.errors || data.data.appSubscriptionCreate.userErrors;
        throw new Error(`Failed to create subscription: ${JSON.stringify(errors)}`);
      }
      
      const result = data.data.appSubscriptionCreate;
      
      // Store the pending subscription
      const { error: upsertError } = await supabase
        .from('shop_subscriptions')
        .upsert({
          shop_domain: shopDomain,
          shopify_subscription_id: result.appSubscription.id,
          plan_type: planType,
          status: 'pending',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });

      if (upsertError) {
        console.error('Error upserting subscription:', upsertError);
        throw upsertError;
      }
      
      return {
        confirmationUrl: result.confirmationUrl,
        subscriptionId: result.appSubscription.id,
      };
      
    } catch (error) {
      console.error('Failed to create Shopify subscription:', error);
      throw error;
    }
  }
  
  /**
   * Cancel a subscription
   */
  static async cancelSubscription(
    admin: AdminApiContext,
    shopDomain: string
  ): Promise<void> {
    const { data: subscription, error: selectError } = await supabase
      .from('shop_subscriptions')
      .select('shopify_subscription_id')
      .eq('shop_domain', shopDomain)
      .single();

    if (selectError || !subscription?.shopify_subscription_id) {
      throw new Error('No active subscription found');
    }
    
    const mutation = `
      mutation appSubscriptionCancel($id: ID!) {
        appSubscriptionCancel(id: $id) {
          userErrors {
            field
            message
          }
          appSubscription {
            id
            status
          }
        }
      }
    `;
    
    try {
      const response = await admin.graphql(mutation, {
        variables: { id: subscription.shopify_subscription_id }
      });
      
      const data = await response.json() as any;
      
      if (data.errors || data.data.appSubscriptionCancel.userErrors.length > 0) {
        const errors = data.errors || data.data.appSubscriptionCancel.userErrors;
        throw new Error(`Failed to cancel subscription: ${JSON.stringify(errors)}`);
      }
      
      // Update local subscription status
      const { error: updateError } = await supabase
        .from('shop_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
        })
        .eq('shop_domain', shopDomain);

      if (updateError) {
        console.error('Error updating subscription status:', updateError);
        throw updateError;
      }
      
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      throw error;
    }
  }
  
  /**
   * Handle subscription webhook updates
   */
  static async handleSubscriptionUpdate(payload: any): Promise<void> {
    try {
      const subscriptionId = payload.app_subscription?.admin_graphql_api_id;
      
      if (!subscriptionId) {
        console.warn('No subscription ID in webhook payload');
        return;
      }
      
      const status = payload.app_subscription?.status?.toLowerCase();
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'active') {
        updateData.current_period_start = new Date().toISOString();
        updateData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      }

      if (status === 'canceled') {
        updateData.canceled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('shop_subscriptions')
        .update(updateData)
        .eq('shopify_subscription_id', subscriptionId);

      if (error) {
        console.error('Error handling subscription update:', error);
        throw error;
      }
      
    } catch (error) {
      console.error('Failed to handle subscription update webhook:', error);
    }
  }
  
  /**
   * Get current usage for the billing period
   */
  static async getCurrentUsage(
    shopDomain: string,
    usageType: 'ai_search' | 'conversation_message'
  ): Promise<number> {
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
    
    const { data, error } = await supabase
      .from('usage_records')
      .select('quantity.sum()')
      .eq('shop_domain', shopDomain)
      .eq('usage_type', usageType)
      .eq('billing_period', billingPeriod);

    if (error) {
      console.error('Error getting usage:', error);
      return 0;
    }

    return (data as any)?.[0]?.sum || 0;
  }
  
  /**
   * Record usage
   */
  static async recordUsage(
    shopDomain: string,
    usageType: 'ai_search' | 'conversation_message',
    quantity: number = 1
  ): Promise<void> {
    const subscription = await this.getShopSubscription(shopDomain);
    
    const now = new Date();
    const billingPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
    
    const { error } = await supabase
      .from('usage_records')
      .insert({
        shop_domain: shopDomain,
        subscription_id: subscription.id,
        usage_type: usageType,
        quantity,
        billing_period: billingPeriod,
      });

    if (error) {
      console.error('Error recording usage:', error);
      throw error;
    }
  }
  
  /**
   * Check if feature is available for shop's plan
   */
  static async checkFeatureAccess(
    shopDomain: string,
    feature: 'ai_search' | 'conversations' | 'hybrid_search'
  ): Promise<{ allowed: boolean; reason?: string; upgradeRequired?: boolean }> {
    const subscription = await this.getShopSubscription(shopDomain);
    const plan = PLANS[subscription.plan_type as PlanType];
    
    if (!plan) {
      return { allowed: false, reason: 'Invalid plan type' };
    }
    
    switch (feature) {
      case 'hybrid_search':
        return { 
          allowed: plan.hybridSearchEnabled,
          reason: plan.hybridSearchEnabled ? undefined : 'Hybrid search not available on current plan',
          upgradeRequired: !plan.hybridSearchEnabled
        };
        
      case 'conversations':
        return { 
          allowed: plan.conversationsEnabled,
          reason: plan.conversationsEnabled ? undefined : 'Conversational search requires Premium plan',
          upgradeRequired: !plan.conversationsEnabled
        };
        
      case 'ai_search':
        if (plan.aiSearchesPerMonth === 0) {
          return { 
            allowed: false, 
            reason: 'AI search requires a paid plan',
            upgradeRequired: true
          };
        }
        
        if (plan.aiSearchesPerMonth === -1) {
          return { allowed: true }; // unlimited
        }
        
        // Check usage limits
        const currentUsage = await this.getCurrentUsage(shopDomain, 'ai_search');
        
        if (currentUsage >= plan.aiSearchesPerMonth) {
          return { 
            allowed: false, 
            reason: `Monthly AI search limit of ${plan.aiSearchesPerMonth} reached`,
            upgradeRequired: true
          };
        }
        
        return { allowed: true };
        
      default:
        return { allowed: false, reason: 'Unknown feature' };
    }
  }
  
  /**
   * Get subscription summary with usage
   */
  static async getSubscriptionSummary(shopDomain: string) {
    const subscription = await this.getShopSubscription(shopDomain);
    const plan = PLANS[subscription.plan_type as PlanType];
    
    const aiSearchUsage = await this.getCurrentUsage(shopDomain, 'ai_search');
    const conversationUsage = await this.getCurrentUsage(shopDomain, 'conversation_message');
    
    return {
      subscription,
      plan,
      usage: {
        aiSearches: {
          current: aiSearchUsage,
          limit: plan.aiSearchesPerMonth,
          unlimited: plan.aiSearchesPerMonth === -1,
        },
        conversations: {
          current: conversationUsage,
          enabled: plan.conversationsEnabled,
        },
      },
      billing: {
        currentPeriod: {
          start: subscription.current_period_start,
          end: subscription.current_period_end,
        },
        status: subscription.status,
        trialEndsAt: subscription.trial_ends_at,
      },
    };
  }

  /**
   * Get all available plans
   */
  static async getAvailablePlans(): Promise<PlanLimits[]> {
    const { data: plans, error } = await supabase
      .from('plan_limits')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error);
      // Return hardcoded plans as fallback
      return Object.values(PLANS).map((plan, index) => ({
        id: `fallback_${plan.type}`,
        plan_type: plan.type,
        display_name: plan.displayName,
        price: plan.price,
        currency: plan.currency,
        ai_searches_per_month: plan.aiSearchesPerMonth,
        conversations_enabled: plan.conversationsEnabled,
        hybrid_search_enabled: plan.hybridSearchEnabled,
        sort_order: index,
      }));
    }

    return plans || [];
  }
} 