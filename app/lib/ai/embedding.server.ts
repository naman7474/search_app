import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';

// Initialize AI clients
const googleAI = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  tokens?: number;
}

/**
 * Generate embeddings using Google's embedding model or OpenAI as fallback
 */
export async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  // Try Google Gemini first
  if (googleAI) {
    try {
      const model = googleAI.getGenerativeModel({ model: "embedding-001" });
      const result = await model.embedContent(text);
      
      if (result.embedding && result.embedding.values) {
        return {
          embedding: result.embedding.values,
          model: 'google-embedding-001',
        };
      }
    } catch (error) {
      console.error('Google embedding failed:', error);
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI
  if (openai) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
        encoding_format: 'float',
      });

      return {
        embedding: response.data[0].embedding,
        model: 'text-embedding-ada-002',
        tokens: response.usage?.total_tokens,
      };
    } catch (error) {
      console.error('OpenAI embedding failed:', error);
      throw error;
    }
  }

  throw new Error('No embedding service available. Please configure GOOGLE_AI_API_KEY or OPENAI_API_KEY');
}

/**
 * Generate embeddings for product content (title + description + metadata)
 */
export async function generateProductEmbedding(product: {
  title: string;
  description?: string | null;
  productType?: string | null;
  vendor?: string | null;
  tags?: string[] | null;
}): Promise<EmbeddingResult> {
  // Construct a comprehensive text representation of the product
  const parts: string[] = [];
  
  // Add title (most important)
  if (product.title) {
    parts.push(product.title);
  }
  
  // Add description
  if (product.description) {
    // Clean HTML tags and trim whitespace
    const cleanDescription = product.description
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    parts.push(cleanDescription);
  }
  
  // Add product type
  if (product.productType) {
    parts.push(`Type: ${product.productType}`);
  }
  
  // Add vendor
  if (product.vendor) {
    parts.push(`Brand: ${product.vendor}`);
  }
  
  // Add tags
  if (product.tags && product.tags.length > 0) {
    parts.push(`Tags: ${product.tags.join(', ')}`);
  }
  
  const fullText = parts.join('\n');
  
  if (fullText.trim().length === 0) {
    throw new Error('Product must have at least title or description');
  }
  
  return generateEmbedding(fullText);
}

/**
 * Generate embedding for search query
 */
export async function generateQueryEmbedding(query: string): Promise<EmbeddingResult> {
  // For queries, we might want to do some preprocessing
  const cleanQuery = query.trim().toLowerCase();
  return generateEmbedding(cleanQuery);
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
} 