import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const SearchIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ChatIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

// Conversational Search Component
const ConversationalSearch = ({ shopUrl, appProxyUrl, onProductClick, formatPrice, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi! I'm here to help you find the perfect products. What are you looking for today?",
      timestamp: Date.now(),
    },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState([]);
  const [suggestedResponses, setSuggestedResponses] = useState([]);
  const [context, setContext] = useState(null);
  const [error, setError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (content) => {
    if (!content.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsLoading(true);
    setError(null);

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
        const assistantMessage = {
          role: 'assistant',
          content: data.data.message,
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Update products if search was performed
        if (data.data.products && data.data.products.length > 0) {
          setProducts(data.data.products);
        } else if (!data.data.searchPerformed) {
          // Clear products if no search was performed (clarification mode)
          setProducts([]);
        }

        // Update suggestions
        setSuggestedQuestions(data.data.suggestedQuestions || []);
        setSuggestedResponses(data.data.suggestedResponses || []);

        // Update context
        if (data.data.context) {
          setContext(data.data.context);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Conversation failed:', error);
      setError('I encountered an issue. Please try again.');
      
      // Add error message to conversation
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an issue processing your request. Please try again or rephrase your question.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputSubmit = (e) => {
    e.preventDefault();
    sendMessage(currentInput);
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentInput);
    }
  };

  return (
    <div className="conversational-search">
      {/* Header */}
      <div className="conversation-header">
        <h3>Chat with AI Assistant</h3>
        <button 
          className="conversation-close-button" 
          onClick={onClose}
          aria-label="Close conversation"
          type="button"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="conversation-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`conversation-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              {message.content}
            </div>
            {message.timestamp && (
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="conversation-message assistant-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Products Grid */}
      {products.length > 0 && (
        <div className="conversation-products">
          <h4>Recommended Products</h4>
          <div className="conversation-products-grid">
            {products.map((product) => (
              <div
                key={product.id || product.shopify_product_id}
                className="conversation-product-card"
                onClick={() => onProductClick(product)}
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="product-card-image"
                    loading="lazy"
                  />
                )}
                <div className="product-card-info">
                  <h5 className="product-card-title">{product.title}</h5>
                  <p className="product-card-price">
                    {formatPrice(product.price_min)}
                  </p>
                  {product.vendor && (
                    <p className="product-card-vendor">by {product.vendor}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div className="conversation-suggestions">
          <h5>Suggested questions:</h5>
          <div className="suggestion-buttons">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                className="suggestion-button"
                onClick={() => handleSuggestionClick(question)}
                type="button"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Responses */}
      {suggestedResponses.length > 0 && !suggestedQuestions.length && (
        <div className="conversation-suggestions">
          <h5>You might be interested in:</h5>
          <div className="suggestion-buttons">
            {suggestedResponses.map((response, index) => (
              <button
                key={index}
                className="suggestion-button"
                onClick={() => handleSuggestionClick(response)}
                type="button"
              >
                {response}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form className="conversation-input-form" onSubmit={handleInputSubmit}>
        <div className="conversation-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="conversation-input"
            placeholder="Type your message here..."
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            aria-label="Type your message"
          />
          <button
            type="submit"
            className="conversation-send-button"
            disabled={!currentInput.trim() || isLoading}
            aria-label="Send message"
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        </div>
      </form>

      {error && (
        <div className="conversation-error">
          {error}
        </div>
      )}
    </div>
  );
};

const AISearchApp = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState(null);
  const [searchMode, setSearchMode] = useState('traditional'); // 'traditional' or 'conversational'
  const searchInputRef = useRef(null);
  const modalInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Get data attributes from root element
  const rootElement = document.getElementById('ai-search-root');
  const shopUrl = rootElement?.dataset?.shopUrl || window.Shopify?.shop || '';
  const appProxyUrl = rootElement?.dataset?.appProxyUrl || '/apps/xpertsearch';
  const displayMode = rootElement?.dataset?.displayMode || window.AISearchConfig?.displayMode || 'bar';
  const resultsLimit = parseInt(rootElement?.dataset?.resultsLimit || window.AISearchConfig?.resultsLimit || 10, 10);
  const placeholderText = rootElement?.dataset?.placeholder || window.AISearchConfig?.placeholderText || 'Search for products...';

  // Close modal on escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Search function
  const performSearch = async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extract shop domain from URL
      const shopDomain = shopUrl.replace('https://', '').replace('http://', '').replace('/', '');
      const searchUrl = `${appProxyUrl}/api/search?q=${encodeURIComponent(searchQuery)}&shop=${shopDomain}`;
      
      console.log('Performing search:', searchUrl);

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
        setResults(data.data.products);
        console.log(`Found ${data.data.products.length} products`);
      } else {
        setResults([]);
        if (data.error) {
          console.error('Search error:', data.error);
          setError(data.error);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Search is currently unavailable. Please try again later.');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search (3 seconds)
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for 3 seconds
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 3000);
  };

  // Handle search button click or enter key
  const handleSearch = () => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    performSearch(query);
  };

  // Handle key press (Enter to search)
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Open modal
  const openModal = () => {
    setIsModalOpen(true);
    // Focus input after modal animation
    setTimeout(() => {
      if (modalInputRef.current) {
        modalInputRef.current.focus();
      }
    }, 100);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setQuery('');
    setResults([]);
    setError(null);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  // Handle product click
  const handleProductClick = (product) => {
    const productUrl = product.handle ? `/products/${product.handle}` : '#';
    window.location.href = productUrl;
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return 'Price varies';
    
    // Get currency from Shopify if available
    const currency = window.Shopify?.currency?.active || 'USD';
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    });
    
    return formatter.format(price);
  };

  return (
    <>
      {/* Widget - Button or Bar */}
      <div className={`ai-search-container ${displayMode === 'button' ? 'button-mode' : 'bar-mode'}`}>
        {displayMode === 'button' ? (
          <button 
            className="ai-search-button" 
            onClick={openModal}
            aria-label="Open search"
            type="button"
          >
            <SearchIcon />
            <span className="button-text">Search</span>
          </button>
        ) : (
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="ai-search-input"
              placeholder={placeholderText}
              value={query}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onFocus={openModal}
              aria-label="Search products"
              readOnly
            />
            <button 
              className="search-icon-button"
              onClick={openModal}
              aria-label="Open search"
              type="button"
            >
              <SearchIcon />
            </button>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {isModalOpen && (
        <div className="ai-search-modal-overlay" onClick={closeModal}>
          <div className="ai-search-modal" onClick={(e) => e.stopPropagation()}>
            {searchMode === 'conversational' ? (
              <ConversationalSearch
                shopUrl={shopUrl}
                appProxyUrl={appProxyUrl}
                onProductClick={handleProductClick}
                formatPrice={formatPrice}
                onClose={closeModal}
              />
            ) : (
              <>
                <div className="modal-header">
                  <div className="modal-search-input-wrapper">
                    <input
                      ref={modalInputRef}
                      type="text"
                      className="modal-search-input"
                      placeholder={placeholderText}
                      value={query}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      aria-label="Search products"
                    />
                    <button 
                      className="modal-search-button"
                      onClick={handleSearch}
                      aria-label="Search"
                      type="button"
                    >
                      <SearchIcon />
                    </button>
                  </div>
                  <div className="modal-mode-toggle">
                    <button
                      className={`mode-toggle-button ${searchMode === 'traditional' ? 'active' : ''}`}
                      onClick={() => setSearchMode('traditional')}
                      aria-label="Traditional search"
                      type="button"
                    >
                      <SearchIcon />
                    </button>
                    <button
                      className={`mode-toggle-button ${searchMode === 'conversational' ? 'active' : ''}`}
                      onClick={() => setSearchMode('conversational')}
                      aria-label="Chat with AI"
                      type="button"
                    >
                      <ChatIcon />
                    </button>
                  </div>
                  <button 
                    className="modal-close-button" 
                    onClick={closeModal}
                    aria-label="Close search"
                    type="button"
                  >
                    <CloseIcon />
                  </button>
                </div>

                <div className="modal-content">
                  {isLoading ? (
                    <div className="search-loading">
                      <div className="loading-spinner"></div>
                      <span>Searching...</span>
                    </div>
                  ) : error ? (
                    <div className="search-error">{error}</div>
                  ) : results.length > 0 ? (
                    <div className="search-results-grid">
                      {results.map((product) => (
                        <div
                          key={product.id || product.shopify_product_id}
                          className="search-result-card"
                          onClick={() => handleProductClick(product)}
                        >
                          {product.image_url && (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="result-card-image"
                              loading="lazy"
                            />
                          )}
                          <div className="result-card-info">
                            <h3 className="result-card-title">{product.title}</h3>
                            <p className="result-card-price">
                              {formatPrice(product.price_min)}
                            </p>
                            {product.vendor && (
                              <p className="result-card-vendor">by {product.vendor}</p>
                            )}
                            {product.similarity_score && (
                              <span className="result-card-score">
                                {Math.round(product.similarity_score * 100)}% match
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : query.length > 0 ? (
                    <div className="no-results-message">
                      <SearchIcon />
                      <h3>No results found for "{query}"</h3>
                      <p>Try different keywords or check your spelling</p>
                    </div>
                  ) : (
                    <div className="search-prompt">
                      <SearchIcon />
                      <h3>Start typing to search</h3>
                      <p>Search will begin automatically after 3 seconds, or press Enter to search immediately</p>
                      <div className="search-mode-hint">
                        <p>💡 <strong>Try the AI Chat mode</strong> - Click the <ChatIcon /> icon for conversational search!</p>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

// Initialize the app when DOM is ready
function initializeApp() {
  const container = document.getElementById('ai-search-root');
  if (container) {
    console.log('Initializing AI Search App...');
    try {
      // Pass config from window to container dataset for React component
      if (window.AISearchConfig) {
        Object.entries(window.AISearchConfig).forEach(([key, value]) => {
          container.dataset[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        });
      }
      
      const root = createRoot(container);
      root.render(<AISearchApp />);
      console.log('AI Search App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Search App:', error);
    }
  } else {
    console.error('AI Search root element not found');
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for testing
export default AISearchApp;