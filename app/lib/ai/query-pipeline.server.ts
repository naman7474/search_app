// app/lib/ai/query-pipeline.server.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { spellCorrect } from './spell-correction.server';

// Initialize Gemini if API key is available
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_AI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}

export type SearchIntent = 
  | 'navigational'      // Looking for specific product/brand
  | 'informational'     // Researching/comparing products
  | 'transactional'     // Ready to buy
  | 'product_search';   // General product search

export interface Entity {
  type: 'price' | 'color' | 'brand' | 'category' | 'material' | 'size' | 'occasion';
  value: any;
  confidence: number;
}

export interface ProcessedQuery {
  original: string;
  corrected: string;
  intent: SearchIntent;
  entities: Entity[];
  expandedTerms: string[];
  filters: SearchFilters;
}

export interface SearchFilters {
  priceRange?: { min?: number; max?: number };
  colors?: string[];
  vendor?: string;
  productType?: string;
  materials?: string[];
  sizes?: string[];
  tags?: string[];
}

export class QueryPipeline {
  /**
   * Process query through all pipeline steps
   */
  async process(query: string): Promise<ProcessedQuery> {
    // Step 1: Spell correction
    const correctedQuery = await this.spellCorrect(query);
    
    // Step 2: Intent detection
    const intent = await this.detectIntent(correctedQuery);
    
    // Step 3: Entity extraction
    const entities = await this.extractEntities(correctedQuery);
    
    // Step 4: Query expansion
    const expandedTerms = await this.expandQuery(correctedQuery, entities);
    
    return {
      original: query,
      corrected: correctedQuery,
      intent,
      entities,
      expandedTerms,
      filters: this.entitiesToFilters(entities),
    };
  }
  
  /**
   * Step 1: Spell correction
   */
  private async spellCorrect(query: string): Promise<string> {
    return spellCorrect(query);
  }
  
  /**
   * Step 2: Detect search intent
   */
  private async detectIntent(query: string): Promise<SearchIntent> {
    // Try LLM-based detection first
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `Classify this e-commerce search query intent:
- navigational: looking for specific product/brand
- informational: researching/comparing products  
- transactional: ready to buy

Query: "${query}"
Intent:`;
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 50,
          }
        });
        
        const response = result.response.text().toLowerCase().trim();
        if (response.includes('navigational')) return 'navigational';
        if (response.includes('informational')) return 'informational';
        if (response.includes('transactional')) return 'transactional';
      } catch (error) {
        console.error('Intent detection failed:', error);
      }
    }
    
    // Rule-based fallback
    const lowerQuery = query.toLowerCase();
    
    // Navigational indicators
    if (lowerQuery.match(/\b(nike|adidas|puma|reebok|levis|gap|zara|uniqlo)\b/)) {
      return 'navigational';
    }
    
    // Informational indicators
    if (lowerQuery.match(/\b(compare|vs|versus|difference|best|review|which)\b/)) {
      return 'informational';
    }
    
    // Transactional indicators
    if (lowerQuery.match(/\b(buy|purchase|cheap|discount|sale|deal|offer)\b/)) {
      return 'transactional';
    }
    
    return 'product_search';
  }
  
  /**
   * Step 3: Extract entities from query
   */
  private async extractEntities(query: string): Promise<Entity[]> {
    const entities: Entity[] = [];
    const lowerQuery = query.toLowerCase();
    
    // Extract price entities
    const priceMatch = lowerQuery.match(/under \$?(\d+)|below \$?(\d+)|less than \$?(\d+)|\$(\d+) to \$(\d+)/);
    if (priceMatch) {
      if (priceMatch[4] && priceMatch[5]) {
        entities.push({
          type: 'price',
          value: { min: parseInt(priceMatch[4]), max: parseInt(priceMatch[5]) },
          confidence: 0.9
        });
      } else {
        const maxPrice = parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]);
        entities.push({
          type: 'price',
          value: { max: maxPrice },
          confidence: 0.9
        });
      }
    }
    
    // Extract color entities
    const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 
                   'pink', 'purple', 'orange', 'brown', 'beige', 'navy', 'gold', 'silver'];
    colors.forEach(color => {
      if (lowerQuery.includes(color)) {
        entities.push({
          type: 'color',
          value: color,
          confidence: 0.8
        });
      }
    });
    
    // Extract category entities
    const categories = ['dress', 'shirt', 'shoes', 'pants', 'jacket', 'sweater', 
                       'jeans', 'coat', 'bag', 'watch', 'jewelry', 'accessories'];
    categories.forEach(category => {
      if (lowerQuery.includes(category)) {
        entities.push({
          type: 'category',
          value: category,
          confidence: 0.8
        });
      }
    });
    
    // Extract material entities
    const materials = ['cotton', 'silk', 'wool', 'leather', 'denim', 'polyester', 
                      'nylon', 'linen', 'cashmere', 'velvet', 'suede'];
    materials.forEach(material => {
      if (lowerQuery.includes(material)) {
        entities.push({
          type: 'material',
          value: material,
          confidence: 0.7
        });
      }
    });
    
    // Extract size entities
    const sizes = ['small', 'medium', 'large', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
    sizes.forEach(size => {
      if (lowerQuery.match(new RegExp(`\\b${size}\\b`))) {
        entities.push({
          type: 'size',
          value: size,
          confidence: 0.7
        });
      }
    });
    
    // Extract occasion entities
    const occasions = ['casual', 'formal', 'business', 'party', 'wedding', 
                      'evening', 'cocktail', 'work', 'office', 'gym', 'sports'];
    occasions.forEach(occasion => {
      if (lowerQuery.includes(occasion)) {
        entities.push({
          type: 'occasion',
          value: occasion,
          confidence: 0.7
        });
      }
    });
    
    return entities;
  }
  
  /**
   * Step 4: Expand query with synonyms and related terms
   */
  private async expandQuery(query: string, entities: Entity[]): Promise<string[]> {
    const expandedTerms: string[] = [query];
    
    // Synonym expansion based on entities
    entities.forEach(entity => {
      if (entity.type === 'category') {
        const synonyms = this.getCategorySynonyms(entity.value);
        expandedTerms.push(...synonyms);
      }
      
      if (entity.type === 'color') {
        const variations = this.getColorVariations(entity.value);
        expandedTerms.push(...variations);
      }
    });
    
    // Try LLM-based expansion if available
    if (genAI && expandedTerms.length < 5) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const prompt = `Generate 3-5 related search terms for this e-commerce query:
"${query}"

Include synonyms, related products, and alternative phrasings.
Return only the terms, comma-separated.`;
        
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 100,
          }
        });
        
        const response = result.response.text();
        const terms = response.split(',').map(t => t.trim()).filter(Boolean);
        expandedTerms.push(...terms);
      } catch (error) {
        console.error('Query expansion failed:', error);
      }
    }
    
    return [...new Set(expandedTerms)]; // Remove duplicates
  }
  
  /**
   * Get category synonyms
   */
  private getCategorySynonyms(category: string): string[] {
    const synonymMap: Record<string, string[]> = {
      'dress': ['dresses', 'gown', 'frock'],
      'shirt': ['shirts', 'top', 'blouse', 'tee'],
      'pants': ['trousers', 'slacks', 'bottoms'],
      'jacket': ['jackets', 'coat', 'blazer', 'outerwear'],
      'shoes': ['footwear', 'sneakers', 'boots', 'sandals'],
      'bag': ['bags', 'purse', 'handbag', 'backpack', 'tote'],
      'jewelry': ['jewellery', 'accessories', 'necklace', 'ring', 'bracelet'],
    };
    
    return synonymMap[category.toLowerCase()] || [];
  }
  
  /**
   * Get color variations
   */
  private getColorVariations(color: string): string[] {
    const variationMap: Record<string, string[]> = {
      'red': ['crimson', 'ruby', 'scarlet', 'burgundy'],
      'blue': ['navy', 'azure', 'cobalt', 'sapphire'],
      'green': ['emerald', 'olive', 'forest', 'mint'],
      'gray': ['grey', 'charcoal', 'slate', 'ash'],
      'black': ['ebony', 'onyx', 'jet', 'dark'],
      'white': ['ivory', 'cream', 'pearl', 'snow'],
    };
    
    return variationMap[color.toLowerCase()] || [];
  }
  
  /**
   * Convert entities to search filters
   */
  private entitiesToFilters(entities: Entity[]): SearchFilters {
    const filters: SearchFilters = {};
    
    entities.forEach(entity => {
      switch (entity.type) {
        case 'price':
          filters.priceRange = entity.value;
          break;
        case 'color':
          filters.colors = filters.colors || [];
          filters.colors.push(entity.value);
          break;
        case 'brand':
          filters.vendor = entity.value;
          break;
        case 'category':
          filters.productType = entity.value;
          break;
        case 'material':
          filters.materials = filters.materials || [];
          filters.materials.push(entity.value);
          break;
        case 'size':
          filters.sizes = filters.sizes || [];
          filters.sizes.push(entity.value);
          break;
        case 'occasion':
          filters.tags = filters.tags || [];
          filters.tags.push(entity.value);
          break;
      }
    });
    
    return filters;
  }
} 