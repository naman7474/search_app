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
  DataTable,
  Banner,
  Select,
  Spinner,
  EmptyState,
  Divider,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  return json({
    shop: session.shop,
    apiUrl: new URL(request.url).origin,
  });
};

export default function Analytics() {
  const { shop, apiUrl } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();

  // State
  const [analytics, setAnalytics] = useState<any>(null);
  const [indexingStats, setIndexingStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [refreshing, setRefreshing] = useState(false);

  const periodOptions = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 90 days', value: '90' },
  ];

  // Helper function to make authenticated requests
  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      return fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      console.error('Request error:', error);
      throw error;
    }
  };

  // Load analytics data
  const loadAnalytics = async (showSpinner = false) => {
    if (showSpinner) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await makeAuthenticatedRequest(`/api/analytics?type=overview&days=${selectedPeriod}`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data.search);
        setIndexingStats(data.data.indexing);
      } else {
        shopify.toast.show('Failed to load analytics data', { isError: true });
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      shopify.toast.show('Failed to load analytics data', { isError: true });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load initial data
  useEffect(() => {
    loadAnalytics();
  }, [selectedPeriod]);

  // Refresh data
  const handleRefresh = () => {
    loadAnalytics(true);
  };

  // Calculate performance metrics
  const getPerformanceMetrics = () => {
    if (!analytics) return null;

    const avgResults = analytics.avg_results || 0;
    const totalSearches = analytics.total_searches || 0;
    const avgResponseTime = analytics.avg_response_time_ms || 0;

    return {
      searchVolume: totalSearches,
      avgResults: Math.round(avgResults),
      avgResponseTime: Math.round(avgResponseTime),
      performanceScore: Math.min(100, Math.max(0, 100 - (avgResponseTime / 10))), // Simple performance score
    };
  };

  const performanceMetrics = getPerformanceMetrics();

  // Prepare analytics table data
  const topQueriesRows = analytics?.top_queries?.map((query: any, index: number) => [
    index + 1,
    query.query,
    query.count.toLocaleString(),
    Math.round(query.avg_results),
    query.avg_response_time_ms ? Math.round(query.avg_response_time_ms) + 'ms' : 'N/A',
  ]) || [];

  const productTypeRows = indexingStats?.products_by_type?.slice(0, 10).map((type: any, index: number) => [
    index + 1,
    type.type || 'Uncategorized',
    type.count.toLocaleString(),
    Math.round((type.count / (indexingStats?.total_products || 1)) * 100) + '%',
  ]) || [];

  // Get performance badge based on score
  const getPerformanceBadge = (score: number) => {
    if (score >= 80) return <Badge tone="success">Excellent</Badge>;
    if (score >= 60) return <Badge tone="info">Good</Badge>;
    if (score >= 40) return <Badge tone="warning">Fair</Badge>;
    return <Badge tone="critical">Needs Improvement</Badge>;
  };

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  if (loading && !analytics) {
    return (
      <Page>
        <TitleBar title="Analytics" />
        <Layout>
          <Layout.Section>
                         <Box paddingBlock="400">
               <InlineStack align="center">
                 <BlockStack gap="200" align="center">
                   <Spinner size="large" />
                   <Text as="p" variant="bodyMd" tone="subdued">
                     Loading analytics data...
                   </Text>
                 </BlockStack>
               </InlineStack>
             </Box>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page>
      <TitleBar title="Search Analytics" />
      <Layout>
        {/* Analytics Header */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="400" align="space-between">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Search Performance Dashboard
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Monitor search behavior, performance metrics, and customer insights
                  </Text>
                </BlockStack>
                <InlineStack gap="200">
                  <Select
                    label="Time period"
                    options={periodOptions}
                    value={selectedPeriod}
                    onChange={setSelectedPeriod}
                  />
                  <Button 
                    onClick={handleRefresh} 
                    loading={refreshing}
                    disabled={loading}
                  >
                    Refresh
                  </Button>
                </InlineStack>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {performanceMetrics && (
          <>
            {/* Key Performance Metrics */}
            <Layout.Section>
              <InlineStack gap="400">
                <Box width="25%">
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Total Searches
                      </Text>
                      <Text as="p" variant="headingLg">
                        {formatNumber(performanceMetrics.searchVolume)}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Last {selectedPeriod} days
                      </Text>
                    </BlockStack>
                  </Card>
                </Box>

                <Box width="25%">
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Avg Results Per Query
                      </Text>
                      <Text as="p" variant="headingLg">
                        {performanceMetrics.avgResults}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Products found on average
                      </Text>
                    </BlockStack>
                  </Card>
                </Box>

                <Box width="25%">
                  <Card>
                    <BlockStack gap="200">
                      <Text as="h3" variant="headingSm" tone="subdued">
                        Avg Response Time
                      </Text>
                      <Text as="p" variant="headingLg">
                        {performanceMetrics.avgResponseTime}ms
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Search processing time
                      </Text>
                    </BlockStack>
                  </Card>
                </Box>

                <Box width="25%">
                  <Card>
                    <BlockStack gap="200">
                      <InlineStack gap="200" align="space-between">
                        <Text as="h3" variant="headingSm" tone="subdued">
                          Performance Score
                        </Text>
                        {getPerformanceBadge(performanceMetrics.performanceScore)}
                      </InlineStack>
                      <Text as="p" variant="headingLg">
                        {Math.round(performanceMetrics.performanceScore)}%
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Overall system health
                      </Text>
                    </BlockStack>
                  </Card>
                </Box>
              </InlineStack>
            </Layout.Section>

            {/* Performance Insights */}
            <Layout.Section>
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingSm">
                    🎯 Performance Insights
                  </Text>
                  <InlineStack gap="400">
                    <Box width="50%">
                      <BlockStack gap="300">
                        <Text as="h4" variant="headingSm">
                          Search Quality
                        </Text>
                        <BlockStack gap="200">
                          <InlineStack gap="400" align="space-between">
                            <Text as="p" variant="bodyMd">Average Results:</Text>
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              {performanceMetrics.avgResults} products
                            </Text>
                          </InlineStack>
                          <InlineStack gap="400" align="space-between">
                            <Text as="p" variant="bodyMd">Search Coverage:</Text>
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              {Math.round((performanceMetrics.avgResults / (indexingStats?.total_products || 1)) * 100)}%
                            </Text>
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Higher average results indicate better search relevance and product coverage.
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    </Box>

                    <Box width="50%">
                      <BlockStack gap="300">
                        <Text as="h4" variant="headingSm">
                          Response Performance
                        </Text>
                        <BlockStack gap="200">
                          <InlineStack gap="400" align="space-between">
                            <Text as="p" variant="bodyMd">Response Time:</Text>
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              {performanceMetrics.avgResponseTime}ms
                            </Text>
                          </InlineStack>
                          <InlineStack gap="400" align="space-between">
                            <Text as="p" variant="bodyMd">Status:</Text>
                            {performanceMetrics.avgResponseTime < 500 ? (
                              <Badge tone="success">Fast</Badge>
                            ) : performanceMetrics.avgResponseTime < 1000 ? (
                              <Badge tone="warning">Moderate</Badge>
                            ) : (
                              <Badge tone="critical">Slow</Badge>
                            )}
                          </InlineStack>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Target: Under 500ms for optimal user experience.
                          </Text>
                        </BlockStack>
                      </BlockStack>
                    </Box>
                  </InlineStack>
                </BlockStack>
              </Card>
            </Layout.Section>
          </>
        )}

        {/* Top Search Queries */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="400" align="space-between">
                <Text as="h3" variant="headingSm">
                  🔍 Popular Search Queries
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Last {selectedPeriod} days
                </Text>
              </InlineStack>

              {topQueriesRows.length > 0 ? (
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'numeric', 'text']}
                  headings={['Rank', 'Query', 'Searches', 'Avg Results', 'Avg Response']}
                  rows={topQueriesRows}
                />
              ) : (
                <EmptyState
                  heading="No search data yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <Text as="p">
                    Search queries will appear here once customers start using the AI search feature.
                  </Text>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Product Catalog Analysis */}
        <Layout.Section>
          <InlineStack gap="400">
            {/* Product Statistics */}
            <Box width="50%">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    📦 Product Catalog Overview
                  </Text>
                  <BlockStack gap="200">
                    <InlineStack gap="400" align="space-between">
                      <Text as="p" variant="bodyMd">Total Products:</Text>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {indexingStats?.total_products?.toLocaleString() || 0}
                      </Text>
                    </InlineStack>
                    <InlineStack gap="400" align="space-between">
                      <Text as="p" variant="bodyMd">Total Variants:</Text>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        {indexingStats?.total_variants?.toLocaleString() || 0}
                      </Text>
                    </InlineStack>
                    <InlineStack gap="400" align="space-between">
                      <Text as="p" variant="bodyMd">Average Price:</Text>
                      <Text as="p" variant="bodyMd" fontWeight="semibold">
                        ${indexingStats?.avg_price ? Math.round(indexingStats.avg_price) : 0}
                      </Text>
                    </InlineStack>
                    <Divider />
                    <InlineStack gap="400" align="space-between">
                      <Text as="p" variant="bodyMd">Searchable Products:</Text>
                      <Badge tone="success">
                        {indexingStats?.total_products?.toLocaleString() || 0}
                      </Badge>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>

            {/* Quick Actions */}
            <Box width="50%">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    ⚡ Quick Actions
                  </Text>
                  <BlockStack gap="200">
                    <Button
                      url="/app/sync"
                      size="large"
                      fullWidth
                    >
                      📊 View Product Sync
                    </Button>
                    <Button
                      url="/app"
                      size="large"
                      fullWidth
                    >
                      🔍 Test Search
                    </Button>
                    <Button
                      url="/app/onboarding"
                      size="large"
                      fullWidth
                      variant="plain"
                    >
                      📖 Setup Guide
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>
          </InlineStack>
        </Layout.Section>

        {/* Product Type Distribution */}
        {productTypeRows.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  📊 Product Type Distribution
                </Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'text']}
                  headings={['Rank', 'Product Type', 'Count', 'Percentage']}
                  rows={productTypeRows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* Recommendations */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h3" variant="headingSm">
                💡 Optimization Recommendations
              </Text>
              
              <InlineStack gap="400">
                <Box width="33.33%">
                  <Box padding="300" background="bg-surface-success" borderRadius="200">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="semibold">
                        Search Performance
                      </Text>
                      <Text as="p" variant="bodySm">
                        {performanceMetrics && performanceMetrics.avgResponseTime < 500 
                          ? "✅ Excellent response times! Your search is performing well."
                          : "⚡ Consider optimizing query processing to improve response times."
                        }
                      </Text>
                    </BlockStack>
                  </Box>
                </Box>

                <Box width="33.33%">
                  <Box padding="300" background="bg-surface-info" borderRadius="200">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="semibold">
                        Search Coverage
                      </Text>
                      <Text as="p" variant="bodySm">
                        {performanceMetrics && performanceMetrics.avgResults > 0
                          ? "✅ Good search coverage. Customers are finding products."
                          : "📊 Monitor search results to ensure good product discovery."
                        }
                      </Text>
                    </BlockStack>
                  </Box>
                </Box>

                <Box width="33.33%">
                  <Box padding="300" background="bg-surface-warning" borderRadius="200">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="semibold">
                        Product Indexing
                      </Text>
                      <Text as="p" variant="bodySm">
                        {indexingStats?.total_products > 0
                          ? "✅ Products are indexed and searchable."
                          : "🔄 Sync your products to enable AI search functionality."
                        }
                      </Text>
                    </BlockStack>
                  </Box>
                </Box>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
} 