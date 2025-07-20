import { useEffect, useState } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
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
  List,
  Banner,
  Icon,
  Grid,
  LegacyCard,
  ResourceList,
  ResourceItem,
  Avatar,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { 
  CheckIcon, 
  SearchIcon, 
  SettingsIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  return json({
    shop: session.shop,
    apiUrl: new URL(request.url).origin,
  });
};

export default function Onboarding() {
  const { shop, apiUrl } = useLoaderData<typeof loader>();
  const [currentStep, setCurrentStep] = useState(1);

  const setupSteps = [
    {
      id: 1,
      title: "Environment Setup",
      description: "Configure your app with necessary API keys and database connection",
      status: "completed",
      details: [
        "✅ Shopify App Configuration",
        "✅ Supabase Database Setup",
        "✅ AI API Keys Configuration"
      ]
    },
    {
      id: 2,
      title: "Product Sync",
      description: "Index your products for AI-powered search",
      status: "pending",
      details: [
        "Sync your product catalog",
        "Generate AI embeddings",
        "Configure search indexes"
      ]
    },
    {
      id: 3,
      title: "Search Integration",
      description: "Add search components to your storefront",
      status: "pending",
      details: [
        "Install theme extension",
        "Configure search UI",
        "Test search functionality"
      ]
    },
    {
      id: 4,
      title: "Analytics & Monitoring",
      description: "Monitor search performance and customer behavior",
      status: "pending",
      details: [
        "Review search analytics",
        "Monitor performance metrics",
        "Optimize search results"
      ]
    }
  ];

  const features = [
    {
      icon: SearchIcon,
      title: "AI Query Understanding",
      description: "Understands natural language queries like 'red dress under $100' and extracts meaningful intent and filters."
    },
    {
      icon: SearchIcon,
      title: "Semantic Search",
      description: "Vector-based search that finds products by meaning, not just keywords. Handles synonyms and related terms."
    },
    {
      icon: SearchIcon,
      title: "Smart Ranking",
      description: "AI-powered result ranking that considers relevance, availability, and customer preferences."
    },
    {
      icon: SettingsIcon,
      title: "Real-time Analytics",
      description: "Monitor search performance, popular queries, and conversion rates in real-time."
    }
  ];

  const quickStartExamples = [
    "red dress under $100",
    "gaming laptop for students", 
    "cozy reading chair",
    "gifts for 4 year old boy",
    "sustainable clothing brands",
    "wireless headphones with good battery"
  ];

  return (
    <Page>
      <TitleBar title="Welcome to AI Search" />
      <Layout>
        {/* Welcome Banner */}
        <Layout.Section>
          <Banner title="🚀 Welcome to AI-Powered Search!" tone="success">
            <Text as="p">
              Transform your store's search experience with advanced AI technology. 
              This guide will help you set up and optimize your intelligent search system.
            </Text>
          </Banner>
        </Layout.Section>

        {/* Quick Overview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                What You'll Get
              </Text>
              <Grid>
                {features.map((feature, index) => (
                  <Grid.Cell key={index} columnSpan={{ xs: 6, sm: 3, md: 3, lg: 3, xl: 3 }}>
                    <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="200">
                        <Icon source={feature.icon} tone="base" />
                        <Text as="h3" variant="headingSm" fontWeight="semibold">
                          {feature.title}
                        </Text>
                        <Text as="p" tone="subdued" variant="bodySm">
                          {feature.description}
                        </Text>
                      </BlockStack>
                    </Box>
                  </Grid.Cell>
                ))}
              </Grid>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Setup Steps */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Setup Progress
              </Text>
              <ResourceList
                resourceName={{ singular: 'step', plural: 'steps' }}
                items={setupSteps}
                renderItem={(step) => {
                  const { id, title, description, status, details } = step;
                  const isCompleted = status === 'completed';
                  const isCurrent = id === currentStep;
                  
                  return (
                    <ResourceItem id={id.toString()} accessibilityLabel={`Setup step ${id}`} onClick={() => setCurrentStep(id)}>
                      <InlineStack gap="400" align="start">
                        <Box>
                          <Avatar 
                            initials={id.toString()}
                          />
                        </Box>
                        <BlockStack gap="200" inlineAlign="start">
                          <InlineStack gap="200" align="start">
                            <Text as="h3" variant="headingSm" fontWeight="semibold">
                              {title}
                            </Text>
                            <Badge 
                              tone={isCompleted ? "success" : isCurrent ? "warning" : "info"}
                              size="small"
                            >
                              {isCompleted ? "Complete" : isCurrent ? "Current" : "Pending"}
                            </Badge>
                          </InlineStack>
                          <Text as="p" variant="bodyMd" tone="subdued">
                            {description}
                          </Text>
                          <List type="bullet">
                            {details.map((detail, index) => (
                              <List.Item key={index}>{detail}</List.Item>
                            ))}
                          </List>
                        </BlockStack>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <InlineStack gap="400">
            {/* Next Steps */}
            <Box width="50%">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    🎯 Next Steps
                  </Text>
                  <BlockStack gap="300">
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                                             <InlineStack gap="200" align="start">
                         <Icon source={SearchIcon} tone="base" />
                         <BlockStack gap="100">
                           <Text as="h3" variant="headingSm" fontWeight="semibold">
                             1. Sync Your Products
                           </Text>
                           <Text as="p" variant="bodySm" tone="subdued">
                             Go to the Sync page to index your product catalog and enable AI search.
                           </Text>
                         </BlockStack>
                       </InlineStack>
                    </Box>
                    
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack gap="200" align="start">
                        <Icon source={SearchIcon} tone="base" />
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingSm" fontWeight="semibold">
                            2. Test AI Search
                          </Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Try natural language queries on the main dashboard to see the AI in action.
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                    
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                                             <InlineStack gap="200" align="start">
                         <Icon source={SettingsIcon} tone="base" />
                         <BlockStack gap="100">
                           <Text as="h3" variant="headingSm" fontWeight="semibold">
                             3. Monitor Analytics
                           </Text>
                           <Text as="p" variant="bodySm" tone="subdued">
                             Check the Analytics page to track performance and optimize results.
                           </Text>
                         </BlockStack>
                       </InlineStack>
                    </Box>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>

            {/* Quick Test */}
            <Box width="50%">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">
                    🔍 Try These Queries
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Once your products are synced, try these natural language searches:
                  </Text>
                  <BlockStack gap="200">
                    {quickStartExamples.map((query, index) => (
                      <Box key={index} padding="200" background="bg-surface-secondary" borderRadius="100">
                        <Text as="p" variant="bodySm" fontWeight="medium">
                          "{query}"
                        </Text>
                      </Box>
                    ))}
                  </BlockStack>
                  <Divider />
                  <Text as="p" variant="bodySm" tone="subdued">
                    💡 <strong>Tip:</strong> The AI understands intent, price ranges, demographics, and product attributes naturally.
                  </Text>
                </BlockStack>
              </Card>
            </Box>
          </InlineStack>
        </Layout.Section>

        {/* Resources */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                📚 Resources & Support
              </Text>
              <InlineStack gap="400">
                <Box width="33.33%">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      📖 Documentation
                    </Text>
                    <List type="bullet">
                      <List.Item>Setup Guide (setup.md)</List.Item>
                      <List.Item>API Documentation</List.Item>
                      <List.Item>Search Best Practices</List.Item>
                      <List.Item>Troubleshooting Guide</List.Item>
                    </List>
                  </BlockStack>
                </Box>
                
                <Box width="33.33%">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      🔧 Technical Details
                    </Text>
                    <List type="bullet">
                      <List.Item>Google Gemini AI Integration</List.Item>
                      <List.Item>Supabase Vector Database</List.Item>
                      <List.Item>Real-time Product Sync</List.Item>
                      <List.Item>Performance Analytics</List.Item>
                    </List>
                  </BlockStack>
                </Box>
                
                <Box width="33.33%">
                  <BlockStack gap="200">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      🚨 Troubleshooting
                    </Text>
                    <List type="bullet">
                      <List.Item>No search results → Check sync</List.Item>
                      <List.Item>Slow performance → Review API limits</List.Item>
                      <List.Item>Missing products → Verify webhooks</List.Item>
                      <List.Item>Errors → Check app logs</List.Item>
                    </List>
                  </BlockStack>
                </Box>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Action Buttons */}
        <Layout.Section>
          <InlineStack gap="300" align="center">
            <Button 
              variant="primary" 
              size="large"
              url="/app/sync"
            >
              Start Product Sync
            </Button>
            <Button 
              size="large"
              url="/app"
            >
              Go to Dashboard
            </Button>
            <Button 
              size="large"
              url="/app/analytics"
              variant="plain"
            >
              View Analytics
            </Button>
          </InlineStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 