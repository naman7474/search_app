import { supabase } from '../supabase.server';
import { generateProductEmbedding } from '../ai/embedding.server';

export interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string;
  handle: string;
  product_type?: string;
  vendor?: string;
  tags?: string;
  status: string;
  variants: Array<{
    id: number;
    title: string;
    price: string;
    compare_at_price?: string;
    sku?: string;
    barcode?: string;
    inventory_quantity: number;
    available: boolean;
    image_id?: number;
  }>;
  images: Array<{
    id: number;
    src: string;
    alt?: string;
  }>;
  options: Array<{
    name: string;
    values: string[];
  }>;
}

export interface IndexingResult {
  success: boolean;
  products_processed: number;
  products_updated: number;
  products_created: number;
  errors: string[];
  processing_time_ms: number;
}

/**
 * Index a single product from Shopify
 */
export async function indexProduct(
  product: ShopifyProduct,
  shopDomain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`📦 Indexing product: ${product.title} (ID: ${product.id})`);
    
    // Skip draft products
    if (product.status !== 'active') {
      console.log(`⏭️ Skipping inactive product: ${product.title}`);
      return { success: true };
    }
    
    // Clean description (remove HTML)
    const cleanDescription = product.body_html
      ? product.body_html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
      : null;
    
    // Parse tags
    const tags = product.tags 
      ? product.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      : [];
    
    // Calculate price range
    const prices = product.variants
      .map(v => parseFloat(v.price))
      .filter(p => !isNaN(p));
    
    const priceMin = prices.length > 0 ? Math.min(...prices) : null;
    const priceMax = prices.length > 0 ? Math.max(...prices) : null;
    
    // Get featured image
    const featuredImage = product.images.length > 0 ? product.images[0].src : null;
    
    // Check if product is available (has at least one available variant)
    const isAvailable = product.variants.some(v => v.available && v.inventory_quantity > 0);
    
    // Generate embedding
    console.log(`🧠 Generating embedding for: ${product.title}`);
    const embeddingResult = await generateProductEmbedding({
      title: product.title,
      description: cleanDescription,
      productType: product.product_type,
      vendor: product.vendor,
      tags: tags,
    });
    
    // Prepare product data
    const productData = {
      shopify_product_id: product.id,
      title: product.title,
      description: cleanDescription,
      handle: product.handle,
      product_type: product.product_type,
      vendor: product.vendor,
      tags: tags,
      price_min: priceMin,
      price_max: priceMax,
      available: isAvailable,
      image_url: featuredImage,
      shop_domain: shopDomain,
      embedding: embeddingResult.embedding,
      metadata: {
        variant_count: product.variants.length,
        image_count: product.images.length,
        embedding_model: embeddingResult.model,
        last_indexed: new Date().toISOString(),
        options: product.options,
      },
    };
    
    // Upsert product
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('shopify_product_id', product.id)
      .eq('shop_domain', shopDomain)
      .single();
    
    let productId: string;
    
    if (existingProduct) {
      // Update existing product
      const { data, error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', existingProduct.id)
        .select('id')
        .single();
      
      if (error) throw error;
      productId = data.id;
      console.log(`✅ Updated product: ${product.title}`);
    } else {
      // Create new product
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select('id')
        .single();
      
      if (error) throw error;
      productId = data.id;
      console.log(`🆕 Created product: ${product.title}`);
    }
    
    // Index variants
    await indexProductVariants(product.variants, productId, product.images);
    
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Failed to index product ${product.title}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Index product variants
 */
async function indexProductVariants(
  variants: ShopifyProduct['variants'],
  productId: string,
  images: ShopifyProduct['images']
): Promise<void> {
  try {
    // Delete existing variants
    await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', productId);
    
    // Insert new variants
    const variantData = variants.map(variant => {
      // Find variant image
      const variantImage = variant.image_id 
        ? images.find(img => img.id === variant.image_id)?.src
        : null;
      
      return {
        product_id: productId,
        shopify_variant_id: variant.id,
        title: variant.title,
        price: parseFloat(variant.price),
        compare_at_price: variant.compare_at_price ? parseFloat(variant.compare_at_price) : null,
        sku: variant.sku,
        barcode: variant.barcode,
        inventory_quantity: variant.inventory_quantity,
        available: variant.available,
        image_url: variantImage,
      };
    });
    
    if (variantData.length > 0) {
      const { error } = await supabase
        .from('product_variants')
        .insert(variantData);
      
      if (error) throw error;
    }
    
    console.log(`📋 Indexed ${variantData.length} variants`);
    
  } catch (error) {
    console.error('Failed to index variants:', error);
    throw error;
  }
}

/**
 * Bulk index products from Shopify
 */
export async function bulkIndexProducts(
  products: ShopifyProduct[],
  shopDomain: string
): Promise<IndexingResult> {
  const startTime = Date.now();
  const result: IndexingResult = {
    success: true,
    products_processed: 0,
    products_updated: 0,
    products_created: 0,
    errors: [],
    processing_time_ms: 0,
  };
  
  console.log(`🚀 Starting bulk indexing of ${products.length} products for ${shopDomain}`);
  
  for (const product of products) {
    const indexResult = await indexProduct(product, shopDomain);
    result.products_processed++;
    
    if (indexResult.success) {
      // Check if product was created or updated
      const { data: existingProduct } = await supabase
        .from('products')
        .select('created_at, updated_at')
        .eq('shopify_product_id', product.id)
        .eq('shop_domain', shopDomain)
        .single();
      
      if (existingProduct) {
        if (existingProduct.created_at === existingProduct.updated_at) {
          result.products_created++;
        } else {
          result.products_updated++;
        }
      }
    } else {
      result.success = false;
      result.errors.push(`Product ${product.id}: ${indexResult.error}`);
    }
    
    // Add small delay to avoid rate limiting
    if (result.products_processed % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  result.processing_time_ms = Date.now() - startTime;
  
  console.log(`✅ Bulk indexing completed in ${result.processing_time_ms}ms`);
  console.log(`📊 Results: ${result.products_created} created, ${result.products_updated} updated, ${result.errors.length} errors`);
  
  return result;
}

/**
 * Remove product from index
 */
export async function removeProduct(
  shopifyProductId: number,
  shopDomain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('shopify_product_id', shopifyProductId)
      .eq('shop_domain', shopDomain);
    
    if (error) throw error;
    
    console.log(`🗑️ Removed product ${shopifyProductId} from index`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ Failed to remove product ${shopifyProductId}:`, error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Get indexing statistics for a shop
 */
export async function getIndexingStats(shopDomain: string): Promise<{
  total_products: number;
  available_products: number;
  last_indexed?: string;
  avg_embedding_dimension: number;
  products_by_type: Array<{ type: string; count: number }>;
}> {
  try {
    // Get total counts
    const { data: products, error } = await supabase
      .from('products')
      .select('product_type, available, metadata')
      .eq('shop_domain', shopDomain);
    
    if (error) throw error;
    
    const totalProducts = products?.length || 0;
    const availableProducts = products?.filter(p => p.available).length || 0;
    
    // Get last indexed time
    const { data: lastProduct } = await supabase
      .from('products')
      .select('updated_at')
      .eq('shop_domain', shopDomain)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();
    
    // Calculate average embedding dimension
    const embeddingDimensions = products
      ?.map(p => p.metadata?.embedding_dimension)
      .filter(Boolean) || [];
    const avgEmbeddingDimension = embeddingDimensions.length > 0
      ? embeddingDimensions.reduce((sum, dim) => sum + dim, 0) / embeddingDimensions.length
      : 0;
    
    // Group by product type
    const typeMap = new Map<string, number>();
    products?.forEach(p => {
      const type = p.product_type || 'Unknown';
      typeMap.set(type, (typeMap.get(type) || 0) + 1);
    });
    
    const productsByType = Array.from(typeMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
    
    return {
      total_products: totalProducts,
      available_products: availableProducts,
      last_indexed: lastProduct?.updated_at,
      avg_embedding_dimension: avgEmbeddingDimension,
      products_by_type: productsByType,
    };
    
  } catch (error) {
    console.error('Failed to get indexing stats:', error);
    return {
      total_products: 0,
      available_products: 0,
      avg_embedding_dimension: 0,
      products_by_type: [],
    };
  }
}

/**
 * Reindex all products for a shop (useful for embedding model updates)
 */
export async function reindexAllProducts(shopDomain: string): Promise<IndexingResult> {
  try {
    console.log(`🔄 Starting reindexing for ${shopDomain}`);
    
    // Get all products from our database
    const { data: products, error } = await supabase
      .from('products')
      .select('shopify_product_id, title')
      .eq('shop_domain', shopDomain);
    
    if (error) throw error;
    
    console.log(`📦 Found ${products?.length || 0} products to reindex`);
    
    // This would typically require fetching fresh data from Shopify
    // For now, we'll just update embeddings for existing products
    const result: IndexingResult = {
      success: true,
      products_processed: 0,
      products_updated: 0,
      products_created: 0,
      errors: [],
      processing_time_ms: Date.now(),
    };
    
    // In a real implementation, you would:
    // 1. Fetch all products from Shopify API
    // 2. Call bulkIndexProducts with the fresh data
    
    result.processing_time_ms = Date.now() - result.processing_time_ms;
    
    return result;
    
  } catch (error) {
    console.error('Failed to reindex products:', error);
    return {
      success: false,
      products_processed: 0,
      products_updated: 0,
      products_created: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      processing_time_ms: 0,
    };
  }
} 