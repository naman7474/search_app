import { GoogleGenerativeAI } from '@google/generative-ai';
import { openai } from './openai.server';

export interface ParsedQuery {
  query_text: string;
  filters: Record<string, any>;
  intent: string;
  confidence: number;
}

// Initialize Gemini with proper error handling
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_AI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}

/**
 * Parse natural language query into structured format
 */
export async function parseQuery(query: string): Promise<ParsedQuery> {
  console.log('SEARCH_STEP_1_START: Parsing query:', query);
  
  try {
    // Try Gemini first if available
    if (genAI && process.env.GOOGLE_AI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        
        const prompt = `Analyze this e-commerce search query and return a JSON response with:
- query_text: expanded query with synonyms and related terms
- filters: extracted filters like color, price, category, tags, etc.
- intent: type of search (product_search, navigational, question)
- confidence: confidence score 0-1

Query: "${query}"

Example response:
{
  "query_text": "red evening dress formal gown",
  "filters": {
    "color": "red",
    "product_type": "dress",
    "occasion": "evening",
    "price_max": 100
  },
  "intent": "product_search",
  "confidence": 0.9
}

Return only valid JSON, no markdown or explanation.`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.1,
            maxOutputTokens: 512,
            responseMimeType: 'application/json',
          }
        });
        
        const response = await result.response;
        const text = response.text();
        
        // Parse the JSON response
        const parsed = JSON.parse(text);
        
        console.log('SEARCH_STEP_1_SUCCESS: Parsed query:', parsed);
        return parsed;
        
      } catch (geminiError: any) {
        console.error('Gemini query parsing failed:', geminiError);
        
        // If Gemini returns 503 or other errors, fall back to OpenAI
        if (geminiError.status === 503 || geminiError.message?.includes('overloaded')) {
          console.log('Gemini model overloaded, falling back to OpenAI');
        }
      }
    }
    
    // Fallback to OpenAI
    return await parseQueryWithOpenAI(query);
    
  } catch (error) {
    console.error('Query parsing error:', error);
    
    // Final fallback - return basic parsed query
    return {
      query_text: query + ' ' + expandQueryBasic(query),
      filters: extractBasicFilters(query),
      intent: 'product_search',
      confidence: 0.5
    };
  }
}

/**
 * Parse query using OpenAI as fallback
 */
async function parseQueryWithOpenAI(query: string): Promise<ParsedQuery> {
  if (!openai || !process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI not configured and Gemini failed');
  }
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{
      role: 'system',
      content: 'You are a helpful e-commerce search assistant that parses natural language queries into structured JSON.'
    }, {
      role: 'user',
      content: `Analyze this e-commerce search query and return a JSON response with:
- query_text: expanded query with synonyms and related terms
- filters: extracted filters like color, price, category, tags, etc.
- intent: type of search (product_search, navigational, question)
- confidence: confidence score 0-1

Query: "${query}"

Return only valid JSON.`
    }],
    temperature: 0.1,
    max_tokens: 500,
    response_format: { type: "json_object" }
  });
  
  const parsed = JSON.parse(completion.choices[0].message.content || '{}');
  console.log('SEARCH_STEP_1_SUCCESS: Parsed query:', parsed);
  return parsed;
}

/**
 * Basic query expansion without AI
 */
function expandQueryBasic(query: string): string {
  const expansions: Record<string, string[]> = {
    'dress': ['gown', 'frock', 'outfit'],
    'shirt': ['top', 'blouse', 'tee'],
    'pants': ['trousers', 'jeans', 'bottoms'],
    'shoe': ['footwear', 'sneaker', 'boot'],
    'bag': ['purse', 'handbag', 'tote'],
    'jacket': ['coat', 'blazer', 'outerwear'],
    'achar': ['pickle', 'achaar', 'pickled'],
    'masala': ['spice', 'blend', 'mix', 'powder']
  };
  
  let expanded = '';
  const words = query.toLowerCase().split(' ');
  
  for (const word of words) {
    if (expansions[word]) {
      expanded += ' ' + expansions[word].join(' ');
    }
    // Handle plurals
    const singular = word.replace(/s$/, '');
    if (expansions[singular]) {
      expanded += ' ' + expansions[singular].join(' ');
    }
  }
  
  return expanded.trim();
}

/**
 * Extract basic filters from query
 */
function extractBasicFilters(query: string): Record<string, any> {
  const filters: Record<string, any> = {};
  const lowerQuery = query.toLowerCase();
  
  // Extract price
  const priceMatch = lowerQuery.match(/under\s+\$?(\d+)|below\s+\$?(\d+)|less\s+than\s+\$?(\d+)/);
  if (priceMatch) {
    filters.price_max = parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]);
  }
  
  // Extract colors
  const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'pink', 'purple', 'orange', 'brown', 'gray', 'grey'];
  for (const color of colors) {
    if (lowerQuery.includes(color)) {
      filters.color = color;
      break;
    }
  }
  
  // Extract common product types
  const productTypes = ['dress', 'shirt', 'pants', 'shoe', 'bag', 'jacket', 'hat', 'watch', 'jewelry'];
  for (const type of productTypes) {
    if (lowerQuery.includes(type)) {
      filters.product_type = type;
      break;
    }
  }
  
  // Extract tags for specific queries
  if (lowerQuery.includes('achar') || lowerQuery.includes('pickle')) {
    filters.tags = ['pickle', 'achar', 'achaar'];
  }
  if (lowerQuery.includes('masala') || lowerQuery.includes('spice')) {
    if (filters.tags) {
      filters.tags.push('spice', 'masala', 'blend');
    } else {
      filters.tags = ['spice', 'masala', 'blend'];
    }
  }
  
  return filters;
}