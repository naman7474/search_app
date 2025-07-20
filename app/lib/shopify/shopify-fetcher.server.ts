import type { ShopifyProduct } from "../indexing/product-indexer.server";

export interface ShopifyFetcherOptions {
  limit?: number;
  page?: number;
  fields?: string[];
  since_id?: number;
  updated_at_min?: string;
  status?: 'active' | 'archived' | 'draft';
}

export class ShopifyFetcher {
  private admin: any; // We'll use the admin object directly without type constraints
  private shopDomain: string;

  constructor(admin: any, shopDomain: string) {
    this.admin = admin;
    this.shopDomain = shopDomain;
  }

  /**
   * Fetch products from Shopify REST Admin API with pagination
   */
  async fetchProducts(options: ShopifyFetcherOptions = {}): Promise<{
    products: ShopifyProduct[];
    hasNextPage: boolean;
    nextPageInfo?: { since_id: number };
  }> {
    const {
      limit = 250, // Max allowed by Shopify
      page = 1,
      fields = [
        'id',
        'title', 
        'body_html',
        'handle',
        'product_type',
        'vendor',
        'tags',
        'status',
        'variants',
        'images',
        'options',
        'created_at',
        'updated_at'
      ],
      since_id,
      updated_at_min,
      status = 'active'
    } = options;

    try {
      console.log(`🔍 Fetching products from Shopify REST API (page: ${page}, limit: ${limit})`);
      
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        fields: fields.join(','),
        status
      });

      if (since_id) {
        queryParams.append('since_id', since_id.toString());
      }

      if (updated_at_min) {
        queryParams.append('updated_at_min', updated_at_min);
      }

      // Use REST Admin API with retry logic
      const response = await this.retryApiCall(async () => {
        return await this.admin.rest.get({
          path: `products.json?${queryParams.toString()}`,
          timeout: 30000 // 30 second timeout
        });
      }, 3);

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.statusText}`);
      }

      const data = await response.json() as { products: any[] };
      const products: ShopifyProduct[] = data.products.map(this.transformProduct);

      // Check if there are more pages
      const hasNextPage = products.length === limit;
      const lastProductId = products.length > 0 ? products[products.length - 1].id : undefined;

      console.log(`✅ Fetched ${products.length} products from Shopify`);

      return {
        products,
        hasNextPage,
        nextPageInfo: hasNextPage && lastProductId ? { since_id: lastProductId } : undefined
      };

    } catch (error) {
      console.error('❌ Failed to fetch products from Shopify:', error);
      throw error;
    }
  }

  /**
   * Fetch all products with automatic pagination
   */
  async fetchAllProducts(options: Omit<ShopifyFetcherOptions, 'page'> = {}): Promise<ShopifyProduct[]> {
    const allProducts: ShopifyProduct[] = [];
    let hasNextPage = true;
    let sinceId: number | undefined;
    let page = 1;

    console.log(`🚀 Starting full product sync for ${this.shopDomain}`);

    while (hasNextPage) {
      const result = await this.fetchProducts({
        ...options,
        since_id: sinceId,
        page
      });

      allProducts.push(...result.products);
      hasNextPage = result.hasNextPage;
      sinceId = result.nextPageInfo?.since_id;
      page++;

      // Add progressive delay to avoid rate limiting
      if (hasNextPage) {
        const delay = Math.min(500 + (page * 100), 2000); // Progressive delay up to 2s
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Check if we're approaching API limits
        if (page > 50) {
          console.warn(`⚠️ Large sync in progress, page ${page}. Consider using smaller batches.`);
        }
      }

      console.log(`📦 Progress: ${allProducts.length} products fetched so far...`);
    }

    console.log(`✅ Completed fetching all products: ${allProducts.length} total`);
    return allProducts;
  }

  /**
   * Fetch products updated after a specific date
   */
  async fetchUpdatedProducts(updatedSince: Date): Promise<ShopifyProduct[]> {
    return this.fetchAllProducts({
      updated_at_min: updatedSince.toISOString()
    });
  }

  /**
   * Fetch a single product by ID
   */
  async fetchProduct(productId: number): Promise<ShopifyProduct | null> {
    try {
      const response = await this.admin.rest.get({
        path: `products/${productId}.json`
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Shopify API error: ${response.statusText}`);
      }

      const data = await response.json() as { product: any };
      return this.transformProduct(data.product);

    } catch (error) {
      console.error(`❌ Failed to fetch product ${productId}:`, error);
      throw error;
    }
  }

  /**
   * Transform Shopify REST API product to our internal format
   */
  /**
   * Retry API calls with exponential backoff
   */
  private async retryApiCall<T>(apiCall: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await apiCall();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error && (
          error.message.includes('401') || 
          error.message.includes('403') ||
          error.message.includes('404')
        )) {
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`⚠️ API call failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  private transformProduct(shopifyProduct: any): ShopifyProduct {
    return {
      id: shopifyProduct.id,
      title: shopifyProduct.title,
      body_html: shopifyProduct.body_html,
      handle: shopifyProduct.handle,
      product_type: shopifyProduct.product_type,
      vendor: shopifyProduct.vendor,
      tags: shopifyProduct.tags,
      status: shopifyProduct.status,
      variants: (shopifyProduct.variants || []).map((variant: any) => ({
        id: variant.id,
        title: variant.title,
        price: variant.price,
        compare_at_price: variant.compare_at_price,
        sku: variant.sku,
        barcode: variant.barcode,
        inventory_quantity: variant.inventory_quantity || 0,
        available: variant.available !== false,
        image_id: variant.image_id
      })),
      images: (shopifyProduct.images || []).map((image: any) => ({
        id: image.id,
        src: image.src,
        alt: image.alt
      })),
      options: (shopifyProduct.options || []).map((option: any) => ({
        name: option.name,
        values: option.values || []
      }))
    };
  }
} 