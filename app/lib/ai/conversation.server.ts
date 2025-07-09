import { GoogleGenerativeAI } from '@google/generative-ai';
import { openai } from './openai.server';
import { searchProducts } from '../search/search.server';
import type { ProductCandidate } from '../search/search.server';

// Initialize Gemini
let genAI: GoogleGenerativeAI | null = null;
if (process.env.GOOGLE_AI_API_KEY) {
  genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ConversationContext {
  queries: string[];
  filters: Record<string, any>;
  viewedProducts: ProductCandidate[];
  preferences: Record<string, any>;
  sessionId: string;
}

export interface ConversationResponse {
  message: string;
  products?: ProductCandidate[];
  suggestedQuestions?: string[];
  suggestedResponses?: string[];
  needsClarification?: boolean;
  searchPerformed?: boolean;
  context?: ConversationContext;
}

export interface ParsedAssistantResponse {
  query?: string;
  filters?: Record<string, any>;
  clarification?: string;
  shouldSearch: boolean;
  intent: 'search' | 'clarify' | 'recommend' | 'compare';
  confidence: number;
}

/**
 * Main conversational search engine
 */
export class ConversationalSearchEngine {
  async processConversation(
    messages: Message[],
    shopDomain: string,
    context?: ConversationContext
  ): Promise<ConversationResponse> {
    const conversationContext = context || this.initializeContext();
    
    // Build context from conversation history
    const updatedContext = await this.buildContext(messages, conversationContext);
    
    // Generate system prompt with current context
    const systemPrompt = this.buildSystemPrompt(updatedContext, shopDomain);
    
    // Get AI response
    const assistantResponse = await this.generateAssistantResponse(
      systemPrompt,
      messages
    );
    
    // Parse the assistant's response to extract search intent
    const parsed = await this.parseAssistantResponse(assistantResponse);
    
    // If the assistant wants to search, perform the search
    if (parsed.shouldSearch && parsed.query) {
      try {
        const searchResults = await searchProducts({
          query: parsed.query,
          shop_domain: shopDomain,
          limit: 8,
          filters: parsed.filters,
        });
        
        // Update context with new search
        updatedContext.queries.push(parsed.query);
        if (parsed.filters) {
          updatedContext.filters = { ...updatedContext.filters, ...parsed.filters };
        }
        
        return {
          message: this.formatProductResponse(searchResults.products, parsed.query),
          products: searchResults.products,
          suggestedQuestions: this.generateFollowUps(searchResults.products, parsed.query),
          searchPerformed: true,
          context: updatedContext,
        };
      } catch (error) {
        console.error('Search failed in conversation:', error);
        return {
          message: "I encountered an issue searching for products. Could you try rephrasing your request?",
          needsClarification: true,
          suggestedResponses: ["Show me dresses", "Find shirts under $50", "What's popular?"],
          context: updatedContext,
        };
      }
    }
    
    // If no search is needed, return clarification or recommendation
    return {
      message: assistantResponse,
      needsClarification: parsed.intent === 'clarify',
      suggestedResponses: this.generateClarificationOptions(updatedContext),
      context: updatedContext,
    };
  }
  
  private initializeContext(): ConversationContext {
    return {
      queries: [],
      filters: {},
      viewedProducts: [],
      preferences: {},
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }
  
  private async buildContext(
    messages: Message[],
    existingContext: ConversationContext
  ): Promise<ConversationContext> {
    const context = { ...existingContext };
    
    // Extract preferences and interests from conversation
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);
    const allText = userMessages.join(' ').toLowerCase();
    
    // Extract price preferences
    const priceMatch = allText.match(/under\s+\$?(\d+)|below\s+\$?(\d+)|less\s+than\s+\$?(\d+)/);
    if (priceMatch) {
      context.filters.price_max = parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3]);
    }
    
    // Extract color preferences
    const colors = ['red', 'blue', 'green', 'black', 'white', 'yellow', 'pink', 'purple', 'orange', 'brown', 'gray', 'grey'];
    for (const color of colors) {
      if (allText.includes(color)) {
        context.preferences.color = color;
        break;
      }
    }
    
    // Extract size preferences
    const sizes = ['xs', 'small', 'medium', 'large', 'xl', 'xxl', 's', 'm', 'l'];
    for (const size of sizes) {
      if (allText.includes(size)) {
        context.preferences.size = size;
        break;
      }
    }
    
    return context;
  }
  
  private buildSystemPrompt(context: ConversationContext, shopDomain: string): string {
    return `You are a helpful shopping assistant for an e-commerce store (${shopDomain}). Your goal is to help customers find products through natural conversation.

Current context:
- Previous queries: ${context.queries.length > 0 ? context.queries.join(', ') : 'none'}
- Applied filters: ${Object.keys(context.filters).length > 0 ? JSON.stringify(context.filters) : 'none'}
- Viewed products: ${context.viewedProducts.length} items
- Customer preferences: ${Object.keys(context.preferences).length > 0 ? JSON.stringify(context.preferences) : 'learning...'}

Your responsibilities:
1. **Understand customer needs** - Ask clarifying questions to understand what they're looking for
2. **Search for products** - When you have enough information, perform searches
3. **Provide recommendations** - Suggest products based on their preferences
4. **Refine searches** - Help narrow down results with follow-up questions

Guidelines:
- Be conversational and friendly
- Ask one question at a time to avoid overwhelming the customer
- When performing a search, be specific about what you're looking for
- If results are too broad, ask to narrow down (price, color, style, etc.)
- If no results, suggest alternatives or ask to adjust criteria
- Remember previous conversation context

Response format:
- If you want to search: Start with "SEARCH:" followed by the search query
- If you want to clarify: Ask a helpful question to narrow down their needs
- If you want to recommend: Suggest specific products or categories

Examples:
- Customer: "I need a dress" → You: "SEARCH: women's dresses" or "What occasion is the dress for? Casual, formal, or something specific?"
- Customer: "Something red under $100" → You: "SEARCH: red clothing under $100"
- Customer: "Show me more like the first one" → You: Use context to search for similar items`;
  }
  
  private async generateAssistantResponse(
    systemPrompt: string,
    messages: Message[]
  ): Promise<string> {
    // Try Gemini first
    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({ 
          model: 'gemini-2.0-flash',
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        });
        
        const conversationHistory = messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));
        
        const result = await model.generateContent({
          contents: [
            { role: 'user', parts: [{ text: systemPrompt }] },
            ...conversationHistory,
          ],
        });
        
        const response = await result.response;
        return response.text();
      } catch (error) {
        console.error('Gemini conversation failed:', error);
      }
    }
    
    // Fallback to OpenAI
    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
          ],
          temperature: 0.7,
          max_tokens: 800,
        });
        
        return response.choices[0]?.message?.content || "I'm having trouble processing your request. Could you try again?";
      } catch (error) {
        console.error('OpenAI conversation failed:', error);
      }
    }
    
    // Final fallback
    return "I'm having trouble understanding right now. Could you tell me what type of product you're looking for?";
  }
  
  private async parseAssistantResponse(response: string): Promise<ParsedAssistantResponse> {
    const lowerResponse = response.toLowerCase();
    
    // Check if response indicates a search should be performed
    if (response.startsWith('SEARCH:')) {
      const query = response.replace('SEARCH:', '').trim();
      return {
        query,
        shouldSearch: true,
        intent: 'search',
        confidence: 0.9,
      };
    }
    
    // Check for implicit search indicators
    const searchIndicators = [
      'let me find', 'let me search', 'here are', 'i found', 'showing you',
      'looking for products', 'here\'s what i found'
    ];
    
    const hasSearchIndicator = searchIndicators.some(indicator => 
      lowerResponse.includes(indicator)
    );
    
    if (hasSearchIndicator) {
      // Try to extract query from the response
      const query = this.extractQueryFromResponse(response);
      if (query) {
        return {
          query,
          shouldSearch: true,
          intent: 'search',
          confidence: 0.7,
        };
      }
    }
    
    // Determine intent based on response content
    if (lowerResponse.includes('?') || lowerResponse.includes('what') || lowerResponse.includes('which')) {
      return {
        shouldSearch: false,
        intent: 'clarify',
        confidence: 0.8,
        clarification: response,
      };
    }
    
    return {
      shouldSearch: false,
      intent: 'clarify',
      confidence: 0.6,
      clarification: response,
    };
  }
  
  private extractQueryFromResponse(response: string): string | undefined {
    // Simple extraction - in production, you might want more sophisticated parsing
    const words = response.split(' ');
    const productKeywords = ['dress', 'shirt', 'pants', 'shoes', 'bag', 'jacket', 'top', 'bottom'];
    const modifiers = ['red', 'blue', 'black', 'white', 'cheap', 'expensive', 'casual', 'formal'];
    
    const relevantWords = words.filter(word => 
      productKeywords.some(keyword => word.toLowerCase().includes(keyword)) ||
      modifiers.some(modifier => word.toLowerCase().includes(modifier))
    );
    
    return relevantWords.length > 0 ? relevantWords.join(' ') : undefined;
  }
  
  private formatProductResponse(products: ProductCandidate[], query: string): string {
    if (products.length === 0) {
      return `I couldn't find any products matching "${query}". Would you like to try different search terms or adjust your criteria?`;
    }
    
    const count = products.length;
    const topProduct = products[0];
    
    let message = `I found ${count} products for "${query}". `;
    
    if (topProduct) {
      message += `The top match is "${topProduct.title}"`;
      if (topProduct.price_min) {
        message += ` for $${topProduct.price_min}`;
      }
      message += '. ';
    }
    
    if (count > 3) {
      message += 'Would you like me to help narrow down the results by price, color, or style?';
    } else {
      message += 'Take a look at the options below!';
    }
    
    return message;
  }
  
  private generateFollowUps(products: ProductCandidate[], query: string): string[] {
    const suggestions: string[] = [];
    
    if (products.length > 10) {
      suggestions.push("Can you help me narrow this down by price?");
      suggestions.push("Show me only the most popular options");
      suggestions.push("Filter by brand or color");
    } else if (products.length > 0) {
      suggestions.push("Tell me more about the first option");
      suggestions.push("Show me similar items");
      suggestions.push("What's the difference between these?");
    }
    
    if (products.length === 0) {
      suggestions.push("Try a different search term");
      suggestions.push("Show me what's popular");
      suggestions.push("Browse by category");
    }
    
    // Add contextual suggestions based on product types
    const productTypes = [...new Set(products.map(p => p.product_type).filter(Boolean))];
    if (productTypes.length > 1) {
      suggestions.push(`Focus on ${productTypes[0]} only`);
    }
    
    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }
  
  private generateClarificationOptions(context: ConversationContext): string[] {
    const options: string[] = [];
    
    // Generic helpful options
    options.push("I'm looking for a specific item");
    options.push("Show me what's popular");
    options.push("I want to browse by category");
    
    // Context-based options
    if (context.queries.length === 0) {
      options.push("Help me find a gift");
      options.push("Show me new arrivals");
    } else {
      options.push("Something different");
      options.push("More like the last search");
    }
    
    return options.slice(0, 4);
  }
} 