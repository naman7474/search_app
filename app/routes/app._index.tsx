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
  ProgressBar,
  TextField,
  DataTable,
  Banner,
  Spinner,
  Modal,
  TextContainer,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { searchProducts, type SearchResult, type ProductCandidate } from "../lib/search/search.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  
  return {
    shop: session.shop,
    // Use the origin of the incoming request so that the client always makes
    // requests back to the same domain the app is served from. This works both
    // in development (Shopify CLI tunnel / localhost) and production.
    apiUrl: new URL(request.url).origin,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { shop } = session;

  const formData = await request.formData();
  const query = formData.get("query") as string;
  
  if (!query) {
    return json({ success: false, error: "Missing query" }, { status: 400 });
  }

  try {
    const searchResult = await searchProducts({
      query,
      shop_domain: shop,
      limit: 20,
      offset: 0,
    });
    
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
};

export default function Index() {
  const { shop } = useLoaderData<typeof loader>();
  const searchFetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [indexingStats, setIndexingStats] = useState<any>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);

  const isSearching = searchFetcher.state !== 'idle';
  const searchResults = (searchFetcher.data?.success && searchFetcher.data.data.products) || [];

  // Load initial data
  useEffect(() => {
    loadAnalytics();
  }, []);

  // Show toast on search completion
  useEffect(() => {
    if (searchFetcher.state === 'idle' && searchFetcher.data) {
      if (searchFetcher.data.success) {
        shopify.toast.show(`Found ${searchFetcher.data.data.products.length} products in ${searchFetcher.data.data.query_info.processing_time_ms}ms`);
      } else {
        shopify.toast.show(searchFetcher.data.error || "Search failed", { isError: true });
      }
    }
  }, [searchFetcher.state, searchFetcher.data, shopify]);

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?type=overview`);
      const data = await response.json();
      if (data.success) {
        setAnalytics(data.data.search);
        setIndexingStats(data.data.indexing);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    const formData = new FormData();
    formData.append("query", searchQuery);
    searchFetcher.submit(formData, { method: "post" });
  };

  // Handle product sync
  const handleSync = async () => {
    console.log("SYNC_BUTTON_CLICKED: Attempting to start product sync.");
    setShowSyncModal(false);
    try {
      // Use a relative URL which is more reliable than a constructed one.
      const response = await fetch(`/api/index?action=sync`);
      const data = await response.json();
      
      if (data.success) {
        shopify.toast.show(`Synced ${data.data.products_processed} products successfully`);
        loadAnalytics(); // Refresh all stats
      } else {
        console.error("SYNC_API_ERROR_RESPONSE:", data.error, data.message);
        shopify.toast.show(data.error || "Sync failed", { isError: true });
      }
    } catch (error) {
      console.error('SYNC_FETCH_FAILED:', error);
      shopify.toast.show("Sync failed due to a network or server error.", { isError: true });
    }
  };

  // Prepare analytics table data
  const topQueriesRows = analytics?.top_queries?.map((query: any, index: number) => [
    index + 1,
    query.query,
    query.count,
    Math.round(query.avg_results),
  ]) || [];

  const productTypeRows = indexingStats?.products_by_type?.slice(0, 5).map((type: any, index: number) => [
    index + 1,
    type.type,
    type.count,
    Math.round((type.count / (indexingStats?.total_products || 1)) * 100) + '%',
  ]) || [];

  const searchResultRows = searchResults.map((product: ProductCandidate, index: number) => [
    index + 1,
    product.title,
    product.vendor || 'N/A',
    product.price_min ? `$${product.price_min}` : 'N/A',
    product.available ? <Badge tone="success">Available</Badge> : <Badge tone="critical">Unavailable</Badge>,
    Math.round(product.similarity_score * 100) + '%',
  ]);

  return (
    <Page>
      <TitleBar title="AI Search for Shopify">
        <button variant="primary" onClick={() => setShowSyncModal(true)}>
          Sync Products
        </button>
      </TitleBar>

      <BlockStack gap="500">
        {/* Welcome Banner */}
        <Banner title="Welcome to AI-Powered Search" tone="info">
          <p>
            Transform your store's search experience with AI. This app uses advanced language models 
            and vector search to understand natural language queries and deliver highly relevant results.
          </p>
        </Banner>

        {/* Search Interface */}
        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  🔍 Test AI Search
                </Text>
                <Text variant="bodyMd" tone="subdued" as="p">
                  Try natural language queries like "red dress under $100" or "gaming laptop for students"
                </Text>
                <InlineStack gap="300" align="end">
                  <Box minWidth="300px">
                    <TextField
                      label="Search Query"
                      value={searchQuery}
                      onChange={setSearchQuery}
                      placeholder="Enter your search query..."
                      autoComplete="off"
                    />
                  </Box>
                  <Button 
                    variant="primary" 
                    onClick={handleSearch} 
                    loading={isSearching}
                    disabled={!searchQuery.trim()}
                  >
                    Search
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  📊 Quick Stats
                </Text>
                <InlineStack gap="400">
                  <Box>
                    <Text variant="headingLg" as="h3">
                      {indexingStats?.total_products || 0}
                    </Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Products Indexed
                    </Text>
                  </Box>
                  <Box>
                    <Text variant="headingLg" as="h3">
                      {analytics?.total_searches || 0}
                    </Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Total Searches
                    </Text>
                  </Box>
                  <Box>
                    <Text variant="headingLg" as="h3">
                      {analytics ? Math.round(analytics.click_through_rate * 100) : 0}%
                    </Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Click Rate
                    </Text>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                🎯 Search Results ({searchResults.length})
              </Text>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={['#', 'Product', 'Vendor', 'Price', 'Status', 'Relevance']}
                rows={searchResultRows}
                truncate
              />
            </BlockStack>
          </Card>
        )}

        {/* Analytics Dashboard */}
        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  🔍 Top Search Queries
                </Text>
                {topQueriesRows.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'numeric']}
                    headings={['#', 'Query', 'Searches', 'Avg Results']}
                    rows={topQueriesRows}
                    truncate
                  />
                ) : (
                  <Text variant="bodyMd" tone="subdued" as="p">
                    No search data available yet
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  📦 Product Categories
                </Text>
                {productTypeRows.length > 0 ? (
                  <DataTable
                    columnContentTypes={['text', 'text', 'numeric', 'text']}
                    headings={['#', 'Category', 'Count', 'Percentage']}
                    rows={productTypeRows}
                    truncate
                  />
                ) : (
                  <Text variant="bodyMd" tone="subdued" as="p">
                    No product data available
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Indexing Status */}
        <Card>
          <BlockStack gap="400">
            <InlineStack gap="400" align="space-between">
              <Text as="h2" variant="headingMd">
                🔄 Indexing Status
              </Text>
              <Button onClick={loadAnalytics}>
                Refresh
              </Button>
            </InlineStack>
            
            <Layout>
              <Layout.Section variant="oneThird">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodyMd" tone="subdued" as="p">Total Products</Text>
                    <Text variant="headingLg" as="h3">
                      {indexingStats?.total_products || 0}
                    </Text>
                  </BlockStack>
                </Box>
              </Layout.Section>
              
              <Layout.Section variant="oneThird">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodyMd" tone="subdued" as="p">Available Products</Text>
                    <Text variant="headingLg" as="h3">
                      {indexingStats?.available_products || 0}
                    </Text>
                  </BlockStack>
                </Box>
              </Layout.Section>
              
              <Layout.Section variant="oneThird">
                <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                  <BlockStack gap="200">
                    <Text variant="bodyMd" tone="subdued" as="p">Last Indexed</Text>
                    <Text variant="bodyMd" as="p">
                      {indexingStats?.last_indexed 
                        ? new Date(indexingStats.last_indexed).toLocaleString()
                        : 'Never'
                      }
                    </Text>
                  </BlockStack>
                </Box>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>

        {/* How It Works */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              🧠 How AI Search Works
            </Text>
            <Layout>
              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">1. Query Understanding</Text>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    AI analyzes natural language queries to understand intent, extract filters, 
                    and refine search terms for better matching.
                  </Text>
                </BlockStack>
              </Layout.Section>
              
              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">2. Semantic Search</Text>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    Vector embeddings find products by meaning, not just keywords. 
                    "Cozy reading chair" matches products even without those exact words.
                  </Text>
                </BlockStack>
              </Layout.Section>
              
              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <Text variant="headingMd" as="h3">3. AI Ranking</Text>
                  <Text variant="bodyMd" tone="subdued" as="p">
                    AI re-ranks results considering relevance, availability, and user intent 
                    to show the most appropriate products first.
                  </Text>
                </BlockStack>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>
      </BlockStack>

      {/* Sync Modal */}
      <Modal
        open={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        title="Sync Products with AI Search"
        primaryAction={{
          content: 'Start Sync',
          onAction: handleSync,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowSyncModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <p>
              This will fetch all products from your Shopify store and generate AI embeddings 
              for semantic search. The process may take a few minutes for large catalogs.
            </p>
            <p>
              <strong>Current Status:</strong> {indexingStats?.total_products || 0} products indexed
            </p>
          </TextContainer>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
