// app/lib/vector-db/weaviate.server.ts
import weaviate, { WeaviateClient, ApiKey } from 'weaviate-ts-client';
import type { 
  VectorDBInterface, 
  VectorDBProduct, 
  VectorSearchResult,
  VectorDBConfig 
} from './interfaces';

export class WeaviateVectorDB implements VectorDBInterface {
  private client: WeaviateClient;
  private className = 'Product';
  
  constructor(config?: VectorDBConfig) {
    // Use environment variables or provided config
    const scheme = config?.scheme || (process.env.WEAVIATE_SCHEME as 'http' | 'https') || 'https';
    const host = config?.host || process.env.WEAVIATE_URL || 'localhost:8080';
    const apiKey = config?.apiKey || process.env.WEAVIATE_API_KEY;
    
    if (!host) {
      throw new Error('Weaviate host URL is required');
    }
    
    this.client = weaviate.client({
      scheme,
      host,
      apiKey: apiKey ? new ApiKey(apiKey) : undefined,
    });
  }
  
  async initialize(): Promise<void> {
    try {
      // Check if class already exists
      const schema = await this.client.schema.getter().do();
      const classExists = schema.classes?.some((c: any) => c.class === this.className);
      
      if (!classExists) {
        await this.createProductClass();
      }
    } catch (error) {
      console.error('Failed to initialize Weaviate:', error);
      throw error;
    }
  }
  
  private async createProductClass() {
    const classObj = {
      class: this.className,
      vectorizer: 'text2vec-openai',
      moduleConfig: {
        'text2vec-openai': {
          model: 'ada-002',
          modelVersion: '002',
          type: 'text',
        },
      },
      properties: [
        { name: 'shopifyId', dataType: ['int'] },
        { name: 'title', dataType: ['text'] },
        { name: 'description', dataType: ['text'] },
        { name: 'price', dataType: ['number'] },
        { name: 'vendor', dataType: ['string'] },
        { name: 'productType', dataType: ['string'] },
        { name: 'tags', dataType: ['string[]'] },
        { name: 'available', dataType: ['boolean'] },
        { name: 'imageUrl', dataType: ['string'] },
        { name: 'handle', dataType: ['string'] },
        { name: 'shopDomain', dataType: ['string'] },
        { name: 'metadata', dataType: ['object'] },
      ],
    };
    
    await this.client.schema.classCreator().withClass(classObj).do();
    console.log(`Created Weaviate class: ${this.className}`);
  }
  
  async upsertProduct(product: VectorDBProduct, embedding: number[]): Promise<string> {
    try {
      // First, try to find existing product
      const existingResult = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('_additional { id }')
        .withWhere({
          operator: 'And',
          operands: [
            {
              path: ['shopifyId'],
              operator: 'Equal',
              valueInt: product.shopifyId,
            },
            {
              path: ['shopDomain'],
              operator: 'Equal',
              valueString: product.shopDomain,
            },
          ],
        })
        .do();
      
      const existingId = existingResult.data?.Get?.[this.className]?.[0]?._additional?.id;
      
      const dataObject = {
        shopifyId: product.shopifyId,
        title: product.title,
        description: product.description,
        price: product.price,
        vendor: product.vendor,
        productType: product.productType,
        tags: product.tags,
        available: product.available,
        imageUrl: product.imageUrl,
        handle: product.handle,
        shopDomain: product.shopDomain,
        metadata: product.metadata || {},
      };
      
      if (existingId) {
        // Update existing
        await this.client.data
          .updater()
          .withClassName(this.className)
          .withId(existingId)
          .withProperties(dataObject)
          .withVector(embedding)
          .do();
        return existingId;
      } else {
        // Create new
        const result = await this.client.data
          .creator()
          .withClassName(this.className)
          .withProperties(dataObject)
          .withVector(embedding)
          .do();
        return result.id || '';
      }
    } catch (error) {
      console.error('Failed to upsert product:', error);
      throw error;
    }
  }
  
  async deleteProduct(shopifyId: number, shopDomain: string): Promise<boolean> {
    try {
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('_additional { id }')
        .withWhere({
          operator: 'And',
          operands: [
            {
              path: ['shopifyId'],
              operator: 'Equal',
              valueInt: shopifyId,
            },
            {
              path: ['shopDomain'],
              operator: 'Equal',
              valueString: shopDomain,
            },
          ],
        })
        .do();
      
      const productId = result.data?.Get?.[this.className]?.[0]?._additional?.id;
      
      if (productId) {
        await this.client.data
          .deleter()
          .withClassName(this.className)
          .withId(productId)
          .do();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to delete product:', error);
      return false;
    }
  }
  
  async searchProducts(
    query: string,
    shopDomain: string,
    limit: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]> {
    try {
      const whereOperands: any[] = [
        {
          path: ['shopDomain'],
          operator: 'Equal',
          valueString: shopDomain,
        },
      ];
      
      // Add filters
      if (filters?.price_max) {
        whereOperands.push({
          path: ['price'],
          operator: 'LessThanEqual',
          valueNumber: filters.price_max,
        });
      }
      
      if (filters?.product_type) {
        whereOperands.push({
          path: ['productType'],
          operator: 'Like',
          valueString: `*${filters.product_type}*`,
        });
      }
      
      if (filters?.vendor) {
        whereOperands.push({
          path: ['vendor'],
          operator: 'Like',
          valueString: `*${filters.vendor}*`,
        });
      }
      
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields(`
          shopifyId 
          title 
          description 
          price 
          vendor 
          productType 
          tags 
          available 
          imageUrl 
          handle 
          shopDomain
          metadata
          _additional { 
            score 
            certainty
          }
        `)
        .withNearText({ concepts: [query] })
        .withWhere({
          operator: 'And',
          operands: whereOperands,
        })
        .withLimit(limit)
        .do();
      
      const products = result.data?.Get?.[this.className] || [];
      
      return products.map((product: any) => ({
        shopifyId: product.shopifyId,
        title: product.title,
        description: product.description,
        price: product.price,
        vendor: product.vendor,
        productType: product.productType,
        tags: product.tags || [],
        available: product.available,
        imageUrl: product.imageUrl,
        handle: product.handle,
        shopDomain: product.shopDomain,
        metadata: product.metadata,
        score: product._additional?.certainty || 0,
      }));
    } catch (error) {
      console.error('Search failed:', error);
      throw error;
    }
  }
  
  async batchUpsertProducts(
    products: Array<{ product: VectorDBProduct; embedding: number[] }>
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    
    // Process in batches of 100
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      const batchObjects = batch.map(({ product, embedding }) => ({
        class: this.className,
        properties: {
          shopifyId: product.shopifyId,
          title: product.title,
          description: product.description,
          price: product.price,
          vendor: product.vendor,
          productType: product.productType,
          tags: product.tags,
          available: product.available,
          imageUrl: product.imageUrl,
          handle: product.handle,
          shopDomain: product.shopDomain,
          metadata: product.metadata || {},
        },
        vector: embedding,
      }));
      
      try {
        const result = await this.client.batch
          .objectsBatcher()
          .withObjects(...batchObjects)
          .do();
        
        // Count successes and failures
        result.forEach((item: any) => {
          if (item.result?.errors) {
            failed++;
          } else {
            success++;
          }
        });
      } catch (error) {
        console.error('Batch insert failed:', error);
        failed += batch.length;
      }
    }
    
    return { success, failed };
  }
  
  async getProductCount(shopDomain: string): Promise<number> {
    try {
      const result = await this.client.graphql
        .aggregate()
        .withClassName(this.className)
        .withWhere({
          path: ['shopDomain'],
          operator: 'Equal',
          valueString: shopDomain,
        })
        .withFields('meta { count }')
        .do();
      
      return result.data?.Aggregate?.[this.className]?.[0]?.meta?.count || 0;
    } catch (error) {
      console.error('Failed to get product count:', error);
      return 0;
    }
  }
  
  async deleteAllProducts(shopDomain: string): Promise<number> {
    try {
      // First get all product IDs
      const result = await this.client.graphql
        .get()
        .withClassName(this.className)
        .withFields('_additional { id }')
        .withWhere({
          path: ['shopDomain'],
          operator: 'Equal',
          valueString: shopDomain,
        })
        .withLimit(10000) // Adjust based on your needs
        .do();
      
      const products = result.data?.Get?.[this.className] || [];
      const ids = products.map((p: any) => p._additional.id);
      
      // Delete in batches
      for (const id of ids) {
        await this.client.data
          .deleter()
          .withClassName(this.className)
          .withId(id)
          .do();
      }
      
      return ids.length;
    } catch (error) {
      console.error('Failed to delete all products:', error);
      throw error;
    }
  }
} 