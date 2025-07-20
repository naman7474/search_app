import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { 
  indexProduct, 
  bulkIndexProducts, 
  removeProduct, 
  getIndexingStats,
  reindexAllProducts,
  type ShopifyProduct 
} from "../lib/indexing/product-indexer.server";
import { ShopifyGraphQLFetcher } from "../lib/shopify/shopify-graphql-fetcher.server";
import { startSyncProgress, updateSyncProgress, finishSyncProgress } from "../lib/utils/sync-progress.server";

// In-memory job tracking (in production, use Redis or database)
const syncJobs = new Map<string, {
  id: string;
  shopDomain: string;
  status: 'starting' | 'running' | 'completed' | 'failed';
  processed: number;
  total: number;
  error?: string;
  current_step?: string;
  created_at: Date;
}>();

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const shopDomain = session.shop;
  
  console.log(`API_REQUEST_RECEIVED: shop=${shopDomain}, action=${action}`);

  if (action === "stats") {
    try {
      const stats = await getIndexingStats(shopDomain);
      return json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Failed to get indexing stats:", error);
      return json({
        success: false,
        error: "Failed to get indexing statistics",
      }, { status: 500 });
    }
  }

  if (action === "sync") {
    try {
      console.log(`🚀 Starting GraphQL product sync for ${shopDomain}`);
      console.log(`📊 Debug Info: admin object type: ${typeof admin}, shop: ${shopDomain}`);
      
      // Test authentication first
      try {
        console.log(`🔒 Testing authentication with simple shop query...`);
        const testQuery = `
          query {
            shop {
              id
              name
              myshopifyDomain
            }
          }
        `;
        
        const testResponse = await admin.graphql(testQuery);
        const testData = await testResponse.json() as { data?: any; errors?: any[] };
        
        if (testData.errors) {
          throw new Error(`Authentication test failed: ${JSON.stringify(testData.errors)}`);
        }
        
        console.log(`✅ Authentication test passed for shop: ${testData.data.shop.name}`);
        
      } catch (authError) {
        console.error(`❌ Authentication test failed:`, authError);
        throw new Error(`Authentication failed: ${authError instanceof Error ? authError.message : String(authError)}`);
      }
      
      // Add timeout for the entire sync operation (15 minutes)
      const syncPromise = async () => {
        // Start progress tracking
        updateSyncProgress(shopDomain, { currentStep: 'initializing' });
        
        // Use the new GraphQL fetcher
        const fetcher = new ShopifyGraphQLFetcher(admin, shopDomain);
        updateSyncProgress(shopDomain, { currentStep: 'fetching products via GraphQL' });
        
        console.log(`🔄 Using GraphQL Admin API for product sync`);
        const allProducts = await fetcher.fetchAllProducts();
        console.log(`SYNC_FETCH_COMPLETE: Found ${allProducts.length} products for ${shopDomain}`);
        
        // Initialize progress tracking
        startSyncProgress(shopDomain, allProducts.length);
        updateSyncProgress(shopDomain, { currentStep: 'indexing products' });
        
        // Index all products
        const result = await bulkIndexProducts(allProducts, shopDomain);
        
        console.log(`SYNC_BULK_INDEX_COMPLETE: Synced ${shopDomain}`);
        finishSyncProgress(shopDomain);
        return result;
      };
      
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Sync operation timeout after 15 minutes')), 15 * 60 * 1000)
      );
      
      const result = await Promise.race([syncPromise(), timeoutPromise]);

      return json({
        success: true,
        data: result,
      });
      
    } catch (error) {
      console.error("PRODUCT_SYNC_FAILED:", error);
      
      // Provide more helpful error messages for GraphQL errors
      let errorMessage = "Product sync failed";
      let statusCode = 500;
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = "Sync operation timed out. Try syncing in smaller batches.";
          statusCode = 408; // Request Timeout
        } else if (error.message.includes('THROTTLED') || error.message.includes('rate limit') || error.message.includes('429')) {
          errorMessage = "API rate limit exceeded. Please wait and try again.";
          statusCode = 429; // Too Many Requests
        } else if (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('connection')) {
          errorMessage = "Network error during sync. Please check your connection and try again.";
          statusCode = 503; // Service Unavailable
        } else if (error.message.includes('GraphQL errors')) {
          errorMessage = "GraphQL API error. Please check your app permissions.";
          statusCode = 400; // Bad Request
        } else if (error.message.includes('ACCESS_DENIED') || error.message.includes('INVALID_CREDENTIALS')) {
          errorMessage = "Authentication error. Please reinstall the app.";
          statusCode = 401; // Unauthorized
        }
      }
      
      return json({
        success: false,
        error: errorMessage,
        message: error instanceof Error ? error.message : "Unknown error",
        details: "Check server logs for more information",
      }, { status: statusCode });
    }
  }
  
  return json({
    success: false,
    error: "Invalid action parameter",
  }, { status: 400 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopDomain = session.shop;
  
  if (request.method === "POST") {
    try {
      const body = await request.json();
      const { action } = body;
      
      if (action === "start_sync") {
        // Generate a unique job ID
        const jobId = `sync_${shopDomain}_${Date.now()}`;
        
        // Create job record
        syncJobs.set(jobId, {
          id: jobId,
          shopDomain,
          status: 'starting',
          processed: 0,
          total: 0,
          current_step: 'Initializing sync...',
          created_at: new Date(),
        });
        
        // Start background sync process
        startBackgroundSync(jobId, admin, shopDomain);
        
        return json({
          success: true,
          job_id: jobId,
          message: "Sync job started successfully",
        });
      }
      
      if (action === "index_product") {
        const { product_data } = body;
        if (!product_data) {
          return json({ error: "Missing product_data" }, { status: 400 });
        }
        
        const result = await indexProduct(product_data, shopDomain);
        return json({
          success: result.success,
          error: result.error,
        });
      }
      
      if (action === "remove_product") {
        const { product_id } = body;
        if (!product_id) {
          return json({ error: "Missing product_id" }, { status: 400 });
        }
        
        const result = await removeProduct(product_id, shopDomain);
        return json({
          success: result.success,
          error: result.error,
        });
      }
      
      if (action === "reindex_all") {
        const result = await reindexAllProducts(shopDomain);
        return json({
          success: result.success,
          data: result,
        });
      }
      
      return json({ error: "Invalid action" }, { status: 400 });
      
    } catch (error) {
      console.error("Indexing action failed:", error);
      return json({
        success: false,
        error: "Indexing action failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 });
    }
  }
  
  return json({ error: "Method not allowed" }, { status: 405 });
};

// Background sync function
async function startBackgroundSync(jobId: string, admin: any, shopDomain: string) {
  const job = syncJobs.get(jobId);
  if (!job) return;
  
  try {
    // Update job status
    job.status = 'running';
    job.current_step = 'Testing authentication...';
    
    // Test authentication
    const testQuery = `
      query {
        shop {
          id
          name
          myshopifyDomain
        }
      }
    `;
    
    const testResponse = await admin.graphql(testQuery);
    const testData = await testResponse.json() as { data?: any; errors?: any[] };
    
    if (testData.errors) {
      throw new Error(`Authentication test failed: ${JSON.stringify(testData.errors)}`);
    }
    
    console.log(`✅ Authentication test passed for shop: ${testData.data.shop.name}`);
    
    // Fetch products
    job.current_step = 'Fetching products from Shopify...';
    const fetcher = new ShopifyGraphQLFetcher(admin, shopDomain);
    const allProducts = await fetcher.fetchAllProducts();
    
    job.total = allProducts.length;
    job.current_step = 'Indexing products...';
    
    console.log(`🔄 Starting to index ${allProducts.length} products for ${shopDomain}`);
    
    // Index products with progress tracking
    const result = await bulkIndexProducts(allProducts, shopDomain);
    
    // Update job completion
    job.status = 'completed';
    job.processed = result.products_processed;
    job.current_step = 'Sync completed successfully';
    
    console.log(`✅ Background sync completed for ${shopDomain}: ${result.products_processed} products processed`);
    
  } catch (error) {
    console.error(`❌ Background sync failed for ${shopDomain}:`, error);
    
    if (job) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.current_step = 'Sync failed';
    }
  }
}

// Helper function to get job status (used by sync-progress endpoint)
export function getSyncJobStatus(jobId: string) {
  return syncJobs.get(jobId);
} 