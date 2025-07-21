import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
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
  TextField,
  DataTable,
  Banner,
  Icon,
  Divider,
  Grid,
  ProgressBar,
  Tabs,
  CalloutCard,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { 
  SearchIcon, 
  SettingsIcon, 
  ChartHistogramGrowthIcon as AnalyticsIcon,
  RefreshIcon,
  StarIcon,
  ArrowUpIcon as TrendingUpIcon,
  ClockIcon,
  ProductIcon
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { unifiedSearchService, type UnifiedSearchResult } from "../lib/search/unified-search.server";
import type { ProductCandidate } from "../lib/search/search.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  return json({
    shop: session.shop,
    apiUrl: new URL(request.url).origin,
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const action = formData.get("action") as string;
  
  if (action === "search") {
    const query = formData.get("query") as string;
    
    if (!query) {
      return json({ success: false, error: "Missing query" }, { status: 400 });
    }

    try {
      console.log("Admin search initiated for query:", query);
      
      const searchResult = await unifiedSearchService.search({
        query,
        shop_domain: shop,
        limit: 10,
        offset: 0,
        strategy: 'hybrid',
      });
      
      console.log("Admin search completed, found", searchResult.products.length, "products");
      
      return json({
        success: true,
        data: searchResult,
      });

    } catch (error) {
      console.error("Admin search error:", error);
      return json({
        success: false,
        error: "Search failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 });
    }
  }
  
  return json({ success: false, error: "Invalid action" }, { status: 400 });
};

export default function Index() {
  const { shop, apiUrl } = useLoaderData<typeof loader>();
  const searchFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [quickStats, setQuickStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState(0);

  const isSearching = searchFetcher.state !== 'idle';
  const searchResults = (searchFetcher.data as any)?.success ? (searchFetcher.data as any).data.products || [] : [];
  const searchInfo = (searchFetcher.data as any)?.success ? (searchFetcher.data as any).data.query_info : null;

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

  // Load quick overview data
  useEffect(() => {
    const loadQuickStats = async () => {
      try {
        const response = await makeAuthenticatedRequest(`/api/analytics?type=overview&days=7`);
        const data = await response.json();
        if (data.success) {
          setQuickStats({
            search: data.data.search,
            indexing: data.data.indexing,
          });
        }
      } catch (error) {
        console.error('Failed to load quick stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadQuickStats();
  }, []);

  // Show toast on search completion
  useEffect(() => {
    if (searchFetcher.state === 'idle' && searchFetcher.data) {
      if ((searchFetcher.data as any).success) {
        const data = (searchFetcher.data as any).data;
        const message = `Found ${data.products.length} products in ${data.query_info.processing_time_ms}ms`;
        shopify.toast.show(message);
      } else {
        shopify.toast.show((searchFetcher.data as any).error || "Search failed", { isError: true });
      }
    }
  }, [searchFetcher.state, searchFetcher.data, shopify]);

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      shopify.toast.show("Please enter a search query", { isError: true });
      return;
    }
    
    console.log("Initiating search for:", searchQuery);
    
    const formData = new FormData();
    formData.append("action", "search");
    formData.append("query", searchQuery);
    searchFetcher.submit(formData, { method: "post" });
  };

  // Handle search form submission
  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    handleSearch();
  };

  // Prepare search results for display
  const searchResultRows = searchResults.slice(0, 5).map((product: ProductCandidate, index: number) => [
    index + 1,
    product.title,
    product.vendor || 'N/A',
    product.price_min ? `$${product.price_min}` : 'N/A',
    product.available ? <Badge tone="success">Available</Badge> : <Badge tone="critical">Unavailable</Badge>,
    product.similarity_score ? Math.round(product.similarity_score * 100) + '%' : 'N/A',
  ]);

  const tabs = [
    {
      id: 'search-testing',
      content: '🔍 Search Testing',
      panelID: 'search-testing-panel',
    },
    {
      id: 'quick-insights',
      content: '📊 Quick Insights',
      panelID: 'quick-insights-panel',
    },
  ];

  return (
    <Page>
      <TitleBar title="AI Search Dashboard" />
      <Layout>
        {/* Hero Section */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
              <CalloutCard
                title="🧠 AI-Powered Search Dashboard"
                illustration="https://cdn.shopify.com/s/files/1/0583/6465/7734/files/tag.svg"
                primaryAction={{
                  content: 'View Setup Guide',
                  url: '/app/onboarding',
                }}
                secondaryAction={{
                  content: 'View Analytics',
                  url: '/app/analytics',
                }}
              >
                <Text as="p">
                  Transform your store's search experience with AI-powered natural language understanding. 
                  Get instant insights into customer behavior and product discovery patterns.
                </Text>
              </CalloutCard>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Performance Overview */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="200" align="space-between">
                    <Icon source={SearchIcon} tone="base" />
                    <Badge tone="success">Active</Badge>
                  </InlineStack>
                  <Text as="h3" variant="headingMd">
                    {loading ? '...' : quickStats?.search?.total_searches?.toLocaleString() || '0'}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Total Searches (7 days)
                  </Text>
                  {quickStats?.search?.total_searches > 0 && (
                    <ProgressBar progress={Math.min(100, (quickStats.search.total_searches / 1000) * 100)} size="small" tone="success" />
                  )}
                </BlockStack>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="200" align="space-between">
                    <Icon source={ProductIcon} tone="base" />
                    <Badge tone={quickStats?.indexing?.total_products > 0 ? "success" : "warning"}>
                      {quickStats?.indexing?.total_products > 0 ? "Synced" : "Pending"}
                    </Badge>
                  </InlineStack>
                  <Text as="h3" variant="headingMd">
                    {loading ? '...' : quickStats?.indexing?.total_products?.toLocaleString() || '0'}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Products Indexed
                  </Text>
                  {quickStats?.indexing?.total_products > 0 && (
                    <ProgressBar progress={100} size="small" tone="success" />
                  )}
                </BlockStack>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="200" align="space-between">
                    <Icon source={ClockIcon} tone="base" />
                    <Badge tone="info">Performance</Badge>
                  </InlineStack>
                  <Text as="h3" variant="headingMd">
                    {loading ? '...' : 
                     quickStats?.search?.avg_response_time_ms ? 
                     Math.round(quickStats.search.avg_response_time_ms) + 'ms' : 
                     'N/A'
                    }
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Avg Response Time
                  </Text>
                  {quickStats?.search?.avg_response_time_ms && (
                    <ProgressBar 
                      progress={Math.max(0, 100 - (quickStats.search.avg_response_time_ms / 10))} 
                      size="small" 
                      tone={quickStats.search.avg_response_time_ms < 500 ? "success" : "warning"} 
                    />
                  )}
                </BlockStack>
              </Card>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
              <Card>
                <BlockStack gap="300">
                  <InlineStack gap="200" align="space-between">
                    <Icon source={TrendingUpIcon} tone="base" />
                    <Badge tone="success">Healthy</Badge>
                  </InlineStack>
                  <Text as="h3" variant="headingMd">
                    {loading ? '...' : 
                     quickStats?.search?.avg_response_time_ms ? 
                     Math.min(100, Math.max(0, 100 - (quickStats.search.avg_response_time_ms / 10))) + '%' : 
                     'N/A'
                    }
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    System Health Score
                  </Text>
                  {quickStats?.search?.avg_response_time_ms && (
                    <ProgressBar 
                      progress={Math.min(100, Math.max(0, 100 - (quickStats.search.avg_response_time_ms / 10)))} 
                      size="small" 
                      tone="success" 
                    />
                  )}
                </BlockStack>
              </Card>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* Main Content Tabs */}
        <Layout.Section>
          <Card>
            <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
              <div id="search-testing-panel" style={{ display: selectedTab === 0 ? 'block' : 'none' }}>
                <Card>
                  <BlockStack gap="400">
                    <InlineStack gap="200" align="space-between">
                      <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                          🔍 Test AI Search Intelligence
                        </Text>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Experience how AI understands natural language and finds relevant products using semantic search
                        </Text>
                      </BlockStack>
                      <InlineStack gap="200">
                        <Icon source={SearchIcon} tone="base" />
                        <Icon source={StarIcon} tone="warning" />
                      </InlineStack>
                    </InlineStack>
                    
                    {/* Search Form */}
                    <form onSubmit={handleSearchSubmit}>
                      <InlineStack gap="200">
                        <TextField
                          label=""
                          value={searchQuery}
                          onChange={setSearchQuery}
                          placeholder='Try "red dress under $100" or "gaming laptop for students"'
                          autoComplete="off"
                          disabled={isSearching}
                        />
                        <Button 
                          submit
                          loading={isSearching}
                          variant="primary"
                        >
                          Search
                        </Button>
                      </InlineStack>
                    </form>

                    {/* Search Results */}
                    {searchResultRows.length > 0 && (
                      <BlockStack gap="300">
                        <Divider />
                        <InlineStack gap="200" align="space-between">
                          <Text as="h4" variant="headingSm">
                            🎯 Search Results ({searchResults.length})
                          </Text>
                          {searchInfo && (
                            <Badge tone="success">
                              {searchInfo.processing_time_ms}ms response
                            </Badge>
                          )}
                        </InlineStack>
                        
                        <Card background="bg-surface-secondary">
                          <DataTable
                            columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                            headings={['Rank', 'Product Name', 'Brand', 'Price', 'Availability', 'AI Relevance']}
                            rows={searchResultRows}
                          />
                        </Card>
                        
                        {searchInfo && (
                          <InlineStack gap="400" align="space-between">
                            <InlineStack gap="200">
                              <Icon source={AnalyticsIcon} tone="base" />
                              <Text as="p" variant="bodySm" tone="subdued">
                                Found {searchInfo.total_count} total results
                              </Text>
                            </InlineStack>
                            {searchResults.length > 5 && (
                              <Text as="p" variant="bodySm" tone="subdued">
                                Displaying top 5 most relevant matches
                              </Text>
                            )}
                          </InlineStack>
                        )}
                      </BlockStack>
                    )}
                    
                    {searchFetcher.state === 'idle' && searchFetcher.data && !(searchFetcher.data as any).success && (
                      <Banner tone="critical">
                        <Text as="p">
                          {(searchFetcher.data as any).error || 'Search failed. Please check your configuration and try again.'}
                        </Text>
                      </Banner>
                    )}

                    {/* AI-Powered Search Examples */}
                    <BlockStack gap="300">
                      <Divider />
                      <InlineStack gap="200" align="space-between">
                        <Text as="h4" variant="headingSm">
                          🤖 AI-Powered Query Examples
                        </Text>
                        <Badge tone="info">Natural Language</Badge>
                      </InlineStack>
                      
                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                          <Card background="bg-surface-secondary">
                            <BlockStack gap="200">
                              <Text as="p" variant="headingSm" fontWeight="semibold">Intent-Based</Text>
                              <InlineStack gap="100" wrap={true}>
                                {[
                                  "red dress under $100",
                                  "affordable running shoes"
                                ].map((example, index) => (
                                  <Button 
                                    key={index}
                                    variant="plain"
                                    size="micro"
                                    onClick={() => setSearchQuery(example)}
                                  >
                                    "{example}"
                                  </Button>
                                ))}
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>
                        
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                          <Card background="bg-surface-secondary">
                            <BlockStack gap="200">
                              <Text as="p" variant="headingSm" fontWeight="semibold">Contextual</Text>
                              <InlineStack gap="100" wrap={true}>
                                {[
                                  "gaming laptop for students",
                                  "gifts for mom"
                                ].map((example, index) => (
                                  <Button 
                                    key={index}
                                    variant="plain"
                                    size="micro"
                                    onClick={() => setSearchQuery(example)}
                                  >
                                    "{example}"
                                  </Button>
                                ))}
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>
                        
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                          <Card background="bg-surface-secondary">
                            <BlockStack gap="200">
                              <Text as="p" variant="headingSm" fontWeight="semibold">Semantic</Text>
                              <InlineStack gap="100" wrap={true}>
                                {[
                                  "sustainable clothing",
                                  "eco-friendly products"
                                ].map((example, index) => (
                                  <Button 
                                    key={index}
                                    variant="plain"
                                    size="micro"
                                    onClick={() => setSearchQuery(example)}
                                  >
                                    "{example}"
                                  </Button>
                                ))}
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>
                        
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                          <Card background="bg-surface-secondary">
                            <BlockStack gap="200">
                              <Text as="p" variant="headingSm" fontWeight="semibold">Technical</Text>
                              <InlineStack gap="100" wrap={true}>
                                {[
                                  "wireless bluetooth headphones",
                                  "waterproof phone case"
                                ].map((example, index) => (
                                  <Button 
                                    key={index}
                                    variant="plain"
                                    size="micro"
                                    onClick={() => setSearchQuery(example)}
                                  >
                                    "{example}"
                                  </Button>
                                ))}
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>
                      </Grid>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </div>
              
              <div id="quick-insights-panel" style={{ display: selectedTab === 1 ? 'block' : 'none' }}>
                <Card>
                  <BlockStack gap="400">
                    <InlineStack gap="200" align="space-between">
                      <BlockStack gap="100">
                        <Text as="h2" variant="headingMd">
                          📊 Performance Insights
                        </Text>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Real-time system metrics and AI performance analytics
                        </Text>
                      </BlockStack>
                      <Button 
                        icon={RefreshIcon}
                        onClick={() => window.location.reload()}
                        variant="plain"
                      >
                        Refresh Data
                      </Button>
                    </InlineStack>
                    
                    {loading ? (
                      <EmptyState
                        heading="Loading analytics data..."
                        image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      >
                        <Text as="p">Please wait while we gather your search performance metrics.</Text>
                      </EmptyState>
                    ) : (
                      <Grid>
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 6, xl: 6}}>
                          <Card background="bg-surface-success">
                            <BlockStack gap="300">
                              <InlineStack gap="200" align="space-between">
                                <Icon source={SearchIcon} tone="success" />
                                <Badge tone="success">Active</Badge>
                              </InlineStack>
                              <Text as="h3" variant="headingLg">
                                AI Search Performance
                              </Text>
                              <BlockStack gap="200">
                                <InlineStack gap="400" align="space-between">
                                  <Text as="p" variant="bodyMd">Response Quality:</Text>
                                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                                    {quickStats?.search?.avg_response_time_ms ? 
                                     (quickStats.search.avg_response_time_ms < 500 ? 'Excellent' : 
                                      quickStats.search.avg_response_time_ms < 1000 ? 'Good' : 'Needs Improvement') 
                                     : 'N/A'}
                                  </Text>
                                </InlineStack>
                                <InlineStack gap="400" align="space-between">
                                  <Text as="p" variant="bodyMd">AI Understanding:</Text>
                                  <Text as="p" variant="bodyMd" fontWeight="semibold">
                                    Advanced Semantic Search
                                  </Text>
                                </InlineStack>
                                <InlineStack gap="400" align="space-between">
                                  <Text as="p" variant="bodyMd">Search Method:</Text>
                                  <Badge tone="info">Hybrid Vector + Keyword</Badge>
                                </InlineStack>
                              </BlockStack>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>
                        
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                          <Card background="bg-surface-info">
                            <BlockStack gap="300">
                              <Icon source={ProductIcon} tone="info" />
                              <Text as="h4" variant="headingSm">Product Coverage</Text>
                              <Text as="h3" variant="headingLg">
                                {quickStats?.indexing?.total_products?.toLocaleString() || '0'}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Products searchable with AI
                              </Text>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>
                        
                        <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                          <Card background="bg-surface-warning">
                            <BlockStack gap="300">
                              <Icon source={TrendingUpIcon} tone="warning" />
                              <Text as="h4" variant="headingSm">Usage Analytics</Text>
                              <Text as="h3" variant="headingLg">
                                {quickStats?.search?.total_searches?.toLocaleString() || '0'}
                              </Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Searches in last 7 days
                              </Text>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>
                      </Grid>
                    )}
                  </BlockStack>
                </Card>
              </div>
            </Tabs>
          </Card>
        </Layout.Section>

        {/* Quick Actions */}
        <Layout.Section>
          <Grid>
            <Grid.Cell columnSpan={{xs: 6, sm: 2, md: 2, lg: 2, xl: 2}}>
              <CalloutCard
                title="🚀 Setup Guide"
                illustration="https://cdn.shopify.com/s/files/1/0583/6465/7734/files/setup.svg"
                primaryAction={{
                  content: 'Get Started',
                  url: '/app/onboarding',
                }}
              >
                <Text as="p">
                  Complete AI search setup with our guided configuration wizard.
                </Text>
              </CalloutCard>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{xs: 6, sm: 2, md: 2, lg: 2, xl: 2}}>
              <CalloutCard
                title="🔄 Product Sync"
                illustration="https://cdn.shopify.com/s/files/1/0583/6465/7734/files/sync.svg"
                primaryAction={{
                  content: 'Manage Sync',
                  url: '/app/sync',
                }}
              >
                <Text as="p">
                  Sync your product catalog with AI-powered indexing and search optimization.
                </Text>
              </CalloutCard>
            </Grid.Cell>
            
            <Grid.Cell columnSpan={{xs: 6, sm: 2, md: 2, lg: 2, xl: 2}}>
              <CalloutCard
                title="📈 Deep Analytics"
                illustration="https://cdn.shopify.com/s/files/1/0583/6465/7734/files/analytics.svg"
                primaryAction={{
                  content: 'View Reports',
                  url: '/app/analytics',
                }}
              >
                <Text as="p">
                  Analyze search patterns, performance metrics, and customer behavior insights.
                </Text>
              </CalloutCard>
            </Grid.Cell>
          </Grid>
        </Layout.Section>

        {/* System Status */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                ⚡ System Status & Health
              </Text>
              <Grid>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <BlockStack gap="100" inlineAlign="center">
                    <Badge tone="success">Active</Badge>
                    <Text as="p" variant="bodySm">AI Search Engine</Text>
                  </BlockStack>
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <BlockStack gap="100" inlineAlign="center">
                    <Badge tone={quickStats?.indexing?.total_products > 0 ? "success" : "warning"}>
                      {quickStats?.indexing?.total_products > 0 ? "Synced" : "Pending"}
                    </Badge>
                    <Text as="p" variant="bodySm">Product Index</Text>
                  </BlockStack>
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <BlockStack gap="100" inlineAlign="center">
                    <Badge tone="success">Connected</Badge>
                    <Text as="p" variant="bodySm">Vector Database</Text>
                  </BlockStack>
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <BlockStack gap="100" inlineAlign="center">
                    <Badge tone="success">Healthy</Badge>
                    <Text as="p" variant="bodySm">Performance</Text>
                  </BlockStack>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Quick Tips */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                💡 Pro Tips for AI Search Success
              </Text>
              <Grid>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <Box padding="300" background="bg-surface-info" borderRadius="200">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="semibold">
                        🔍 Natural Language Testing
                      </Text>
                      <Text as="p" variant="bodySm">
                        Test how customers naturally describe products they're looking for. AI understands intent, not just keywords.
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <Box padding="300" background="bg-surface-success" borderRadius="200">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="semibold">
                        📊 Monitor Performance
                      </Text>
                      <Text as="p" variant="bodySm">
                        Keep response times under 500ms for optimal user experience. Monitor popular queries for insights.
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
                <Grid.Cell columnSpan={{xs: 6, sm: 3, md: 3, lg: 3, xl: 3}}>
                  <Box padding="300" background="bg-surface-warning" borderRadius="200">
                    <BlockStack gap="200">
                      <Text as="h4" variant="headingSm" fontWeight="semibold">
                        🔄 Keep Products Synced
                      </Text>
                      <Text as="p" variant="bodySm">
                        Regular product sync ensures AI has the latest information for accurate search results.
                      </Text>
                    </BlockStack>
                  </Box>
                </Grid.Cell>
              </Grid>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}