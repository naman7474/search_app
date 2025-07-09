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

const CameraIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
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

// Visual Search Component
const VisualSearch = ({ shopUrl, appProxyUrl, onResults, onProductClick, formatPrice, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef(null);

  // Supported file types
  const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const validateFile = (file) => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return 'Please upload a JPEG, PNG, WebP, or GIF image.';
    }
    
    if (file.size > MAX_SIZE) {
      return 'Image must be smaller than 5MB.';
    }
    
    return null;
  };

  const handleFileSelect = (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedImage(file);
    setError(null);
    setSearchResults(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => SUPPORTED_TYPES.includes(file.type));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      setError('Please drop a valid image file (JPEG, PNG, WebP, or GIF).');
    }
  };

  const performVisualSearch = async () => {
    if (!selectedImage) return;

    setIsSearching(true);
    setError(null);

    try {
      const shopDomain = shopUrl.replace('https://', '').replace('http://', '').replace('/', '');
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('shop', shopDomain);
      formData.append('limit', '20');
      formData.append('session_id', `visual-${Date.now()}`);

      const response = await fetch(`${appProxyUrl}/api/visual-search`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Search failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setSearchResults(data.data);
        onResults(data.data);
      } else {
        throw new Error(data.error || 'Visual search failed');
      }

    } catch (err) {
      console.error('Visual search error:', err);
      setError(err.message || 'Visual search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const clearSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSearchResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="visual-search-container">
      {/* Header */}
      <div className="visual-search-header">
        <h3>Visual Search</h3>
        <button 
          className="visual-search-close-button" 
          onClick={onClose}
          aria-label="Close visual search"
          type="button"
        >
          ×
        </button>
      </div>

      {/* Upload Area */}
      {!selectedImage && (
        <div
          className={`visual-search-dropzone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-content">
            <div className="dropzone-icon">📸</div>
            <p className="dropzone-text">
              Drop an image here or click to upload
            </p>
            <p className="dropzone-subtext">
              Search for similar products using photos
            </p>
            <p className="dropzone-formats">
              Supports JPEG, PNG, WebP, GIF (max 5MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_TYPES.join(',')}
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Image Preview & Controls */}
      {selectedImage && imagePreview && (
        <div className="visual-search-preview">
          <div className="preview-image-container">
            <img 
              src={imagePreview} 
              alt="Selected for visual search" 
              className="preview-image"
            />
            <button 
              className="preview-clear-button"
              onClick={clearSelection}
              aria-label="Remove image"
              type="button"
            >
              ×
            </button>
          </div>
          
          <div className="preview-actions">
            <button
              className="visual-search-button"
              onClick={performVisualSearch}
              disabled={isSearching}
              type="button"
            >
              {isSearching ? 'Searching...' : 'Find Similar Products'}
            </button>
            
            <button
              className="visual-search-button-secondary"
              onClick={clearSelection}
              disabled={isSearching}
              type="button"
            >
              Choose Different Image
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="visual-search-error">
          <p>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="visual-search-loading">
          <div className="loading-spinner"></div>
          <p>Analyzing your image and finding similar products...</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults && (
        <div className="visual-search-results">
          <div className="results-header">
            <h4>Found {searchResults.total_count} similar products</h4>
            {searchResults.visual_features && (
              <div className="extracted-features">
                <p className="features-label">Detected:</p>
                <div className="features-tags">
                  <span className="feature-tag">{searchResults.visual_features.category}</span>
                  {searchResults.visual_features.colors.slice(0, 2).map((color, idx) => (
                    <span key={idx} className="feature-tag color-tag">{color}</span>
                  ))}
                  {searchResults.visual_features.style.slice(0, 2).map((style, idx) => (
                    <span key={idx} className="feature-tag">{style}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="visual-search-products">
            {searchResults.products.map((product) => (
              <div 
                key={product.id} 
                className="visual-search-product"
                onClick={() => onProductClick(product)}
              >
                {product.image_url && (
                  <div className="product-image-container">
                    <img 
                      src={product.image_url} 
                      alt={product.title}
                      className="product-image"
                    />
                    <div className="similarity-badge">
                      {Math.round(product.similarity_score * 100)}% match
                    </div>
                  </div>
                )}
                
                <div className="product-info">
                  <h5 className="product-title">{product.title}</h5>
                  {product.vendor && (
                    <p className="product-vendor">{product.vendor}</p>
                  )}
                  <div className="product-price">
                    {product.price_min !== null && (
                      <span className="price">
                        {formatPrice(product.price_min)}
                        {product.price_max !== product.price_min && product.price_max !== null && (
                          ` - ${formatPrice(product.price_max)}`
                        )}
                      </span>
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

      {/* Instructions */}
      {!selectedImage && !isSearching && !searchResults && (
        <div className="visual-search-instructions">
          <h4>How Visual Search Works</h4>
          <ul>
            <li>📸 Upload a photo of any product</li>
            <li>🔍 AI analyzes colors, style, and features</li>
            <li>🛍️ Find similar products in this store</li>
            <li>⚡ Get results in seconds</li>
          </ul>
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
  const [searchMode, setSearchMode] = useState('traditional'); // 'traditional', 'conversational', or 'visual'
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
            ) : searchMode === 'visual' ? (
              <VisualSearch
                shopUrl={shopUrl}
                appProxyUrl={appProxyUrl}
                onResults={setResults}
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
                    <button
                      className={`mode-toggle-button ${searchMode === 'visual' ? 'active' : ''}`}
                      onClick={() => setSearchMode('visual')}
                      aria-label="Visual search"
                      type="button"
                    >
                      <CameraIcon />
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
                        <p>💡 <strong>Try our AI modes:</strong></p>
                        <p>• <ChatIcon /> <strong>Chat mode</strong> for conversational search</p>
                        <p>• <CameraIcon /> <strong>Visual search</strong> to find products using photos</p>
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