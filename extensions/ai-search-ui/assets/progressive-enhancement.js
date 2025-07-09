/**
 * Progressive Enhancement Strategy for AI Search
 * Ensures compatibility across all devices and browsers
 */
(function() {
  'use strict';

  const SearchEnhancer = {
    initialized: false,
    features: {},
    config: {
      enableRealTimeSearch: true,
      enableOfflineSupport: true,
      enablePerformanceOptimization: true,
      maxRetries: 3,
      fallbackTimeout: 3000,
      performanceThreshold: 5000
    },

    init: function() {
      if (this.initialized) return;
      
      console.log('[Search Enhancer] Initializing progressive enhancement...');
      
      this.setupFeatureDetection();
      this.ensureOriginalSearchFunctionality();
      this.implementProgressiveEnhancement();
      this.setupFallbackMechanisms();
      this.setupPerformanceOptimization();
      
      this.initialized = true;
      console.log('[Search Enhancer] Progressive enhancement initialized');
    },

    /**
     * Comprehensive feature detection
     */
    setupFeatureDetection: function() {
      this.features = {
        // Core JavaScript features
        fetch: typeof fetch !== 'undefined',
        promises: typeof Promise !== 'undefined',
        asyncAwait: this.testAsyncAwait(),
        arrowFunctions: this.testArrowFunctions(),
        destructuring: this.testDestructuring(),
        
        // Storage capabilities
        localStorage: this.testLocalStorage(),
        sessionStorage: this.testSessionStorage(),
        indexedDB: typeof indexedDB !== 'undefined',
        
        // Network and communication
        webSockets: typeof WebSocket !== 'undefined',
        serviceWorker: 'serviceWorker' in navigator,
        pushNotifications: 'PushManager' in window,
        
        // Browser APIs
        mutationObserver: typeof MutationObserver !== 'undefined',
        intersectionObserver: typeof IntersectionObserver !== 'undefined',
        resizeObserver: typeof ResizeObserver !== 'undefined',
        
        // Media and input
        touch: 'ontouchstart' in window,
        pointerEvents: typeof PointerEvent !== 'undefined',
        speechRecognition: this.testSpeechRecognition(),
        
        // Performance APIs
        performanceObserver: typeof PerformanceObserver !== 'undefined',
        requestIdleCallback: typeof requestIdleCallback !== 'undefined',
        
        // Modern CSS features
        cssGrid: this.testCSSFeature('grid'),
        cssFlexbox: this.testCSSFeature('flex'),
        cssCustomProperties: this.testCSSFeature('--test: 1'),
        
        // Device capabilities
        deviceMemory: navigator.deviceMemory || 4, // Default to 4GB
        connectionType: this.getConnectionType(),
        isLowEndDevice: this.detectLowEndDevice()
      };

      console.log('[Search Enhancer] Feature detection completed:', this.features);
    },

    /**
     * Test async/await support
     */
    testAsyncAwait: function() {
      try {
        eval('(async function() {})');
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Test arrow functions support
     */
    testArrowFunctions: function() {
      try {
        eval('(() => {})');
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Test destructuring support
     */
    testDestructuring: function() {
      try {
        eval('const {a} = {a: 1}');
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Test localStorage availability
     */
    testLocalStorage: function() {
      try {
        const test = 'search_enhancer_test';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Test sessionStorage availability
     */
    testSessionStorage: function() {
      try {
        const test = 'search_enhancer_test';
        sessionStorage.setItem(test, test);
        sessionStorage.removeItem(test);
        return true;
      } catch (e) {
        return false;
      }
    },

    /**
     * Test speech recognition support
     */
    testSpeechRecognition: function() {
      return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    },

    /**
     * Test CSS feature support
     */
    testCSSFeature: function(property) {
      const element = document.createElement('div');
      try {
        element.style.setProperty(property, 'initial');
        return element.style.getPropertyValue(property) !== '';
      } catch (e) {
        return false;
      }
    },

    /**
     * Get connection type information
     */
    getConnectionType: function() {
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        return {
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0,
          saveData: connection.saveData || false
        };
      }
      return { effectiveType: 'unknown', downlink: 0, rtt: 0, saveData: false };
    },

    /**
     * Detect low-end devices
     */
    detectLowEndDevice: function() {
      // Check device memory
      if (navigator.deviceMemory && navigator.deviceMemory < 2) {
        return true;
      }

      // Check CPU cores
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 2) {
        return true;
      }

      // Check user agent for known low-end patterns
      const userAgent = navigator.userAgent.toLowerCase();
      const lowEndPatterns = [
        'android 4', 'android 5', 'android 6',
        'mobile.*safari/537.36.*version/4',
        'webview',
        'wv'
      ];

      return lowEndPatterns.some(pattern => userAgent.includes(pattern));
    },

    /**
     * Ensure original search functionality works as baseline
     */
    ensureOriginalSearchFunctionality: function() {
      console.log('[Search Enhancer] Ensuring original search functionality...');
      
      // Find all search forms and ensure they have proper fallbacks
      const searchForms = document.querySelectorAll('form[action*="/search"]');
      
      searchForms.forEach(form => {
        // Ensure form has proper method and action
        if (!form.method) form.method = 'get';
        if (!form.action || !form.action.includes('/search')) {
          form.action = '/search';
        }

        // Ensure search input has proper name attribute
        const searchInput = form.querySelector('input[type="search"], input[name="q"], input[name="query"]');
        if (searchInput && !searchInput.name) {
          searchInput.name = 'q';
        }

        // Add noscript fallback
        this.addNoScriptFallback(form);
      });
    },

    /**
     * Add noscript fallback for forms
     */
    addNoScriptFallback: function(form) {
      const existingNoscript = form.querySelector('noscript');
      if (existingNoscript) return;

      const noscript = document.createElement('noscript');
      noscript.innerHTML = `
        <style>
          .ai-search-enhanced { display: none; }
          .ai-search-fallback { display: block; }
        </style>
      `;
      form.appendChild(noscript);
    },

    /**
     * Implement progressive enhancement based on available features
     */
    implementProgressiveEnhancement: function() {
      console.log('[Search Enhancer] Implementing progressive enhancement...');

      // Level 1: Basic functionality (always available)
      this.enableBasicSearch();

      // Level 2: Enhanced features (modern browsers)
      if (this.features.fetch && this.features.promises) {
        this.enableAISearch();
      }

      // Level 3: Real-time features (high-performance devices)
      if (this.features.fetch && this.features.promises && !this.features.isLowEndDevice) {
        this.enableRealTimeSearch();
      }

      // Level 4: Advanced features (cutting-edge browsers)
      if (this.features.serviceWorker && this.features.indexedDB) {
        this.enableOfflineSearch();
      }

      // Level 5: Experimental features (latest browsers)
      if (this.features.speechRecognition && this.config.enableExperimentalFeatures) {
        this.enableVoiceSearch();
      }
    },

    /**
     * Basic search functionality
     */
    enableBasicSearch: function() {
      console.log('[Search Enhancer] Basic search enabled');
      
      // Ensure all search forms work without JavaScript
      document.querySelectorAll('form[action*="/search"]').forEach(form => {
        form.setAttribute('data-search-level', 'basic');
      });
    },

    /**
     * AI-powered search
     */
    enableAISearch: function() {
      if (typeof window.AISearchInterceptor !== 'undefined') {
        console.log('[Search Enhancer] AI search enabled');
        window.AISearchInterceptor.enhancementLevel = 'ai';
      }
    },

    /**
     * Real-time search functionality
     */
    enableRealTimeSearch: function() {
      if (this.config.enableRealTimeSearch && !this.features.isLowEndDevice) {
        console.log('[Search Enhancer] Real-time search enabled');
        
        // Configure real-time search with performance optimizations
        if (typeof window.AISearchInterceptor !== 'undefined') {
          window.AISearchInterceptor.realtimeEnabled = true;
          window.AISearchInterceptor.realtimeDelay = this.features.connectionType.effectiveType === '4g' ? 200 : 500;
        }
      }
    },

    /**
     * Offline search capability
     */
    enableOfflineSearch: function() {
      if (this.config.enableOfflineSupport) {
        console.log('[Search Enhancer] Offline search enabled');
        this.registerServiceWorker();
        this.setupOfflineCache();
      }
    },

    /**
     * Voice search functionality
     */
    enableVoiceSearch: function() {
      console.log('[Search Enhancer] Voice search enabled');
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.setupVoiceSearch(SpeechRecognition);
      }
    },

    /**
     * Setup comprehensive fallback mechanisms
     */
    setupFallbackMechanisms: function() {
      console.log('[Search Enhancer] Setting up fallback mechanisms...');

      // Network failure fallback
      this.setupOfflineFallback();
      
      // API failure fallback
      this.setupAPIFallback();
      
      // Performance fallback
      this.setupPerformanceFallback();
      
      // Browser compatibility fallback
      this.setupCompatibilityFallback();
    },

    /**
     * Network offline detection and handling
     */
    setupOfflineFallback: function() {
      if ('navigator' in window && 'onLine' in navigator) {
        const handleOffline = () => {
          console.log('[Search Enhancer] Network offline - enabling fallback mode');
          this.enableFallbackMode('offline');
        };

        const handleOnline = () => {
          console.log('[Search Enhancer] Network online - restoring normal mode');
          this.disableFallbackMode('offline');
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        // Check initial state
        if (!navigator.onLine) {
          handleOffline();
        }
      }
    },

    /**
     * API failure detection and fallback
     */
    setupAPIFallback: function() {
      // Monitor API health
      this.apiHealthCheck = {
        failures: 0,
        lastCheck: Date.now(),
        isHealthy: true
      };

      // Set up periodic health checks
      if (this.features.fetch) {
        setInterval(() => {
          this.checkAPIHealth();
        }, 60000); // Check every minute
      }
    },

    /**
     * Performance-based fallback
     */
    setupPerformanceFallback: function() {
      if (this.features.performanceObserver) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.duration > this.config.performanceThreshold) {
              console.log('[Search Enhancer] Performance threshold exceeded - enabling performance mode');
              this.enablePerformanceMode();
            }
          });
        });

        observer.observe({ entryTypes: ['navigation', 'resource'] });
      }
    },

    /**
     * Browser compatibility fallback
     */
    setupCompatibilityFallback: function() {
      // Polyfill essential features for older browsers
      if (!this.features.fetch) {
        this.loadPolyfill('fetch', () => {
          console.log('[Search Enhancer] Fetch polyfill loaded');
          this.enableAISearch();
        });
      }

      if (!this.features.promises) {
        this.loadPolyfill('promise', () => {
          console.log('[Search Enhancer] Promise polyfill loaded');
        });
      }
    },

    /**
     * Setup performance optimization
     */
    setupPerformanceOptimization: function() {
      if (!this.config.enablePerformanceOptimization) return;

      console.log('[Search Enhancer] Setting up performance optimization...');

      // Lazy load non-critical features
      this.setupLazyLoading();
      
      // Optimize for low-end devices
      if (this.features.isLowEndDevice) {
        this.enableLowEndOptimizations();
      }

      // Optimize for slow connections
      if (this.features.connectionType.effectiveType === 'slow-2g' || 
          this.features.connectionType.effectiveType === '2g') {
        this.enableSlowConnectionOptimizations();
      }
    },

    /**
     * Enable fallback mode
     */
    enableFallbackMode: function(reason) {
      document.body.classList.add('ai-search-fallback-mode');
      document.body.setAttribute('data-fallback-reason', reason);
      
      // Disable enhanced features
      if (typeof window.AISearchInterceptor !== 'undefined') {
        window.AISearchInterceptor.fallbackMode = true;
      }
    },

    /**
     * Disable fallback mode
     */
    disableFallbackMode: function(reason) {
      document.body.classList.remove('ai-search-fallback-mode');
      document.body.removeAttribute('data-fallback-reason');
      
      // Re-enable enhanced features
      if (typeof window.AISearchInterceptor !== 'undefined') {
        window.AISearchInterceptor.fallbackMode = false;
      }
    },

    /**
     * Check API health
     */
    checkAPIHealth: function() {
      if (!this.features.fetch) return;

      const healthCheckUrl = '/apps/xpertsearch/health';
      
      fetch(healthCheckUrl, {
        method: 'HEAD',
        timeout: 5000
      })
      .then(response => {
        if (response.ok) {
          this.apiHealthCheck.failures = 0;
          this.apiHealthCheck.isHealthy = true;
        } else {
          this.handleAPIFailure();
        }
      })
      .catch(() => {
        this.handleAPIFailure();
      });
    },

    /**
     * Handle API failures
     */
    handleAPIFailure: function() {
      this.apiHealthCheck.failures++;
      
      if (this.apiHealthCheck.failures >= 3) {
        console.log('[Search Enhancer] API unhealthy - enabling API fallback mode');
        this.apiHealthCheck.isHealthy = false;
        this.enableFallbackMode('api-failure');
      }
    },

    /**
     * Enable performance mode
     */
    enablePerformanceMode: function() {
      console.log('[Search Enhancer] Enabling performance mode');
      
      // Reduce real-time search frequency
      if (typeof window.AISearchInterceptor !== 'undefined') {
        window.AISearchInterceptor.realtimeDelay = 1000;
        window.AISearchInterceptor.performanceMode = true;
      }
      
      document.body.classList.add('ai-search-performance-mode');
    },

    /**
     * Load polyfills
     */
    loadPolyfill: function(name, callback) {
      const script = document.createElement('script');
      script.src = `https://polyfill.io/v3/polyfill.min.js?features=${name}`;
      script.onload = callback;
      script.onerror = () => {
        console.error(`[Search Enhancer] Failed to load ${name} polyfill`);
      };
      document.head.appendChild(script);
    },

    /**
     * Setup lazy loading for non-critical features
     */
    setupLazyLoading: function() {
      if (this.features.intersectionObserver) {
        // Lazy load advanced search features when they come into view
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.loadAdvancedFeatures(entry.target);
              observer.unobserve(entry.target);
            }
          });
        });

        // Observe search-related elements
        document.querySelectorAll('[data-search-advanced]').forEach(el => {
          observer.observe(el);
        });
      }
    },

    /**
     * Enable optimizations for low-end devices
     */
    enableLowEndOptimizations: function() {
      console.log('[Search Enhancer] Enabling low-end device optimizations');
      
      // Reduce animation and visual effects
      document.body.classList.add('ai-search-low-end-device');
      
      // Disable real-time search
      this.config.enableRealTimeSearch = false;
      
      // Increase debounce delays
      if (typeof window.AISearchInterceptor !== 'undefined') {
        window.AISearchInterceptor.realtimeDelay = 1000;
      }
    },

    /**
     * Enable optimizations for slow connections
     */
    enableSlowConnectionOptimizations: function() {
      console.log('[Search Enhancer] Enabling slow connection optimizations');
      
      // Reduce data usage
      document.body.classList.add('ai-search-slow-connection');
      
      // Disable real-time search
      this.config.enableRealTimeSearch = false;
      
      // Reduce image sizes
      document.querySelectorAll('[data-search-image]').forEach(img => {
        img.loading = 'lazy';
      });
    },

    /**
     * Load advanced features
     */
    loadAdvancedFeatures: function(element) {
      console.log('[Search Enhancer] Loading advanced features for element:', element);
      
      // Load features based on element type
      if (element.matches('[data-search-voice]')) {
        this.enableVoiceSearch();
      }
      
      if (element.matches('[data-search-autocomplete]')) {
        this.enableAutocomplete();
      }
    },

    /**
     * Register service worker for offline support
     */
    registerServiceWorker: function() {
      if (this.features.serviceWorker) {
        navigator.serviceWorker.register('/apps/xpertsearch/sw.js')
          .then(registration => {
            console.log('[Search Enhancer] Service worker registered:', registration);
          })
          .catch(error => {
            console.error('[Search Enhancer] Service worker registration failed:', error);
          });
      }
    },

    /**
     * Setup offline cache
     */
    setupOfflineCache: function() {
      if (this.features.indexedDB) {
        // Setup IndexedDB for offline search cache
        const request = indexedDB.open('AISearchCache', 1);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          const store = db.createObjectStore('searches', { keyPath: 'query' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        };
        
        request.onsuccess = (event) => {
          this.offlineDB = event.target.result;
          console.log('[Search Enhancer] Offline cache initialized');
        };
      }
    }
  };

  // Initialize when DOM is ready
  function initialize() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => SearchEnhancer.init());
    } else {
      SearchEnhancer.init();
    }
  }

  // Auto-initialize unless disabled
  if (!window.SEARCH_ENHANCER_MANUAL_INIT) {
    initialize();
  }

  // Expose SearchEnhancer globally
  window.SearchEnhancer = SearchEnhancer;

})(); 