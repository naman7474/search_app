// app/lib/vector-db/interfaces.ts
export interface VectorDBProduct {
  shopifyId: number;
  title: string;
  description: string | null;
  price: number | null;
  vendor: string | null;
  productType: string | null;
  tags: string[];
  available: boolean;
  imageUrl: string | null;
  handle: string;
  shopDomain: string;
  metadata?: Record<string, any>;
}

export interface VectorSearchResult extends VectorDBProduct {
  score: number;
}

export interface VectorDBInterface {
  // Initialize the database schema
  initialize(): Promise<void>;
  
  // Product operations
  upsertProduct(product: VectorDBProduct, embedding: number[]): Promise<string>;
  deleteProduct(shopifyId: number, shopDomain: string): Promise<boolean>;
  
  // Search operations
  searchProducts(
    query: string,
    shopDomain: string,
    limit: number,
    filters?: Record<string, any>
  ): Promise<VectorSearchResult[]>;
  
  // Batch operations
  batchUpsertProducts(
    products: Array<{ product: VectorDBProduct; embedding: number[] }>
  ): Promise<{ success: number; failed: number }>;
  
  // Utility operations
  getProductCount(shopDomain: string): Promise<number>;
  deleteAllProducts(shopDomain: string): Promise<number>;
}

export interface VectorDBConfig {
  url?: string;
  apiKey?: string;
  scheme?: 'http' | 'https';
  host?: string;
} 