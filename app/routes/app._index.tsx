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
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { SearchIcon, SettingsIcon } from "@shopify/polaris-icons";
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

  return (
    <Page>
      <TitleBar title="AI Search Dashboard" />
      <Layout>
        {/* Welcome Section */}
        <Layout.Section>
          <Banner title="🧠 AI-Powered Search Dashboard" tone="success">
            <Text as="p">
              Welcome to your intelligent search system! Monitor performance, manage syncing, and optimize your search experience.
            </Text>
          </Banner>
        </Layout.Section>

        {/* Quick Overview Cards */}
        <Layout.Section>
          <InlineStack gap="400">
            {/* Search Testing Card */}
            <Box width="60%">
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="200" align="space-between">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">
                        🔍 Test AI Search
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        Try natural language queries to see how AI understands customer intent
                      </Text>
                    </BlockStack>
                    <Icon source={SearchIcon} tone="base" />
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

                  {/* Quick Search Results */}
                  {searchResultRows.length > 0 && (
                    <BlockStack gap="200">
                      <Divider />
                      <Text as="h4" variant="headingSm">
                        Search Results ({searchResults.length})
                      </Text>
                      <DataTable
                        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                        headings={['#', 'Product', 'Vendor', 'Price', 'Status', 'Relevance']}
                        rows={searchResultRows}
                      />
                      {searchInfo && (
                        <InlineStack gap="400" align="space-between">
                          <Text as="p" variant="bodySm" tone="subdued">
                            Found {searchInfo.total_count} results in {searchInfo.processing_time_ms}ms
                          </Text>
                          {searchResults.length > 5 && (
                            <Text as="p" variant="bodySm" tone="subdued">
                              Showing top 5 results
                            </Text>
                          )}
                        </InlineStack>
                      )}
                    </BlockStack>
                  )}

                  {/* Search Examples */}
                  <BlockStack gap="200">
                    <Divider />
                    <Text as="h4" variant="headingSm">
                      💡 Try These Examples
                    </Text>
                    <InlineStack gap="200" wrap={true}>
                      {[
                        "red dress under $100",
                        "gaming laptop for students", 
                        "sustainable clothing",
                        "wireless headphones"
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
                </BlockStack>
              </Card>
            </Box>

            {/* Quick Stats Card */}
            <Box width="40%">
              <Card>
                <BlockStack gap="400">
                  <InlineStack gap="200" align="space-between">
                    <BlockStack gap="100">
                      <Text as="h2" variant="headingMd">
                        📊 Quick Stats
                      </Text>
                      <Text as="p" variant="bodyMd" tone="subdued">
                        System overview and performance
                      </Text>
                    </BlockStack>
                    <Icon source={SettingsIcon} tone="base" />
                  </InlineStack>
                  
                  <BlockStack gap="300">
                    {/* Product Stats */}
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack gap="400" align="space-between">
                        <Text as="p" variant="bodyMd">Products Indexed:</Text>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {loading ? '...' : quickStats?.indexing?.total_products?.toLocaleString() || 0}
                        </Text>
                      </InlineStack>
                    </Box>

                    {/* Search Stats */}
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack gap="400" align="space-between">
                        <Text as="p" variant="bodyMd">Recent Searches:</Text>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {loading ? '...' : quickStats?.search?.total_searches || 0}
                        </Text>
                      </InlineStack>
                    </Box>

                    {/* Performance */}
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack gap="400" align="space-between">
                        <Text as="p" variant="bodyMd">Avg Response:</Text>
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {loading ? '...' : 
                           quickStats?.search?.avg_response_time_ms ? 
                           Math.round(quickStats.search.avg_response_time_ms) + 'ms' : 
                           'N/A'
                          }
                        </Text>
                      </InlineStack>
                    </Box>
                  </BlockStack>
                </BlockStack>
              </Card>
            </Box>
          </InlineStack>
        </Layout.Section>

        {/* Action Cards */}
        <Layout.Section>
          <InlineStack gap="400">
            {/* Onboarding Card */}
            <Box width="33.33%">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    🚀 Getting Started
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    New to AI Search? Get guided through setup, configuration, and optimization.
                  </Text>
                  <Button
                    url="/app/onboarding"
                    variant="primary"
                    fullWidth
                  >
                    Setup Guide
                  </Button>
                </BlockStack>
              </Card>
            </Box>

            {/* Sync Card */}
            <Box width="33.33%">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    🔄 Product Sync
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Manage product synchronization, view indexed products, and monitor sync status.
                  </Text>
                  <Button
                    url="/app/sync"
                    fullWidth
                  >
                    Manage Sync
                  </Button>
                </BlockStack>
              </Card>
            </Box>

            {/* Analytics Card */}
            <Box width="33.33%">
              <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">
                    📈 Analytics
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Deep dive into search performance, popular queries, and customer insights.
                  </Text>
                  <Button
                    url="/app/analytics"
                    fullWidth
                  >
                    View Analytics
                  </Button>
                </BlockStack>
              </Card>
            </Box>
          </InlineStack>
        </Layout.Section>

        {/* System Status */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                ⚡ System Status
              </Text>
              <InlineStack gap="400">
                <Box width="25%">
                  <BlockStack gap="100" inlineAlign="center">
                    <Badge tone="success">Active</Badge>
                    <Text as="p" variant="bodySm">AI Search</Text>
                  </BlockStack>
                </Box>
                <Box width="25%">
                  <BlockStack gap="100" inlineAlign="center">
                    <Badge tone={quickStats?.indexing?.total_products > 0 ? "success" : "warning"}>
                      {quickStats?.indexing?.total_products > 0 ? "Synced" : "Pending"}
                    </Badge>
                    <Text as="p" variant="bodySm">Product Index</Text>
                  </BlockStack>
                </Box>
                <Box width="25%">
                  <BlockStack gap="100" inlineAlign="center">
                    <Badge tone="success">Connected</Badge>
                    <Text as="p" variant="bodySm">Vector DB</Text>
                  </BlockStack>
                </Box>
                <Box width="25%">
                  <BlockStack gap="100" inlineAlign="center">
                    <Badge tone="success">Healthy</Badge>
                    <Text as="p" variant="bodySm">Performance</Text>
                  </BlockStack>
                </Box>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Quick Tips */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                💡 Quick Tips
              </Text>
              <InlineStack gap="400">
                <Box width="50%">
                  <Text as="p" variant="bodyMd">
                    <strong>🔍 Search Testing:</strong> Use natural language queries to see how AI interprets customer intent and finds relevant products.
                  </Text>
                </Box>
                <Box width="50%">
                  <Text as="p" variant="bodyMd">
                    <strong>📊 Monitor Analytics:</strong> Track popular queries and search performance to optimize your product catalog and descriptions.
                  </Text>
                </Box>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}