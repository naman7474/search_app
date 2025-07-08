import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { z } from 'zod';

// Initialize AI clients
const googleAI = process.env.GOOGLE_AI_API_KEY
  ? new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY)
  : null;

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

// Schema for parsed query structure
export const ParsedQuerySchema = z.object({
  query_text: z.string().describe('Refined search query text for semantic search'),
  filters: z.object({
    price_min: z.number().optional().describe('Minimum price filter'),
    price_max: z.number().optional().describe('Maximum price filter'),
    product_type: z.string().optional().describe('Product category/type'),
    vendor: z.string().optional().describe('Brand or vendor name'),
    color: z.string().optional().describe('Color mentioned in query'),
    size: z.string().optional().describe('Size mentioned in query'),
    tags: z.array(z.string()).optional().describe('Relevant tags extracted from query'),
  }),
  intent: z.enum(['product_search', 'question', 'comparison', 'recommendation'])
    .describe('The type of intent detected in the query'),
  confidence: z.number().min(0).max(1)
    .describe('Confidence score for the parsing (0-1)'),
});

export type ParsedQuery = z.infer<typeof ParsedQuerySchema>;

const QUERY_UNDERSTANDING_PROMPT = `
You are an expert e-commerce search query analyzer. Your job is to analyze natural language search queries and extract structured information that will help find the most relevant products.

Analyze the user's search query and return a JSON object with the following structure:

{
  "query_text": "refined search query optimized for semantic search",
  "filters": {
    "price_min": optional_number,
    "price_max": optional_number,
    "product_type": "optional_category",
    "vendor": "optional_brand",
    "color": "optional_color",
    "size": "optional_size",
    "tags": ["optional", "relevant", "tags"]
  },
  "intent": "product_search|question|comparison|recommendation",
  "confidence": 0.0_to_1.0
}

Guidelines:
1. Extract explicit and implicit filters (price ranges, colors, sizes, categories, brands)
2. Refine the query_text to be optimized for semantic search (expand synonyms, add context)
3. Detect the user's intent:
   - product_search: looking for specific products
   - question: asking about product features/compatibility
   - comparison: comparing different products
   - recommendation: seeking suggestions
4. Set confidence based on how clear and specific the query is
5. For ambiguous queries, prioritize broader matching over strict filtering

Examples:
Input: "red evening dress under $100 for wedding"
Output: {
  "query_text": "red evening dress formal wedding attire",
  "filters": {
    "price_max": 100,
    "color": "red",
    "product_type": "dress",
    "tags": ["evening", "formal", "wedding"]
  },
  "intent": "product_search",
  "confidence": 0.9
}

Input: "best gaming laptop for GTA6"
Output: {
  "query_text": "gaming laptop high performance GTA6 compatible",
  "filters": {
    "product_type": "laptop",
    "tags": ["gaming", "high-performance"]
  },
  "intent": "recommendation",
  "confidence": 0.8
}

Now analyze this query:
`;

/**
 * Parse a natural language query using LLM
 */
export async function parseQuery(query: string): Promise<ParsedQuery> {
  if (!query || query.trim().length === 0) {
    throw new Error('Query cannot be empty');
  }

  const userPrompt = `${QUERY_UNDERSTANDING_PROMPT}"${query}"`;

  // Try Google Gemini first
  if (googleAI) {
    try {
      const model = googleAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        },
      });

      const result = await model.generateContent(userPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return ParsedQuerySchema.parse(parsed);
      }
    } catch (error) {
      console.error('Gemini query parsing failed:', error);
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI
  if (openai) {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert e-commerce search query analyzer. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        // Extract JSON from the response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return ParsedQuerySchema.parse(parsed);
        }
      }
    } catch (error) {
      console.error('OpenAI query parsing failed:', error);
      // Fall through to basic parsing
    }
  }

  // Fallback: Basic rule-based parsing
  return parseQueryBasic(query);
}

/**
 * Basic rule-based query parsing as fallback
 */
function parseQueryBasic(query: string): ParsedQuery {
  const cleanQuery = query.trim().toLowerCase();
  const filters: any = {};
  let queryText = cleanQuery;

  // Extract price ranges
  const priceMatches = cleanQuery.match(/(?:under|below|<|less than)\s*\$?(\d+(?:\.\d{2})?)/);
  if (priceMatches) {
    filters.price_max = parseFloat(priceMatches[1]);
    queryText = queryText.replace(priceMatches[0], '').trim();
  }

  const priceRangeMatches = cleanQuery.match(/\$?(\d+(?:\.\d{2})?)\s*(?:to|-)?\s*\$?(\d+(?:\.\d{2})?)/);
  if (priceRangeMatches) {
    filters.price_min = parseFloat(priceRangeMatches[1]);
    filters.price_max = parseFloat(priceRangeMatches[2]);
    queryText = queryText.replace(priceRangeMatches[0], '').trim();
  }

  // Extract colors
  const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'pink', 'purple', 'orange', 'gray', 'grey'];
  for (const color of colors) {
    if (cleanQuery.includes(color)) {
      filters.color = color;
      break;
    }
  }

  // Extract sizes
  const sizes = ['xs', 'small', 's', 'medium', 'm', 'large', 'l', 'xl', 'xxl', '2xl', '3xl'];
  for (const size of sizes) {
    if (cleanQuery.includes(size)) {
      filters.size = size;
      break;
    }
  }

  // Determine intent
  let intent: ParsedQuery['intent'] = 'product_search';
  if (cleanQuery.includes('best') || cleanQuery.includes('recommend') || cleanQuery.includes('suggest')) {
    intent = 'recommendation';
  } else if (cleanQuery.includes('vs') || cleanQuery.includes('compare') || cleanQuery.includes('difference')) {
    intent = 'comparison';
  } else if (cleanQuery.includes('?') || cleanQuery.includes('how') || cleanQuery.includes('what') || cleanQuery.includes('which')) {
    intent = 'question';
  }

  return {
    query_text: queryText.trim() || query,
    filters,
    intent,
    confidence: 0.6, // Lower confidence for basic parsing
  };
}

/**
 * Expand query with synonyms and related terms
 */
export function expandQueryTerms(query: string): string[] {
  const synonyms: Record<string, string[]> = {
    'laptop': ['notebook', 'computer', 'pc'],
    'phone': ['mobile', 'smartphone', 'cell phone'],
    'shoes': ['footwear', 'sneakers', 'boots'],
    'dress': ['gown', 'frock', 'attire'],
    'shirt': ['top', 'blouse', 'tee'],
    'pants': ['trousers', 'jeans', 'bottoms'],
    'bag': ['purse', 'handbag', 'backpack'],
    'watch': ['timepiece', 'clock'],
    'headphones': ['earphones', 'earbuds', 'headset'],
  };

  const terms = [query];
  const words = query.toLowerCase().split(/\s+/);
  
  for (const word of words) {
    if (synonyms[word]) {
      terms.push(...synonyms[word]);
    }
  }
  
  return [...new Set(terms)]; // Remove duplicates
} 