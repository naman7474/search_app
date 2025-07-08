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

const AISearchApp = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const searchContainerRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Get data attributes from root element
  const rootElement = document.getElementById('ai-search-root');
  const shopUrl = rootElement?.dataset?.shopUrl || window.Shopify?.shop || '';
  const appProxyUrl = rootElement?.dataset?.appProxyUrl || '/apps/xpertsearch';

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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

  // Debounced search
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
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
    <div className="ai-search-container" ref={searchContainerRef}>
      <div className="search-input-wrapper">
        <input
          type="text"
          className="ai-search-input"
          placeholder="Search for products..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          aria-label="Search products"
          aria-autocomplete="list"
          aria-expanded={isOpen && query.length > 0}
          aria-controls="ai-search-results"
        />
        <span className="search-icon">
          <SearchIcon />
        </span>
      </div>

      {isOpen && query.length > 0 && (
        <div 
          className="ai-search-results-popover" 
          id="ai-search-results"
          role="listbox"
        >
          {isLoading ? (
            <div className="search-loading">
              <div className="loading-spinner"></div>
              <span>Searching...</span>
            </div>
          ) : error ? (
            <div className="search-error">{error}</div>
          ) : (
            <ul className="search-results-list" role="list">
              {results.length > 0 ? (
                results.map((product) => (
                  <li
                    key={product.id || product.shopify_product_id}
                    className="search-result-item"
                    onClick={() => handleProductClick(product)}
                    role="option"
                    tabIndex={0}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleProductClick(product);
                      }
                    }}
                  >
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="result-item-image"
                        loading="lazy"
                      />
                    )}
                    <div className="result-item-info">
                      <span className="result-item-title">{product.title}</span>
                      <span className="result-item-price">
                        {formatPrice(product.price_min)}
                      </span>
                      {product.vendor && (
                        <span className="result-item-vendor">by {product.vendor}</span>
                      )}
                    </div>
                    {product.similarity_score && (
                      <span className="result-item-score">
                        {Math.round(product.similarity_score * 100)}% match
                      </span>
                    )}
                  </li>
                ))
              ) : (
                <div className="no-results-message">
                  No results found for "{query}"
                </div>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// Initialize the app when DOM is ready
function initializeApp() {
  const container = document.getElementById('ai-search-root');
  if (container) {
    console.log('Initializing AI Search App...');
    try {
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