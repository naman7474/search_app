import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  Button,
  BlockStack,
  Box,
  InlineStack,
  Badge,
  Banner,
  Grid,
  Icon,
  Divider,
  ProgressBar,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { 
  CashDollarIcon, 
  StarFilledIcon,
  PlanIcon,
  CheckIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  
  return json({
    shop: session.shop,
    apiUrl: new URL(request.url).origin,
    status, // success, cancelled, error
  });
};

export default function BillingPage() {
  const { shop, apiUrl, status } = useLoaderData<typeof loader>();
  const subscriptionFetcher = useFetcher();
  const plansFetcher = useFetcher();
  const actionFetcher = useFetcher();

  // State
  const [subscription, setSubscription] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [planConfigs, setPlanConfigs] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showStatusBanner, setShowStatusBanner] = useState(!!status);

  const isSubmitting = actionFetcher.state !== 'idle';

  // Load subscription and plans data
  useEffect(() => {
    subscriptionFetcher.load(`/api/billing?action=subscription`);
    plansFetcher.load(`/api/billing?action=plans`);
  }, []);

  // Handle fetcher responses
  useEffect(() => {
    if ((subscriptionFetcher.data as any)?.success) {
      setSubscription((subscriptionFetcher.data as any).data);
    }
  }, [subscriptionFetcher.data]);

  useEffect(() => {
    if ((plansFetcher.data as any)?.success) {
      setPlans((plansFetcher.data as any).data.plans);
      setPlanConfigs((plansFetcher.data as any).data.configs);
      setLoading(false);
    }
  }, [plansFetcher.data]);

  useEffect(() => {
    if ((actionFetcher.data as any)?.success) {
      if ((actionFetcher.data as any).data?.confirmationUrl) {
        // Redirect to Shopify billing confirmation
        window.top?.location.assign((actionFetcher.data as any).data.confirmationUrl);
      } else {
        // Refresh subscription data
        subscriptionFetcher.load(`/api/billing?action=subscription`);
        setShowUpgradeModal(false);
      }
    }
  }, [actionFetcher.data]);

  const handlePlanSelect = (planType: string) => {
    setSelectedPlan(planType);
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = () => {
    if (!selectedPlan) return;

    const formData = new FormData();
    formData.append('action', 'create_subscription');
    formData.append('plan_type', selectedPlan);
    
    actionFetcher.submit(formData, { method: 'post', action: '/api/billing' });
  };

  const handleCancelSubscription = () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features.')) {
      return;
    }

    const formData = new FormData();
    formData.append('action', 'cancel_subscription');
    
    actionFetcher.submit(formData, { method: 'post', action: '/api/billing' });
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getUsagePercentage = () => {
    if (!subscription?.usage?.aiSearches || subscription.usage.aiSearches.unlimited) {
      return 0;
    }
    
    const current = subscription.usage.aiSearches.current || 0;
    const limit = subscription.usage.aiSearches.limit || 1;
    return Math.min((current / limit) * 100, 100);
  };

  const getBadgeStatus = (planType: string) => {
    if (!subscription) return undefined;
    
    if (subscription.subscription.plan_type === planType) {
      return subscription.subscription.status === 'active' ? 'success' : 'attention';
    }
    
    return undefined;
  };

  const getPlanFeatures = (planType: string) => {
    return planConfigs[planType]?.features || [];
  };

  if (loading) {
    return (
      <Page>
        <TitleBar title="Billing & Subscription" />
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="400">
                <Text as="p">Loading billing information...</Text>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="Billing & Subscription" />
      
      {showStatusBanner && (
        <Layout>
          <Layout.Section>
            <Banner 
              tone={status === 'success' ? 'success' : status === 'error' ? 'critical' : 'info'}
              onDismiss={() => setShowStatusBanner(false)}
            >
              {status === 'success' && "Your subscription has been activated successfully!"}
              {status === 'cancelled' && "Subscription setup was cancelled."}
              {status === 'error' && "There was an error setting up your subscription. Please try again."}
            </Banner>
          </Layout.Section>
        </Layout>
      )}

      <Layout>
        {/* Current Subscription Status */}
        <Layout.Section oneHalf>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between">
                <Text variant="headingMd" as="h2">Current Plan</Text>
                <Badge status={subscription?.subscription?.status === 'active' ? 'success' : 'attention'}>
                  {subscription?.subscription?.status?.toUpperCase() || 'UNKNOWN'}
                </Badge>
              </InlineStack>
              
              <Text variant="headingLg" as="h3">
                {planConfigs[subscription?.subscription?.plan_type]?.displayName || 'Unknown Plan'}
              </Text>
              
              <Text as="p" tone="subdued">
                {planConfigs[subscription?.subscription?.plan_type]?.description || 'Plan description not available'}
              </Text>

              {subscription?.subscription?.plan_type !== 'free' && (
                <InlineStack gap="200">
                  <Text variant="headingMd" as="h4">
                    {formatPrice(planConfigs[subscription?.subscription?.plan_type]?.price || 0)}/month
                  </Text>
                </InlineStack>
              )}

              {subscription?.subscription?.status === 'active' && 
               subscription?.subscription?.plan_type !== 'free' && (
                <Box>
                  <Button 
                    destructive 
                    outline
                    onClick={handleCancelSubscription}
                    loading={isSubmitting}
                  >
                    Cancel Subscription
                  </Button>
                </Box>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Usage Statistics */}
        <Layout.Section oneHalf>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Usage This Month</Text>
              
              {/* AI Searches */}
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="p">AI Searches</Text>
                  <Text as="p" variant="bodySm">
                    {subscription?.usage?.aiSearches?.unlimited ? 'Unlimited' : 
                     `${subscription?.usage?.aiSearches?.current || 0} / ${subscription?.usage?.aiSearches?.limit || 0}`}
                  </Text>
                </InlineStack>
                
                {!subscription?.usage?.aiSearches?.unlimited && (
                  <ProgressBar 
                    progress={getUsagePercentage()} 
                    tone={getUsagePercentage() > 80 ? 'critical' : getUsagePercentage() > 60 ? 'attention' : 'success'}
                  />
                )}
              </BlockStack>

              {/* Conversations */}
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="p">Conversations</Text>
                  <Text as="p" variant="bodySm">
                    {subscription?.usage?.conversations?.enabled ? 
                     `${subscription?.usage?.conversations?.current || 0} messages` : 
                     'Not available'}
                  </Text>
                </InlineStack>
              </BlockStack>

              <Divider />
              
              <Text as="p" variant="bodySm" tone="subdued">
                Usage resets on the first of each month
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Available Plans */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">Available Plans</Text>
              
              <Grid columns={{ sm: 1, md: 2, lg: 4 }}>
                {Object.entries(planConfigs).map(([planType, config]: [string, any]) => (
                  <Card key={planType} subdued={subscription?.subscription?.plan_type === planType}>
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text variant="headingMd" as="h3">{config.displayName}</Text>
                        {getBadgeStatus(planType) && (
                          <Badge status={getBadgeStatus(planType)}>
                            Current
                          </Badge>
                        )}
                      </InlineStack>
                      
                      <Text variant="headingLg" as="h4" tone={config.price === 0 ? 'success' : 'emphasis'}>
                        {config.price === 0 ? 'Free' : `${formatPrice(config.price)}/mo`}
                      </Text>
                      
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {config.description}
                      </Text>

                      <BlockStack gap="100">
                        {getPlanFeatures(planType).map((feature: string, index: number) => (
                          <InlineStack key={index} gap="100" align="start">
                            <Icon source={CheckIcon} tone="success" />
                            <Text as="p" variant="bodySm">{feature}</Text>
                          </InlineStack>
                        ))}
                      </BlockStack>

                      {subscription?.subscription?.plan_type !== planType && (
                        <Box>
                          <Button 
                            variant={config.price === 0 ? 'secondary' : 'primary'}
                            fullWidth
                            onClick={() => handlePlanSelect(planType)}
                            loading={isSubmitting && selectedPlan === planType}
                          >
                            {config.price === 0 ? 'Downgrade to Free' : 'Upgrade Now'}
                          </Button>
                        </Box>
                      )}
                    </BlockStack>
                  </Card>
                ))}
              </Grid>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Upgrade Confirmation Modal */}
      <Modal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Confirm Plan Change"
        primaryAction={{
          content: 'Confirm',
          onAction: handleConfirmUpgrade,
          loading: isSubmitting,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowUpgradeModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            {selectedPlan && planConfigs[selectedPlan] && (
              <BlockStack gap="300">
                <Text as="p">
                  You are about to {planConfigs[selectedPlan].price === 0 ? 'downgrade to' : 'upgrade to'} the{' '}
                  <Text as="span" variant="bodyMd" fontWeight="bold">
                    {planConfigs[selectedPlan].displayName}
                  </Text>
                  {planConfigs[selectedPlan].price > 0 && (
                    <Text as="span">
                      {' '}for <Text as="span" variant="bodyMd" fontWeight="bold">
                        {formatPrice(planConfigs[selectedPlan].price)}/month
                      </Text>
                    </Text>
                  )}
                </Text>
                
                {planConfigs[selectedPlan].price > 0 && (
                  <Text as="p" tone="subdued">
                    You will be redirected to complete the billing setup with Shopify.
                  </Text>
                )}
                
                {planConfigs[selectedPlan].price === 0 && subscription?.subscription?.plan_type !== 'free' && (
                  <Banner status="attention">
                    <Text as="p">
                      Downgrading will cancel your current subscription and you will lose access to premium features immediately.
                    </Text>
                  </Banner>
                )}
              </BlockStack>
            )}
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
} 