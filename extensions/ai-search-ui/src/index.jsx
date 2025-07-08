import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchContainerRef = useRef(null);

  const shopUrl = document.getElementById('ai-search-root').dataset.shopUrl;
  const appProxyUrl = document.getElementById('ai-search-root').dataset.appProxyUrl;

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

  const handleSearch = async (searchQuery) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${appProxyUrl}/api/search?q=${encodeURIComponent(searchQuery)}&shop=${shopUrl}`);
      const data = await response.json();
      if (data.success) {
        setResults(data.data.products);
      } else {
        setResults([]);
      }
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedSearch = useRef(debounce(handleSearch, 300)).current;

  const onInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);
    debouncedSearch(value);
  };

  return (
    <div className="search-container" ref={searchContainerRef}>
      <input
        type="text"
        className="search-input"
        placeholder="Search for products..."
        value={query}
        onChange={onInputChange}
        onFocus={() => setIsOpen(true)}
      />
      <span className="search-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </span>

      {isOpen && (query.length > 0) && (
        <div className="search-results-popover">
          {isLoading ? (
            <div className="loading-spinner">Loading...</div>
          ) : (
            <ul className="results-list">
              {results.length > 0 ? (
                results.map(product => (
                  <li key={product.id} className="result-item" onClick={() => window.location.href = `/products/${product.handle}`}>
                    <img src={product.image_url} alt={product.title} className="result-item-image" />
                    <div className="result-item-info">
                      <span className="result-item-title">{product.title}</span>
                      <span className="result-item-price">${product.price_min}</span>
                    </div>
                  </li>
                ))
              ) : (
                <div className="no-results-message">No results found for "{query}"</div>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

const container = document.getElementById('ai-search-root');
const root = createRoot(container);
root.render(<App />); 