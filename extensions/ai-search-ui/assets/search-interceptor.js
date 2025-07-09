/**
 * AI Search Universal Form Interceptor
 * Provides theme-agnostic search form hijacking with progressive enhancement
 */
(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    API_ENDPOINT: '/apps/xpertsearch/search',
    FALLBACK_TIMEOUT: 3000,
    RETRY_ATTEMPTS: 2,
    PERFORMANCE_TIMEOUT: 5000,
    DEBUG: window.location.hostname === 'localhost' || window.location.search.includes('debug=ai-search')
  };

  // Utility functions
  const utils = {
    log: function(...args) {
      if (CONFIG.DEBUG) {
        console.log('[AI Search]', ...args);
      }
    },

    error: function(...args) {
      console.error('[AI Search]', ...args);
    },

    debounce: function(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    generateSessionId: function() {
      return 'search_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
  };

  // Feature detection
  const features = {
    fetch: typeof fetch !== 'undefined',
    promises: typeof Promise !== 'undefined',
    localStorage: (function() {
      try {
        const test = 'ai_search_test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch(e) {
        return false;
      }
    })(),
    webSockets: typeof WebSocket !== 'undefined',
    intersection: typeof IntersectionObserver !== 'undefined'
  };

  // Search interceptor class
  const SearchInterceptor = {
    initialized: false,
    sessionId: utils.generateSessionId(),
    shopDomain: null,
    originalForms: new Map(),
    
    init: function() {
      if (this.initialized) return;
      
      utils.log('Initializing search interceptor...');
      
      // Extract shop domain
      this.shopDomain = window.Shopify?.shop || window.location.hostname;
      
      if (!this.shopDomain) {
        utils.error('Could not determine shop domain');
        return;
      }

      this.setupFeatureDetection();
      this.interceptExistingForms();
      this.setupFallbackMechanisms();
      this.setupPerformanceMonitoring();
      
      // Watch for dynamically added forms
      this.setupMutationObserver();
      
      this.initialized = true;
      utils.log('Search interceptor initialized successfully');
    },

    setupFeatureDetection: function() {
      utils.log('Feature detection:', features);
      
      // Graceful degradation for older browsers
      if (!features.fetch || !features.promises) {
        utils.log('Legacy browser detected, using basic enhancement');
        this.enhancementMode = 'basic';
      } else {
        this.enhancementMode = 'full';
      }
    },

    interceptExistingForms: function() {
      // Common search form selectors across themes
      const selectors = [
        'form[action*="/search"]',
        'form[action*="/pages/search"]',
        'form[action="/search"]',
        '.search-form',
        '[data-search-form]',
        '.header__search',
        '.site-search',
        '#search-form',
        '.predictive-search-form',
        '.search-bar form'
      ];

      let formsFound = 0;
      
      selectors.forEach(selector => {
        const forms = document.querySelectorAll(selector);
        forms.forEach(form => {
          if (this.hijackForm(form)) {
            formsFound++;
          }
        });
      });

      utils.log(`Intercepted ${formsFound} search forms`);
    },

    hijackForm: function(form) {
      // Skip if already hijacked
      if (form.dataset.aiSearchHijacked) {
        return false;
      }

      const searchInput = this.findSearchInput(form);
      if (!searchInput) {
        utils.log('No search input found in form:', form);
        return false;
      }

      // Store original form data
      const originalAction = form.action;
      const originalMethod = form.method;
      
      this.originalForms.set(form, {
        action: originalAction,
        method: originalMethod,
        hijacked: true
      });

      // Mark as hijacked
      form.dataset.aiSearchHijacked = 'true';

      // Enhanced form behavior
      this.enhanceForm(form, searchInput);

      utils.log('Successfully hijacked form:', form);
      return true;
    },

    findSearchInput: function(form) {
      // Common search input patterns
      const inputSelectors = [
        'input[name="q"]',
        'input[name="query"]',
        'input[name="search"]',
        'input[type="search"]',
        '.search-input',
        '.search__input'
      ];

      for (const selector of inputSelectors) {
        const input = form.querySelector(selector);
        if (input) return input;
      }

      return null;
    },

    enhanceForm: function(form, searchInput) {
      // Create results container
      const resultsContainer = this.createResultsContainer(form);
      
      // Add form submit handler
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleFormSubmit(form, searchInput, resultsContainer);
      });

      // Add real-time search if supported
      if (this.enhancementMode === 'full') {
        const debouncedSearch = utils.debounce((query) => {
          if (query.length >= 2) {
            this.performAISearch(query, form, resultsContainer, true);
          } else {
            this.hideResults(resultsContainer);
          }
        }, 300);

        searchInput.addEventListener('input', (e) => {
          debouncedSearch(e.target.value);
        });

        // Hide results when clicking outside
        document.addEventListener('click', (e) => {
          if (!form.contains(e.target)) {
            this.hideResults(resultsContainer);
          }
        });
      }
    },

    createResultsContainer: function(form) {
      const container = document.createElement('div');
      container.className = 'ai-search-results';
      container.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-top: none;
        max-height: 400px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      `;

      // Position relative to form
      const formPosition = getComputedStyle(form).position;
      if (formPosition === 'static') {
        form.style.position = 'relative';
      }

      form.appendChild(container);
      return container;
    },

    handleFormSubmit: function(form, searchInput, resultsContainer) {
      const query = searchInput.value.trim();
      
      if (!query) {
        return;
      }

      utils.log('Form submitted with query:', query);
      
      // Show loading state
      this.showLoadingState(resultsContainer);
      
      // Perform AI search
      this.performAISearch(query, form, resultsContainer, false)
        .catch(error => {
          utils.error('AI search failed:', error);
          this.fallbackToOriginal(form, query);
        });
    },

    performAISearch: function(query, form, resultsContainer, isRealTime = false) {
      if (!features.fetch) {
        return Promise.reject(new Error('Fetch not supported'));
      }

      const startTime = Date.now();
      const searchParams = new URLSearchParams({
        q: query,
        shop: this.shopDomain,
        session_id: this.sessionId,
        limit: isRealTime ? '5' : '10',
        offset: '0'
      });

      const searchUrl = `${CONFIG.API_ENDPOINT}?${searchParams}`;
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), CONFIG.PERFORMANCE_TIMEOUT)
      );

      // Create fetch promise
      const fetchPromise = fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }).then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      });

      return Promise.race([fetchPromise, timeoutPromise])
        .then(data => {
          const processingTime = Date.now() - startTime;
          utils.log(`Search completed in ${processingTime}ms`, data);

          if (data.success && data.data && data.data.products) {
            this.renderResults(resultsContainer, data.data, query, isRealTime);
            return data;
          } else {
            throw new Error(data.error || 'Search failed');
          }
        })
        .catch(error => {
          utils.error('AI search error:', error);
          
          if (!isRealTime) {
            // For form submits, try fallback
            this.fallbackToOriginal(form, query);
          } else {
            // For real-time, just hide results
            this.hideResults(resultsContainer);
          }
          
          throw error;
        });
    },

    renderResults: function(container, searchData, query, isRealTime) {
      const products = searchData.products || [];
      
      if (products.length === 0) {
        container.innerHTML = `
          <div style="padding: 20px; text-align: center; color: #666;">
            No products found for "${query}"
          </div>
        `;
      } else {
        const resultsHTML = products.map(product => this.renderProduct(product)).join('');
        const headerHTML = isRealTime ? 
          `<div style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold;">
            Search suggestions for "${query}"
          </div>` : '';
        
        container.innerHTML = headerHTML + resultsHTML;
      }

      this.showResults(container);
    },

    renderProduct: function(product) {
      const imageUrl = product.image_url || '/assets/no-image.svg';
      const price = product.price_min ? `$${product.price_min.toFixed(2)}` : 'Price not available';
      const productUrl = `/products/${product.handle}`;

      return `
        <div class="ai-search-result-item" 
             style="display: flex; padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;"
             onclick="window.location.href='${productUrl}'; this.trackClick('${searchData.search_id}', ${product.shopify_product_id});">
          <img src="${imageUrl}" 
               alt="${product.title}" 
               style="width: 50px; height: 50px; object-fit: cover; margin-right: 10px;">
          <div style="flex: 1;">
            <div style="font-weight: 500; color: #333;">${product.title}</div>
            <div style="color: #666; font-size: 0.9em;">${price}</div>
            ${product.ai_explanation ? 
              `<div style="color: #888; font-size: 0.8em; margin-top: 4px;">${product.ai_explanation}</div>` : 
              ''}
          </div>
        </div>
      `;
    },

    showLoadingState: function(container) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <div style="display: inline-block; width: 20px; height: 20px; border: 2px solid #ddd; border-top: 2px solid #333; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <div style="margin-top: 10px;">Searching...</div>
        </div>
      `;
      this.showResults(container);
    },

    showResults: function(container) {
      container.style.display = 'block';
    },

    hideResults: function(container) {
      container.style.display = 'none';
    },

    fallbackToOriginal: function(form, query) {
      utils.log('Falling back to original search for:', query);
      
      const originalData = this.originalForms.get(form);
      if (originalData) {
        // Temporarily restore original form action
        form.action = originalData.action;
        form.method = originalData.method;
        
        // Remove hijack prevention
        delete form.dataset.aiSearchHijacked;
        
        // Submit the form normally
        form.submit();
      } else {
        // Fallback to manual redirect
        window.location.href = `/search?q=${encodeURIComponent(query)}`;
      }
    },

    setupFallbackMechanisms: function() {
      // Network failure detection
      if ('navigator' in window && 'onLine' in navigator) {
        window.addEventListener('offline', () => {
          utils.log('Network offline detected');
          this.networkOffline = true;
        });

        window.addEventListener('online', () => {
          utils.log('Network online detected');
          this.networkOffline = false;
        });
      }
    },

    setupPerformanceMonitoring: function() {
      // Monitor search performance
      this.performanceMetrics = {
        searchCount: 0,
        totalResponseTime: 0,
        errorCount: 0,
        fallbackCount: 0
      };

      // Periodically report metrics (if analytics endpoint exists)
      if (features.localStorage) {
        setInterval(() => {
          this.reportMetrics();
        }, 60000); // Every minute
      }
    },

    setupMutationObserver: function() {
      // Watch for dynamically added forms
      if ('MutationObserver' in window) {
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === 1) { // Element node
                // Check if the added node is a form or contains forms
                const forms = node.tagName === 'FORM' ? 
                  [node] : 
                  Array.from(node.querySelectorAll ? node.querySelectorAll('form') : []);
                
                forms.forEach(form => {
                  if (form.action && form.action.includes('/search')) {
                    utils.log('New search form detected:', form);
                    this.hijackForm(form);
                  }
                });
              }
            });
          });
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    },

    reportMetrics: function() {
      // Store metrics in localStorage for later reporting
      const metrics = {
        ...this.performanceMetrics,
        timestamp: Date.now(),
        features: features,
        shopDomain: this.shopDomain
      };

      try {
        localStorage.setItem('ai_search_metrics', JSON.stringify(metrics));
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  };

  // CSS Animation for loading spinner
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .ai-search-result-item:hover {
      background-color: #f5f5f5 !important;
    }
  `;
  document.head.appendChild(style);

  // Global click tracking function
  window.trackAISearchClick = function(searchId, productId) {
    if (!features.fetch) return;
    
    fetch(CONFIG.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        search_id: searchId,
        product_id: productId
      })
    }).catch(error => {
      utils.error('Click tracking failed:', error);
    });
  };

  // Initialize when DOM is ready
  function initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => SearchInterceptor.init());
    } else {
      SearchInterceptor.init();
    }
  }

  // Auto-initialize unless disabled
  if (!window.AI_SEARCH_MANUAL_INIT) {
    initialize();
  }

  // Expose SearchInterceptor globally for manual control
  window.AISearchInterceptor = SearchInterceptor;

})(); 