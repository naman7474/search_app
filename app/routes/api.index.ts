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
      // Fetch products from Shopify
      const productsQuery = `
        query getProducts($first: Int!, $after: String) {
          products(first: $first, after: $after) {
            edges {
              node {
                id
                title
                descriptionHtml
                handle
                productType
                vendor
                tags
                status
                variants(first: 100) {
                  edges {
                    node {
                      id
                      title
                      price
                      compareAtPrice
                      sku
                      barcode
                      inventoryQuantity
                      availableForSale
                      image {
                        id
                      }
                    }
                  }
                }
                images(first: 10) {
                  edges {
                    node {
                      id
                      url
                      altText
                    }
                  }
                }
                options {
                  name
                  values
                }
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      `;
      
      let allProducts: ShopifyProduct[] = [];
      let hasNextPage = true;
      let after: string | null = null;
      
      console.log(`SYNC_STARTED: Starting sync for ${shopDomain}`);
      
      // Fetch all products (paginated)
      while (hasNextPage) {
        const response: Response = await admin.graphql(productsQuery, {
          variables: {
            first: 50,
            after,
          },
        });
        
        const responseJson: any = await response.json();
        
        if (responseJson.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
        }
        
        const products = responseJson.data?.products?.edges || [];
        
        // Transform GraphQL response to our ShopifyProduct format
        const transformedProducts = products.map((edge: any) => {
          const product = edge.node;
          return {
            id: parseInt(product.id.replace('gid://shopify/Product/', '')),
            title: product.title,
            body_html: product.descriptionHtml,
            handle: product.handle,
            product_type: product.productType,
            vendor: product.vendor,
            tags: product.tags.join(','),
            status: product.status.toLowerCase(),
            variants: product.variants.edges.map((vEdge: any) => ({
              id: parseInt(vEdge.node.id.replace('gid://shopify/ProductVariant/', '')),
              title: vEdge.node.title,
              price: vEdge.node.price,
              compare_at_price: vEdge.node.compareAtPrice,
              sku: vEdge.node.sku,
              barcode: vEdge.node.barcode,
              inventory_quantity: vEdge.node.inventoryQuantity || 0,
              available: vEdge.node.availableForSale,
              image_id: vEdge.node.image?.id ? parseInt(vEdge.node.image.id.replace('gid://shopify/ProductImage/', '')) : undefined,
            })),
            images: product.images.edges.map((iEdge: any) => ({
              id: parseInt(iEdge.node.id.replace('gid://shopify/ProductImage/', '')),
              src: iEdge.node.url,
              alt: iEdge.node.altText,
            })),
            options: product.options,
          };
        });
        
        allProducts = [...allProducts, ...transformedProducts];
        
        const pageInfo: any = responseJson.data?.products?.pageInfo;
        hasNextPage = pageInfo?.hasNextPage || false;
        after = pageInfo?.endCursor || null;
      }
      
      console.log(`SYNC_FETCH_COMPLETE: Found ${allProducts.length} products for ${shopDomain}`);
      
      // Index all products
      const result = await bulkIndexProducts(allProducts, shopDomain);
      
      console.log(`SYNC_BULK_INDEX_COMPLETE: Synced ${shopDomain}`);

      return json({
        success: true,
        data: result,
      });
      
    } catch (error) {
      console.error("PRODUCT_SYNC_FAILED:", error);
      return json({
        success: false,
        error: "Product sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }, { status: 500 });
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
      const { action, product_id, product_data } = body;
      
      if (action === "index_product") {
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