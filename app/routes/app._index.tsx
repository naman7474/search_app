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
      
      const searchResult = await searchProducts({
        query,
        shop_domain: shop,
        limit: 20,
        offset: 0,
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
  const [analytics, setAnalytics] = useState<any>(null);
  const [indexingStats, setIndexingStats] = useState<any>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProgress, setSyncProgress] = useState<number | null>(null);

  const isSearching = searchFetcher.state !== 'idle';
  const searchResults = (searchFetcher.data?.success && searchFetcher.data.data.products) || [];
  const searchInfo = searchFetcher.data?.success ? searchFetcher.data.data.query_info : null;

  // Load initial data
  useEffect(() => {
    loadAnalytics();
  }, []);

  // Show toast on search completion
  useEffect(() => {
    if (searchFetcher.state === 'idle' && searchFetcher.data) {
      if (searchFetcher.data.success) {
        const message = `Found ${searchFetcher.data.data.products.length} products in ${searchFetcher.data.data.query_info.processing_time_ms}ms`;
        shopify.toast.show(message);
      } else {
        shopify.toast.show(searchFetcher.data.error || "Search failed", { isError: true });
      }
    }
  }, [searchFetcher.state, searchFetcher.data, shopify]);

  // Load analytics data
  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/analytics?type=overview`);
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

  // Handle Enter key in search field
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  // Handle product sync
  const handleSync = async () => {
    console.log("Starting product sync...");
    setShowSyncModal(false);
    setSyncProgress(0);
    
    try {
      const response = await fetch(`${apiUrl}/api/index?action=sync`);
      const data = await response.json();
      
      if (data.success) {
        shopify.toast.show(`Synced ${data.data.products_processed} products successfully`);
        setSyncProgress(100);
        loadAnalytics(); // Refresh all stats
      } else {
        console.error("Sync failed:", data.error, data.message);
        shopify.toast.show(data.error || "Sync failed", { isError: true });
      }
    } catch (error) {
      console.error('Sync error:', error);
      shopify.toast.show("Sync failed due to a network error", { isError: true });
    } finally {
      setSyncProgress(null);
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
    type.type || 'Uncategorized',
    type.count,
    Math.round((type.count / (indexingStats?.total_products || 1)) * 100) + '%',
  ]) || [];

  const searchResultRows = searchResults.map((product: ProductCandidate, index: number) => [
    index + 1,
    product.title,
    product.vendor || 'N/A',
    product.price_min ? `$${product.price_min}` : 'N/A',
    product.available ? <Badge tone="success">Available</Badge> : <Badge tone="critical">Unavailable</Badge>,
    product.similarity_score ? Math.round(product.similarity_score * 100) + '%' : 'N/A',
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
                      onKeyPress={handleKeyPress}
                      placeholder="Enter your search query..."
                      autoComplete="off"
                      disabled={isSearching}
                    />
                  </Box>
                  <Button 
                    variant="primary" 
                    onClick={handleSearch} 
                    loading={isSearching}
                    disabled={!searchQuery.trim() || isSearching}
                  >
                    Search
                  </Button>
                </InlineStack>
                
                {searchInfo && (
                  <Box>
                    <Text variant="bodySm" tone="subdued">
                      Processed as: "{searchInfo.parsed_query.query_text}"
                    </Text>
                  </Box>
                )}
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
                      {analytics?.avg_response_time ? `${Math.round(analytics.avg_response_time)}ms` : 'N/A'}
                    </Text>
                    <Text variant="bodyMd" tone="subdued" as="p">
                      Avg Response Time
                    </Text>
                  </Box>
                </InlineStack>
                
                {syncProgress !== null && (
                  <Box>
                    <ProgressBar progress={syncProgress} />
                    <Text variant="bodySm" tone="subdued">
                      Syncing products... {syncProgress}%
                    </Text>
                  </Box>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                🔎 Search Results
              </Text>
              <DataTable
                columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
                headings={['#', 'Product', 'Vendor', 'Price', 'Status', 'Relevance']}
                rows={searchResultRows}
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
                  🔥 Top Search Queries
                </Text>
                {topQueriesRows.length > 0 ? (
                  <DataTable
                    columnContentTypes={['numeric', 'text', 'numeric', 'numeric']}
                    headings={['#', 'Query', 'Count', 'Avg Results']}
                    rows={topQueriesRows}
                  />
                ) : (
                  <Text variant="bodyMd" tone="subdued">
                    No search queries yet. Try searching above!
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  📦 Products by Type
                </Text>
                {productTypeRows.length > 0 ? (
                  <DataTable
                    columnContentTypes={['numeric', 'text', 'numeric', 'text']}
                    headings={['#', 'Type', 'Count', 'Percentage']}
                    rows={productTypeRows}
                  />
                ) : (
                  <Text variant="bodyMd" tone="subdued">
                    No products indexed yet. Click "Sync Products" to get started!
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Sync Modal */}
        <Modal
          open={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          title="Sync Products"
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
                This will sync all products from your store to the AI search index. 
                The process may take a few minutes depending on your catalog size.
              </p>
              <p>
                <strong>Note:</strong> Products are automatically synced when created, updated, or deleted. 
                Use this manual sync only if needed.
              </p>
            </TextContainer>
          </Modal.Section>
        </Modal>
      </BlockStack>
    </Page>
  );
}