// Bundled AI Search Bar JavaScript
(function() {
    'use strict';
  
    // React and ReactDOM are expected to be available globally in Shopify themes
    const React = window.React || {};
    const ReactDOM = window.ReactDOM || {};
  
    // If React is not available, try to load it
    if (!window.React || !window.ReactDOM) {
      console.error('React and ReactDOM are required but not found. Loading from CDN...');
      
      const reactScript = document.createElement('script');
      reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
      reactScript.crossOrigin = true;
      
      const reactDOMScript = document.createElement('script');
      reactDOMScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
      reactDOMScript.crossOrigin = true;
      
      reactScript.onload = () => {
        reactDOMScript.onload = () => {
          initializeSearchApp();
        };
        document.head.appendChild(reactDOMScript);
      };
      
      document.head.appendChild(reactScript);
    } else {
      // React is already available, initialize immediately
      document.addEventListener('DOMContentLoaded', initializeSearchApp);
    }
  
    function initializeSearchApp() {
      const { useState, useEffect, useRef, createElement: h } = React;
      const { createRoot } = ReactDOM;
  
      const SearchApp = () => {
        const [query, setQuery] = useState('');
        const [results, setResults] = useState([]);
        const [isLoading, setIsLoading] = useState(false);
        const [isOpen, setIsOpen] = useState(false);
        const searchContainerRef = useRef(null);
        
        const rootElement = document.getElementById('ai-search-root');
        if (!rootElement) {
          console.error('AI Search root element not found');
          return null;
        }
        
        const shopUrl = rootElement.dataset.shopUrl;
        const appProxyUrl = rootElement.dataset.appProxyUrl || '/apps/xpertsearch';
  
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
          console.log('Searching for:', searchQuery);
          
          try {
            const shopDomain = shopUrl.replace('https://', '').replace('http://', '');
            const searchUrl = `${appProxyUrl}/api/search?q=${encodeURIComponent(searchQuery)}&shop=${shopDomain}`;
            console.log('Search URL:', searchUrl);
            
            const response = await fetch(searchUrl);
            const data = await response.json();
            
            console.log('Search response:', data);
            
            if (data.success && data.data && data.data.products) {
              setResults(data.data.products);
            } else {
              setResults([]);
              if (!data.success) {
                console.error('Search failed:', data.error || 'Unknown error');
              }
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
  
        const handleProductClick = (product) => {
          // Navigate to product page
          const productUrl = product.handle ? `/products/${product.handle}` : '#';
          window.location.href = productUrl;
        };
  
        return h('div', { className: 'search-container', ref: searchContainerRef },
          h('input', {
            type: 'text',
            className: 'search-input',
            placeholder: 'Search for products...',
            value: query,
            onChange: onInputChange,
            onFocus: () => setIsOpen(true),
            'aria-label': 'Search products',
            'aria-autocomplete': 'list',
            'aria-expanded': isOpen && query.length > 0,
            'aria-controls': 'search-results'
          }),
          h('span', { className: 'search-icon' },
            h('svg', {
              xmlns: 'http://www.w3.org/2000/svg',
              width: '20',
              height: '20',
              viewBox: '0 0 24 24',
              fill: 'none',
              stroke: 'currentColor',
              strokeWidth: '2',
              strokeLinecap: 'round',
              strokeLinejoin: 'round'
            },
              h('circle', { cx: '11', cy: '11', r: '8' }),
              h('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' })
            )
          ),
          isOpen && query.length > 0 && h('div', { 
            className: 'search-results-popover',
            id: 'search-results',
            role: 'listbox'
          },
            isLoading ? 
              h('div', { className: 'loading-spinner' }, 'Searching...') :
              h('ul', { className: 'results-list', role: 'list' },
                results.length > 0 ?
                  results.map(product => 
                    h('li', {
                      key: product.id || product.shopify_product_id,
                      className: 'result-item',
                      onClick: () => handleProductClick(product),
                      role: 'option',
                      tabIndex: 0,
                      onKeyPress: (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleProductClick(product);
                        }
                      }
                    },
                      product.image_url && h('img', {
                        src: product.image_url,
                        alt: product.title,
                        className: 'result-item-image',
                        loading: 'lazy'
                      }),
                      h('div', { className: 'result-item-info' },
                        h('span', { className: 'result-item-title' }, product.title),
                        h('span', { className: 'result-item-price' }, 
                          product.price_min ? `$${product.price_min}` : 'Price varies'
                        )
                      )
                    )
                  ) :
                  h('div', { className: 'no-results-message' }, `No results found for "${query}"`)
              )
          )
        );
      };
  
      // Initialize the app
      const container = document.getElementById('ai-search-root');
      if (container) {
        console.log('Initializing AI Search Bar...');
        try {
          const root = createRoot(container);
          root.render(React.createElement(SearchApp));
          console.log('AI Search Bar initialized successfully');
        } catch (error) {
          console.error('Failed to initialize AI Search Bar:', error);
        }
      } else {
        console.error('AI Search root element not found');
      }
    }
  })();