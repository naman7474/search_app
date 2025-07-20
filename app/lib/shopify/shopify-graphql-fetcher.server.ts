import type { ShopifyProduct } from "../indexing/product-indexer.server";

export interface ShopifyGraphQLFetcherOptions {
  limit?: number;
  cursor?: string;
  fields?: string[];
  updated_at_min?: string;
  status?: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
}

export class ShopifyGraphQLFetcher {
  private admin: any;
  private shopDomain: string;

  constructor(admin: any, shopDomain: string) {
    this.admin = admin;
    this.shopDomain = shopDomain;
  }

  /**
   * Fetch products using GraphQL Admin API with cursor-based pagination
   */
  async fetchProducts(options: ShopifyGraphQLFetcherOptions = {}): Promise<{
    products: ShopifyProduct[];
    hasNextPage: boolean;
    endCursor?: string;
  }> {
    const {
      limit = 250, // GraphQL limit
      cursor,
      status = 'ACTIVE'
    } = options;

    try {
      console.log(`🔍 Fetching products from Shopify GraphQL API (limit: ${limit})`);
      
      const query = `
        query GetProducts($first: Int!, $after: String, $query: String) {
          products(first: $first, after: $after, query: $query) {
            edges {
              node {
                id
                title
                bodyHtml
                handle
                productType
                vendor
                tags
                status
                createdAt
                updatedAt
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
                        url
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

      const variables = {
        first: limit,
        after: cursor || null,
        query: status === 'ACTIVE' ? 'status:active' : `status:${status.toLowerCase()}`
      };

      // Use GraphQL Admin API with retry logic
      const response = await this.retryGraphQLCall(async () => {
        return await this.admin.graphql(query, { variables });
      }, 3);

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      const products: ShopifyProduct[] = data.data.products.edges.map((edge: any) => 
        this.transformGraphQLProduct(edge.node)
      );

      console.log(`✅ Fetched ${products.length} products from Shopify GraphQL`);

      return {
        products,
        hasNextPage: data.data.products.pageInfo.hasNextPage,
        endCursor: data.data.products.pageInfo.endCursor
      };

    } catch (error) {
      console.error('❌ GraphQL fetch error:', error);
      throw error;
    }
  }

  /**
   * Fetch all products with automatic pagination using GraphQL
   */
  async fetchAllProducts(options: Omit<ShopifyGraphQLFetcherOptions, 'cursor'> = {}): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let hasNextPage = true;
    let cursor: string | undefined;
    let page = 1;

    console.log(`🚀 Starting GraphQL product sync for ${this.shopDomain}`);

    while (hasNextPage) {
      try {
        const result = await this.fetchProducts({
          ...options,
          cursor
        });

        allProducts.push(...result.products);
        hasNextPage = result.hasNextPage;
        cursor = result.endCursor;

        console.log(`📦 Progress: ${allProducts.length} products fetched so far (page ${page})`);

        // Add progressive delay to respect rate limits
        if (hasNextPage) {
          const delay = Math.min(500 + (page * 50), 1000); // Progressive delay up to 1s
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        page++;

        // Safety check for large syncs
        if (page > 100) {
          console.warn(`⚠️ Large sync in progress, page ${page}. Consider using filters.`);
        }

      } catch (error) {
        console.error(`❌ Error fetching page ${page}:`, error);
        
        // If it's a rate limit error, wait longer and retry
        if (error instanceof Error && error.message.includes('THROTTLED')) {
          console.log(`⏸️ Rate limited, waiting 5 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue; // Retry the same page
        }
        
        throw error;
      }
    }

    console.log(`✅ Completed GraphQL product sync: ${allProducts.length} total products`);
    return allProducts;
  }

  /**
   * Fetch a single product by ID using GraphQL
   */
  async fetchProduct(productId: string): Promise<ShopifyProduct | null> {
    try {
      const query = `
        query GetProduct($id: ID!) {
          product(id: $id) {
            id
            title
            bodyHtml
            handle
            productType
            vendor
            tags
            status
            createdAt
            updatedAt
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
                    url
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
      `;

      const variables = {
        id: productId.startsWith('gid://') ? productId : `gid://shopify/Product/${productId}`
      };

      const response = await this.retryGraphQLCall(async () => {
        return await this.admin.graphql(query, { variables });
      }, 3);

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      if (!data.data.product) {
        return null;
      }

      return this.transformGraphQLProduct(data.data.product);

    } catch (error) {
      console.error('❌ Error fetching single product:', error);
      throw error;
    }
  }

  /**
   * Retry GraphQL calls with exponential backoff and better error handling
   */
  private async retryGraphQLCall<T>(graphqlCall: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await graphqlCall();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error && (
          error.message.includes('INVALID_CREDENTIALS') ||
          error.message.includes('ACCESS_DENIED') ||
          error.message.includes('NOT_FOUND')
        )) {
          throw error;
        }
        
        // Handle rate limiting specifically
        if (error instanceof Error && error.message.includes('THROTTLED')) {
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
            console.warn(`⚠️ GraphQL rate limited (attempt ${attempt}/${maxRetries}), waiting ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        }
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.warn(`⚠️ GraphQL call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Transform GraphQL product response to our internal format
   */
  private transformGraphQLProduct(graphqlProduct: any): ShopifyProduct {
    return {
      id: parseInt(graphqlProduct.id.split('/').pop()),
      title: graphqlProduct.title,
      body_html: graphqlProduct.bodyHtml,
      handle: graphqlProduct.handle,
      product_type: graphqlProduct.productType,
      vendor: graphqlProduct.vendor,
      tags: graphqlProduct.tags?.join(', ') || '',
      status: graphqlProduct.status.toLowerCase(),
      variants: graphqlProduct.variants.edges.map((edge: any) => ({
        id: parseInt(edge.node.id.split('/').pop()),
        title: edge.node.title,
        price: edge.node.price,
        compare_at_price: edge.node.compareAtPrice,
        sku: edge.node.sku,
        barcode: edge.node.barcode,
        inventory_quantity: edge.node.inventoryQuantity || 0,
        available: edge.node.availableForSale,
        image_id: edge.node.image ? parseInt(edge.node.image.id.split('/').pop()) : null,
      })),
      images: graphqlProduct.images.edges.map((edge: any) => ({
        id: parseInt(edge.node.id.split('/').pop()),
        src: edge.node.url,
        alt: edge.node.altText,
      })),
      options: graphqlProduct.options.map((option: any) => ({
        name: option.name,
        values: option.values,
      })),
    };
  }
} 