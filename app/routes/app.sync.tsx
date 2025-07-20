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
  ProgressBar,
  DataTable,
  Banner,
  Modal,
  TextContainer,
  ResourceList,
  ResourceItem,
  Avatar,
  Thumbnail,
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

export default function Sync() {
  const { shop, apiUrl } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();

  // State
  const [indexingStats, setIndexingStats] = useState<any>(null);
  const [syncedProducts, setSyncedProducts] = useState<any[]>([]);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProgress, setSyncProgress] = useState<any>(null);
  const [syncJobId, setSyncJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  // Load initial data
  useEffect(() => {
    loadSyncData();
  }, []);

  // Poll sync progress when a job is running
  useEffect(() => {
    if (!syncJobId) return;

    const pollProgress = async () => {
      try {
        const response = await makeAuthenticatedRequest(`/api/sync-progress?job_id=${syncJobId}`);
        const data = await response.json();
        
        if (data.success) {
          setSyncProgress(data.data);
          
          if (data.data.status === 'completed' || data.data.status === 'failed') {
            setSyncJobId(null);
            
            if (data.data.status === 'completed') {
              shopify.toast.show(`Sync completed! Processed ${data.data.processed} products`);
              loadSyncData(); // Refresh data
            } else {
              shopify.toast.show(`Sync failed: ${data.data.error}`, { isError: true });
            }
          }
        }
      } catch (error) {
        console.error('Failed to poll sync progress:', error);
      }
    };

    const interval = setInterval(pollProgress, 2000);
    pollProgress();

    return () => clearInterval(interval);
  }, [syncJobId, shopify]);

  // Load sync data
  const loadSyncData = async () => {
    setLoading(true);
    try {
      // Load indexing stats
      const statsResponse = await makeAuthenticatedRequest(`/api/index?action=stats`);
      const statsData = await statsResponse.json();
      if (statsData.success) {
        setIndexingStats(statsData.data);
      }

      // Load sample synced products (we'll limit to 50 for performance)
      // In a real app, you might want to paginate this
      const productsResponse = await makeAuthenticatedRequest(`/api/synced-products?limit=50`);
      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        if (productsData.success) {
          setSyncedProducts(productsData.data);
        }
      }
    } catch (error) {
      console.error('Failed to load sync data:', error);
      shopify.toast.show('Failed to load sync data', { isError: true });
    } finally {
      setLoading(false);
    }
  };

  // Handle product sync
  const handleSync = async () => {
    console.log("Starting product sync...");
    setShowSyncModal(false);
    setSyncProgress({ status: 'starting', processed: 0, total: 0 });
    
    try {
      const response = await makeAuthenticatedRequest(`/api/index`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start_sync' }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("HTTP error:", response.status, response.statusText, errorText);
        
        if (response.status === 401) {
          shopify.toast.show("Authentication failed. Please refresh the page.", { isError: true });
        } else if (response.status === 403) {
          shopify.toast.show("Access denied. Check your app permissions.", { isError: true });
        } else if (response.status === 429) {
          shopify.toast.show("Rate limit exceeded. Please try again later.", { isError: true });
        } else {
          shopify.toast.show(`Sync failed: ${response.status} ${response.statusText}`, { isError: true });
        }
        setSyncProgress(null);
        return;
      }
      
      const data = await response.json();
      console.log("Start sync response:", data);
      
      if (data.success && data.job_id) {
        setSyncJobId(data.job_id);
        shopify.toast.show("Product sync started...");
      } else {
        console.error("Sync start failed:", data.error);
        shopify.toast.show(data.error || "Failed to start sync", { isError: true });
        setSyncProgress(null);
      }
    } catch (error) {
      console.error('Sync start error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        shopify.toast.show("Network connection failed. Check your internet connection.", { isError: true });
      } else {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        shopify.toast.show(`Sync failed: ${errorMessage}`, { isError: true });
      }
      setSyncProgress(null);
    }
  };

  // Calculate sync progress percentage
  const getSyncProgressPercentage = () => {
    if (!syncProgress || !syncProgress.total) return 0;
    return Math.round((syncProgress.processed / syncProgress.total) * 100);
  };

  // Format price
  const formatPrice = (price: any) => {
    if (!price) return 'N/A';
    return typeof price === 'string' ? price : `$${price}`;
  };

  // Get sync status badge
  const getSyncStatusBadge = () => {
    if (syncProgress) {
      switch (syncProgress.status) {
        case 'running':
          return <Badge tone="info">Syncing...</Badge>;
        case 'completed':
          return <Badge tone="success">Completed</Badge>;
        case 'failed':
          return <Badge tone="critical">Failed</Badge>;
        default:
          return <Badge tone="warning">Starting...</Badge>;
      }
    }
    return <Badge tone="success">Ready</Badge>;
  };

  // Product type distribution for chart
  const productTypeRows = indexingStats?.products_by_type?.slice(0, 10).map((type: any, index: number) => [
    index + 1,
    type.type || 'Uncategorized',
    type.count,
    Math.round((type.count / (indexingStats?.total_products || 1)) * 100) + '%',
  ]) || [];

  return (
    <Page>
      <TitleBar title="Product Sync" />
      <Layout>
        {/* Sync Progress Banner */}
        {syncProgress && (
          <Layout.Section>
            <Banner
              title={`Product Sync ${syncProgress.status === 'running' ? 'In Progress' : 
                      syncProgress.status === 'completed' ? 'Completed' : 
                      syncProgress.status === 'failed' ? 'Failed' : 'Starting...'}`}
              tone={syncProgress.status === 'failed' ? 'critical' : 'info'}
            >
              <BlockStack gap="200">
                <Text as="p">
                  {syncProgress.status === 'running' ? 
                    `Processing ${syncProgress.processed} of ${syncProgress.total} products...` :
                    syncProgress.status === 'completed' ?
                    `Successfully processed ${syncProgress.processed} products` :
                    syncProgress.status === 'failed' ?
                    `Failed: ${syncProgress.error}` :
                    'Initializing product sync...'}
                </Text>
                {syncProgress.status === 'running' && (
                  <ProgressBar 
                    progress={getSyncProgressPercentage()} 
                    size="small"
                  />
                )}
                {syncProgress.current_step && (
                  <Text as="p" tone="subdued">
                    {syncProgress.current_step}
                  </Text>
                )}
              </BlockStack>
            </Banner>
          </Layout.Section>
        )}

        {/* Sync Overview */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack gap="400" align="space-between">
                <BlockStack gap="200">
                  <Text as="h2" variant="headingMd">
                    Sync Overview
                  </Text>
                  <Text as="p" variant="bodyMd" tone="subdued">
                    Manage your product synchronization and AI search index
                  </Text>
                </BlockStack>
                {getSyncStatusBadge()}
              </InlineStack>

              <InlineStack gap="400">
                {/* Sync Statistics */}
                <Box width="50%">
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingSm">
                        📊 Index Statistics
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
                        <InlineStack gap="400" align="space-between">
                          <Text as="p" variant="bodyMd">Last Sync:</Text>
                          <Text as="p" variant="bodyMd" fontWeight="semibold">
                            {indexingStats?.last_sync ? 
                              new Date(indexingStats.last_sync).toLocaleString() : 
                              'Never'
                            }
                          </Text>
                        </InlineStack>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </Box>

                {/* Sync Controls */}
                <Box width="50%">
                  <Card>
                    <BlockStack gap="300">
                      <Text as="h3" variant="headingSm">
                        🔄 Sync Controls
                      </Text>
                      <BlockStack gap="300">
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Sync your products to enable AI-powered search and keep your index up to date.
                        </Text>
                        
                        {syncProgress && syncProgress.status === 'running' && (
                          <Box>
                            <ProgressBar progress={getSyncProgressPercentage()} />
                            <Text as="p" variant="bodySm" tone="subdued">
                              Syncing products... {getSyncProgressPercentage()}%
                            </Text>
                          </Box>
                        )}

                        <Button 
                          onClick={() => setShowSyncModal(true)}
                          variant="primary"
                          size="large"
                          fullWidth
                          disabled={!!syncProgress && syncProgress.status === 'running'}
                        >
                          {syncProgress && syncProgress.status === 'running' ? 
                            'Sync in Progress...' : 
                            'Sync Products Now'
                          }
                        </Button>
                        
                        <Button 
                          onClick={loadSyncData}
                          disabled={loading}
                          fullWidth
                        >
                          Refresh Data
                        </Button>
                      </BlockStack>
                    </BlockStack>
                  </Card>
                </Box>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Product Distribution */}
        {productTypeRows.length > 0 && (
          <Layout.Section>
            <Card>
              <BlockStack gap="300">
                <Text as="h3" variant="headingSm">
                  📈 Product Type Distribution
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

        {/* Synced Products */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <InlineStack gap="400" align="space-between">
                <Text as="h3" variant="headingSm">
                  🛍️ Synced Products ({syncedProducts.length})
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Showing recent synced products
                </Text>
              </InlineStack>

              {syncedProducts.length > 0 ? (
                <ResourceList
                  resourceName={{ singular: 'product', plural: 'products' }}
                  items={syncedProducts}
                  renderItem={(product: any) => {
                    const { id, title, handle, vendor, price_min, price_max, available, image_url, product_type, created_at } = product;
                    const priceDisplay = price_min === price_max ? 
                      formatPrice(price_min) : 
                      `${formatPrice(price_min)} - ${formatPrice(price_max)}`;
                    
                    return (
                      <ResourceItem
                        id={id}
                        accessibilityLabel={`Product ${title}`}
                        onClick={() => {
                          // Navigate to product in admin
                          window.open(`https://${shop}/admin/products/${id}`, '_blank');
                        }}
                      >
                        <InlineStack gap="400" align="start">
                          <Thumbnail
                            source={image_url || ''}
                            alt={title}
                            size="small"
                          />
                          <Box width="100%">
                            <BlockStack gap="100">
                              <InlineStack gap="200" align="space-between">
                                <Text as="h4" variant="headingSm" fontWeight="semibold">
                                  {title}
                                </Text>
                                <Badge tone={available ? "success" : "critical"}>
                                  {available ? "Available" : "Unavailable"}
                                </Badge>
                              </InlineStack>
                              
                              <InlineStack gap="400">
                                <Text as="p" variant="bodySm" tone="subdued">
                                  {vendor || 'No vendor'}
                                </Text>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  {product_type || 'No type'}
                                </Text>
                                <Text as="p" variant="bodySm" fontWeight="medium">
                                  {priceDisplay}
                                </Text>
                              </InlineStack>

                              {created_at && (
                                <Text as="p" variant="bodyXs" tone="subdued">
                                  Synced: {new Date(created_at).toLocaleDateString()}
                                </Text>
                              )}
                            </BlockStack>
                          </Box>
                        </InlineStack>
                      </ResourceItem>
                    );
                  }}
                />
              ) : (
                <EmptyState
                  heading="No products synced yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                  action={{
                    content: 'Sync Products',
                    onAction: () => setShowSyncModal(true),
                  }}
                >
                  <Text as="p">
                    Sync your products to enable AI-powered search and see them listed here.
                  </Text>
                </EmptyState>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Quick Tips */}
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingSm">
                💡 Sync Tips
              </Text>
              <BlockStack gap="200">
                <Text as="p" variant="bodyMd">
                  • <strong>Initial Sync:</strong> The first sync may take longer as it processes all your products
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Auto Updates:</strong> Webhooks automatically sync new/updated products in real-time
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Performance:</strong> Large catalogs (1000+ products) are processed in batches
                </Text>
                <Text as="p" variant="bodyMd">
                  • <strong>Search Ready:</strong> Products become searchable immediately after indexing
                </Text>
              </BlockStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Sync Confirmation Modal */}
        <Modal
          open={showSyncModal}
          onClose={() => setShowSyncModal(false)}
          title="Sync Products"
          primaryAction={{
            content: "Start Sync",
            onAction: handleSync,
          }}
          secondaryActions={[
            {
              content: "Cancel",
              onAction: () => setShowSyncModal(false),
            },
          ]}
        >
          <Modal.Section>
            <TextContainer>
              <BlockStack gap="300">
                <Text as="p" variant="bodyMd">
                  This will sync all products from your Shopify store to the AI search index. 
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  The process may take a few minutes depending on your product count. You can monitor 
                  the progress on this page.
                </Text>
                <Text as="p" variant="bodyMd">
                  <strong>What happens during sync:</strong>
                </Text>
                <Text as="p" variant="bodySm">
                  • Fetch all products from Shopify<br />
                  • Generate AI embeddings for search<br />
                  • Update search indexes<br />
                  • Enable intelligent product discovery
                </Text>
              </BlockStack>
            </TextContainer>
          </Modal.Section>
        </Modal>
      </Layout>
    </Page>
  );
} 