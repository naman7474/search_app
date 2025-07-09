import React, { useState, useRef, useEffect } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ConversationContext {
  queries: string[];
  filters: Record<string, any>;
  viewedProducts: any[];
  preferences: Record<string, any>;
  sessionId: string;
}

export interface Product {
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
  image_url?: string;
  handle?: string;
}

interface UnifiedSearchProps {
  shopUrl: string;
  appProxyUrl: string;
  onProductClick: (product: Product) => void;
  formatPrice: (price: number | null | undefined) => string;
  onClose: () => void;
  placeholderText: string;
}

const UnifiedSearch: React.FC<UnifiedSearchProps> = ({
  shopUrl,
  appProxyUrl,
  onProductClick,
  formatPrice,
  onClose,
  placeholderText,
}) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [context, setContext] = useState<ConversationContext | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to results when search completes
  useEffect(() => {
    if (hasSearched && products.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasSearched, products]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const shopDomain = shopUrl.replace('https://', '').replace('http://', '').replace('/', '');
      const searchUrl = `${appProxyUrl}/api/search?q=${encodeURIComponent(searchQuery)}&shop=${shopDomain}`;
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data && data.data.products) {
        setProducts(data.data.products);
        // Initialize context for chat
        setContext({
          queries: [searchQuery],
          filters: data.data.query_info?.parsed_query?.filters || {},
          viewedProducts: [],
          preferences: {},
          sessionId: data.data.search_id || Date.now().toString(),
        });
      } else {
        setProducts([]);
        setError(data.error || 'No products found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Search is currently unavailable. Please try again later.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim());
    }
  };

  const handleRefineSearch = () => {
    setShowChat(true);
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `I found ${products.length} products for "${query}". How would you like to refine your search? You can ask me to filter by price, color, brand, or any other preferences.`,
          timestamp: Date.now(),
        },
      ]);
    }
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const sendChatMessage = async (content: string) => {
    if (!content.trim() || isChatLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const shopDomain = shopUrl.replace('https://', '').replace('http://', '').replace('/', '');
      const conversationUrl = `${appProxyUrl}/api/conversation`;

      const response = await fetch(conversationUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          shop_domain: shopDomain,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`Conversation failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.data.message,
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Update products if new search was performed
        if (data.data.products && data.data.products.length > 0) {
          setProducts(data.data.products);
        }

        // Update context
        if (data.data.context) {
          setContext(data.data.context);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat failed:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an issue processing your request. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendChatMessage(chatInput);
  };

  return (
    <div className="unified-search">
      {/* Header */}
      <div className="search-header">
        <div className="search-header-content">
          <h3>Search Products</h3>
          <button 
            className="search-close-button" 
            onClick={onClose}
            aria-label="Close search"
            type="button"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main Search Input */}
      <div className="search-input-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder={placeholderText}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              autoComplete="off"
            />
            <button 
              type="submit"
              className="search-button"
              disabled={!query.trim() || isLoading}
              aria-label="Search"
            >
              {isLoading ? (
                <div className="loading-spinner-small"></div>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.35-4.35"></path>
                </svg>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="search-loading">
          <div className="loading-spinner"></div>
          <p>Searching for products...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="search-error">
          <p>{error}</p>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && !isLoading && products.length > 0 && (
        <div ref={resultsRef} className="search-results-section">
          <div className="results-header">
            <h4>{products.length} Products Found</h4>
            <button 
              className="refine-search-button"
              onClick={handleRefineSearch}
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              Refine Search
            </button>
          </div>
          
          <div className="products-grid">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="product-card"
                onClick={() => onProductClick(product)}
              >
                {product.image_url && (
                  <div className="product-image-container">
                    <img 
                      src={product.image_url} 
                      alt={product.title}
                      className="product-image"
                    />
                  </div>
                )}
                <div className="product-info">
                  <h5 className="product-title">{product.title}</h5>
                  {product.vendor && (
                    <p className="product-vendor">{product.vendor}</p>
                  )}
                  <div className="product-price">
                    {product.price_min && formatPrice(product.price_min)}
                    {product.price_max && product.price_max !== product.price_min && (
                      <span> - {formatPrice(product.price_max)}</span>
                    )}
                  </div>
                  {!product.available && (
                    <span className="product-unavailable">Out of stock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {hasSearched && !isLoading && products.length === 0 && !error && (
        <div className="no-results">
          <h4>No products found</h4>
          <p>Try adjusting your search terms or browse our categories.</p>
        </div>
      )}

      {/* Chat Refinement Section */}
      {showChat && (
        <div className="chat-section">
          <div className="chat-header">
            <h4>Refine Your Search</h4>
            <button 
              className="chat-close-button"
              onClick={() => setShowChat(false)}
              type="button"
            >
              ×
            </button>
          </div>
          
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="chat-message assistant-message">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-form" onSubmit={handleChatSubmit}>
            <div className="chat-input-wrapper">
              <input
                ref={chatInputRef}
                type="text"
                className="chat-input"
                placeholder="Ask me to refine your search..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
              />
              <button 
                type="submit"
                className="chat-send-button"
                disabled={!chatInput.trim() || isChatLoading}
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22,2 15,22 11,13 2,9"></polygon>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export { UnifiedSearch as ConversationalSearch };
export default UnifiedSearch; 