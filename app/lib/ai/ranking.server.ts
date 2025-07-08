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

export interface ProductCandidate {
  id: string;
  shopify_product_id: number;
  title: string;
  description?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  vendor?: string | null;
  product_type?: string | null;
  tags?: string[] | null;
  similarity_score: number;
  available: boolean;
}

export interface RankingResult {
  ranked_products: ProductCandidate[];
  reasoning?: string;
  model_used: string;
}

const RANKING_PROMPT = `
You are an expert e-commerce product relevance judge. Your job is to rank products based on how well they match a user's search query and intent.

You will be given:
1. A user's search query
2. The parsed intent and filters
3. A list of product candidates with their details

Your task is to rank these products from most relevant (1) to least relevant, considering:
- Semantic relevance to the query
- Match with explicit filters (price, category, brand, etc.)
- Product availability (prioritize available products)
- User intent (product search vs recommendation vs comparison)
- Overall quality and appeal

Return a JSON object with this structure:
{
  "rankings": [product_id_1, product_id_2, product_id_3, ...],
  "reasoning": "Brief explanation of ranking decisions"
}

Guidelines:
1. Products that match explicit filters should rank higher
2. Available products should generally rank higher than unavailable ones
3. For recommendation queries, prioritize popular/high-quality items
4. For specific product searches, prioritize exact matches
5. Consider price reasonableness for the product type
6. Factor in brand reputation where relevant

Example:
Query: "red evening dress under $100"
Intent: product_search
Filters: {"color": "red", "price_max": 100, "product_type": "dress"}

Product candidates:
1. "Elegant Red Evening Gown" - $89, available, formal dress
2. "Red Casual Sundress" - $45, available, casual dress  
3. "Blue Evening Dress" - $85, available, wrong color
4. "Red Evening Dress" - $150, available, over budget

Expected ranking: [1, 2, 4, 3]
Reasoning: Product 1 matches all criteria perfectly. Product 2 matches color and budget but is casual. Product 4 matches style and color but exceeds budget. Product 3 doesn't match the color requirement.
`;

/**
 * Rank products using LLM-based relevance scoring
 */
export async function rankProducts(
  query: string,
  intent: string,
  filters: Record<string, any>,
  candidates: ProductCandidate[]
): Promise<RankingResult> {
  if (candidates.length === 0) {
    return {
      ranked_products: [],
      model_used: 'none',
    };
  }

  // If we have 10 or fewer candidates, try LLM ranking
  if (candidates.length <= 10) {
    const llmResult = await rankWithLLM(query, intent, filters, candidates);
    if (llmResult) {
      return llmResult;
    }
  }

  // Fallback to heuristic ranking
  return rankWithHeuristics(query, intent, filters, candidates);
}

/**
 * LLM-based ranking for smaller candidate sets
 */
async function rankWithLLM(
  query: string,
  intent: string,
  filters: Record<string, any>,
  candidates: ProductCandidate[]
): Promise<RankingResult | null> {
  const candidatesText = candidates.map((product, index) => 
    `${index + 1}. ID: ${product.id}
    Title: ${product.title}
    Description: ${product.description?.substring(0, 200) || 'N/A'}
    Price: ${product.price_min ? `$${product.price_min}` : 'N/A'}${product.price_max && product.price_max !== product.price_min ? ` - $${product.price_max}` : ''}
    Brand: ${product.vendor || 'N/A'}
    Type: ${product.product_type || 'N/A'}
    Tags: ${product.tags?.join(', ') || 'N/A'}
    Available: ${product.available}
    Similarity: ${product.similarity_score.toFixed(3)}`
  ).join('\n\n');

  const prompt = `${RANKING_PROMPT}

Query: "${query}"
Intent: ${intent}
Filters: ${JSON.stringify(filters)}

Product candidates:
${candidatesText}

Rank these products and provide your reasoning:`;

  // Try Google Gemini first
  if (googleAI) {
    try {
      const model = googleAI.getGenerativeModel({ 
        model: 'gemini-1.5-flash',
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1500,
        },
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const ranking = parseLLMRanking(text, candidates);
      if (ranking) {
        return {
          ...ranking,
          model_used: 'gemini-1.5-flash',
        };
      }
    } catch (error) {
      console.error('Gemini ranking failed:', error);
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
            content: 'You are an expert e-commerce product relevance judge. Always respond with valid JSON only.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const ranking = parseLLMRanking(content, candidates);
        if (ranking) {
          return {
            ...ranking,
            model_used: 'gpt-3.5-turbo',
          };
        }
      }
    } catch (error) {
      console.error('OpenAI ranking failed:', error);
    }
  }

  return null;
}

/**
 * Parse LLM ranking response
 */
function parseLLMRanking(text: string, candidates: ProductCandidate[]): { ranked_products: ProductCandidate[]; reasoning?: string } | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.rankings || !Array.isArray(parsed.rankings)) return null;

    // Map product IDs back to products
    const rankedProducts: ProductCandidate[] = [];
    const candidateMap = new Map(candidates.map(p => [p.id, p]));

    for (const productId of parsed.rankings) {
      const product = candidateMap.get(productId);
      if (product) {
        rankedProducts.push(product);
      }
    }

    // Add any missing products at the end
    for (const candidate of candidates) {
      if (!rankedProducts.find(p => p.id === candidate.id)) {
        rankedProducts.push(candidate);
      }
    }

    return {
      ranked_products: rankedProducts,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('Failed to parse LLM ranking:', error);
    return null;
  }
}

/**
 * Heuristic-based ranking for larger candidate sets or LLM fallback
 */
function rankWithHeuristics(
  query: string,
  intent: string,
  filters: Record<string, any>,
  candidates: ProductCandidate[]
): RankingResult {
  const queryWords = query.toLowerCase().split(/\s+/);
  
  const scoredProducts = candidates.map(product => {
    let score = product.similarity_score; // Base semantic similarity
    
    // Boost available products
    if (product.available) {
      score += 0.1;
    } else {
      score -= 0.2;
    }
    
    // Filter matching bonuses
    if (filters.price_max && product.price_min && product.price_min <= filters.price_max) {
      score += 0.15;
    }
    
    if (filters.price_min && product.price_max && product.price_max >= filters.price_min) {
      score += 0.1;
    }
    
    if (filters.product_type && product.product_type) {
      if (product.product_type.toLowerCase().includes(filters.product_type.toLowerCase())) {
        score += 0.2;
      }
    }
    
    if (filters.vendor && product.vendor) {
      if (product.vendor.toLowerCase().includes(filters.vendor.toLowerCase())) {
        score += 0.15;
      }
    }
    
    if (filters.tags && product.tags) {
      const matchingTags = filters.tags.filter((tag: string) =>
        product.tags!.some(pTag => pTag.toLowerCase().includes(tag.toLowerCase()))
      );
      score += matchingTags.length * 0.05;
    }
    
    // Title relevance boost
    const titleWords = product.title.toLowerCase().split(/\s+/);
    const titleMatches = queryWords.filter(qWord => 
      titleWords.some(tWord => tWord.includes(qWord) || qWord.includes(tWord))
    );
    score += titleMatches.length * 0.1;
    
    // Intent-specific adjustments
    if (intent === 'recommendation') {
      // Boost products with higher prices (quality signal) for recommendations
      if (product.price_min && product.price_min > 50) {
        score += 0.05;
      }
    }
    
    return { ...product, final_score: score };
  });
  
  // Sort by final score
  scoredProducts.sort((a, b) => b.final_score - a.final_score);
  
  return {
    ranked_products: scoredProducts,
    reasoning: 'Ranked using heuristic scoring: semantic similarity + filter matches + availability + title relevance',
    model_used: 'heuristic',
  };
} 