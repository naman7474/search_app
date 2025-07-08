// Legacy loader for vintage themes
(function() {
  'use strict';

  // Wait for DOM to be ready
  function domReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback);
    } else {
      callback();
    }
  }

  // Initialize AI Search
  function initAISearch() {
    const root = document.getElementById('ai-search-root');
    if (!root) {
      console.warn('AI Search: Root element not found');
      return;
    }

    // Get configuration from data attributes
    const config = {
      shopUrl: root.getAttribute('data-shop-url'),
      appProxyUrl: root.getAttribute('data-app-proxy-url'),
      placeholder: root.getAttribute('data-placeholder') || 'Search for products...',
      maxResults: parseInt(root.getAttribute('data-max-results') || '10', 10),
      showSuggestions: root.getAttribute('data-show-suggestions') === 'true'
    };

    // Check if the main script is already loaded
    if (window.AISearchApp) {
      window.AISearchApp.init(root, config);
      return;
    }

    // Load the main app script
    const script = document.createElement('script');
    script.src = root.getAttribute('data-main-script') || '/assets/main.js';
    script.async = true;
    script.onload = function() {
      if (window.AISearchApp) {
        window.AISearchApp.init(root, config);
      }
    };
    script.onerror = function() {
      console.error('AI Search: Failed to load main script');
    };
    document.head.appendChild(script);
  }

  // Auto-detect existing search forms and enhance them
  function enhanceExistingSearch() {
    const searchForms = document.querySelectorAll('form[action*="/search"]');
    
    searchForms.forEach(function(form) {
      const searchInput = form.querySelector('input[type="search"], input[name="q"]');
      if (!searchInput) return;

      // Add AI search widget near the search form
      const wrapper = document.createElement('div');
      wrapper.className = 'ai-search-widget ai-search-enhanced';
      wrapper.innerHTML = '<div id="ai-search-enhanced-root"></div>';
      
      // Insert after the form
      form.parentNode.insertBefore(wrapper, form.nextSibling);
      
      // Initialize AI search for this instance
      const enhancedRoot = wrapper.querySelector('#ai-search-enhanced-root');
      if (enhancedRoot && window.AISearchApp) {
        window.AISearchApp.init(enhancedRoot, {
          shopUrl: window.Shopify ? window.Shopify.shop : null,
          appProxyUrl: '/apps/xpertsearch',
          placeholder: searchInput.placeholder || 'Search...',
          maxResults: 10,
          showSuggestions: true,
          enhanceExisting: true,
          originalInput: searchInput
        });
      }
    });
  }

  // Check for theme editor
  function isThemeEditor() {
    return window.Shopify && window.Shopify.designMode;
  }

  // Initialize when DOM is ready
  domReady(function() {
    // Skip initialization in theme editor
    if (isThemeEditor()) {
      console.log('AI Search: Theme editor detected, skipping initialization');
      return;
    }

    // Initialize AI search
    initAISearch();
    
    // Try to enhance existing search forms after a short delay
    setTimeout(enhanceExistingSearch, 500);
  });

  // Expose initialization function globally
  window.AISearchLegacy = {
    init: initAISearch,
    enhance: enhanceExistingSearch
  };
})(); 