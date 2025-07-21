import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { unifiedSearchService } from "../lib/search/unified-search.server";
import { generateFacets } from "../lib/utils/facets.utils";
import { escapeHtml } from "../lib/utils/html.utils";

// Using utility function for facet generation

// Utility function to get currency symbol from currency code
function getCurrencySymbol(currencyCode: string): string {
  const currencySymbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$',
    'JPY': '¥',
    'CHF': 'CHF',
    'CNY': '¥',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'CZK': 'Kč',
    'HUF': 'Ft',
    'RUB': '₽',
    'BRL': 'R$',
    'MXN': 'MX$',
    'NZD': 'NZ$',
    'SGD': 'S$',
    'HKD': 'HK$',
    'TWD': 'NT$',
    'KRW': '₩',
    'THB': '฿',
    'MYR': 'RM',
    'INR': '₹',
    'PHP': '₱',
    'VND': '₫',
    'IDR': 'Rp',
  };
  
  return currencySymbols[currencyCode] || currencyCode;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { storefront } = await authenticate.public.appProxy(request);
  
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const limit = parseInt(url.searchParams.get("limit") || "20");
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const shopDomain = url.searchParams.get("shop") || url.hostname;
  
  // Extract filter parameters
  const filters: Record<string, any> = {};
  const vendor = url.searchParams.get("vendor");
  const productType = url.searchParams.get("product_type");
  const priceMin = url.searchParams.get("price_min");
  const priceMax = url.searchParams.get("price_max");
  const availability = url.searchParams.get("availability");
  const sortBy = url.searchParams.get("sort") || "relevance";
  
  if (vendor) filters.vendor = vendor;
  if (productType) filters.product_type = productType;
  if (priceMin) filters.price_min = parseFloat(priceMin);
  if (priceMax) filters.price_max = parseFloat(priceMax);
  if (availability === "in_stock") filters.available = true;
  if (availability === "out_of_stock") filters.available = false;
  
  let products: any[] = [];
  let allProducts: any[] = []; // For generating facets
  let total = 0;
  let hasMore = false;
  let searchTime = 0;
  let facets: any = {};
  let storeCurrency = { code: 'USD', symbol: '$' }; // Default currency

  // Get store currency information
  try {
    const storeInfoResponse = await fetch(`${new URL(request.url).origin}/apps/xpertsearch/api/store-info?shop=${encodeURIComponent(shopDomain)}`);
    if (storeInfoResponse.ok) {
      const storeInfo = await storeInfoResponse.json();
      if (storeInfo.success && storeInfo.data.currency) {
        storeCurrency = {
          code: storeInfo.data.currency.code,
          symbol: getCurrencySymbol(storeInfo.data.currency.code),
        };
      }
    }
  } catch (error) {
    console.log('Failed to fetch store currency, using default USD');
  }

  if (query.trim()) {
    try {
      const startTime = Date.now();
      
      // First, get all results to generate facets (limited to reasonable amount)
      const allResultsSearch = await unifiedSearchService.search({
        query: query.trim(),
        shop_domain: shopDomain,
        limit: 200, // Get more results for better facets
        filters: {}, // No filters for facet generation
        strategy: 'hybrid',
      });
      
      allProducts = allResultsSearch.products;
      
      // Then get filtered and paginated results
      const filteredSearch = await unifiedSearchService.search({
        query: query.trim(),
        shop_domain: shopDomain,
        limit: limit + 1, // Get one extra to check if there are more
        filters,
        strategy: 'hybrid',
      });
      
      let sortedProducts = filteredSearch.products;
      
      // Apply sorting
      if (sortBy === "price_low") {
        sortedProducts.sort((a: any, b: any) => (a.price_min || 0) - (b.price_min || 0));
      } else if (sortBy === "price_high") {
        sortedProducts.sort((a: any, b: any) => (b.price_min || 0) - (a.price_min || 0));
      } else if (sortBy === "title") {
        sortedProducts.sort((a: any, b: any) => (a.title || "").localeCompare(b.title || ""));
      }
      // 'relevance' uses default similarity score sorting
      
      products = sortedProducts.slice(0, limit);
      total = sortedProducts.length;
      hasMore = sortedProducts.length > limit;
      searchTime = Date.now() - startTime;
      
      // Generate facets from all unfiltered results
      facets = generateFacets(allProducts);
      
    } catch (error) {
      console.error("Search failed:", error);
      // Return empty results on error
    }
  }

  // Using utility function for HTML escaping

  // Generate CSS and JS links to our search page assets with cache-busting
  const cacheVersion = Date.now(); // Force fresh assets by adding timestamp
  const cssUrl = `/apps/xpertsearch/assets/search-page.css?v=${cacheVersion}`;
  const jsUrl = `/apps/xpertsearch/assets/search-page.js?v=${cacheVersion}`;
  
  // Helper function to build filter URL
  function buildFilterUrl(newFilters: Record<string, string | null>): string {
    const currentUrl = new URL(request.url);
    const params = new URLSearchParams(currentUrl.search);
    
    // Update parameters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    // Build relative URL to avoid app proxy issues
    return `?${params.toString()}`;
  }

  // Generate the search form
  const searchForm = `
    <form method="get" action="/apps/xpertsearch/search" class="ai-search-form">
      <div class="ai-search-input-container">
        <input type="text" name="q" value="${escapeHtml(query)}" placeholder="Search for products..." class="ai-search-page-input" />
        <input type="hidden" name="shop" value="${escapeHtml(shopDomain)}" />
        <button type="submit" class="ai-search-submit-btn">Search</button>
      </div>
    </form>
  `;
  
  // Sorting dropdown removed to prevent navigation issues
  const sortingDropdown = '';
  
  // Filters sidebar removed to prevent navigation issues
  const filtersSidebar = '';

  // Generate product grid HTML
  let productGridHtml = '';
  if (products.length > 0) {
    const productCardsHtml = products.map((product, index) => {
      const imageUrl = product.image_url || '';
      const handle = product.handle || '';
      const productUrl = handle ? `/products/${handle}` : '#';
      
      // Calculate pricing display
      let priceDisplay = '';
      let saleDisplay = '';
      
      if (product.price_range) {
        const { min, max, sale_min, sale_max } = product.price_range;
        
        if (product.on_sale && sale_min && sale_max) {
          // On sale - show sale price and crossed out original
          if (min === max) {
            priceDisplay = `
              <div class="ai-search-product-price">
                <span class="ai-search-sale-price">${storeCurrency.symbol}${min.toFixed(2)}</span>
                <span class="ai-search-original-price">${storeCurrency.symbol}${sale_min === sale_max ? sale_min.toFixed(2) : `${sale_min.toFixed(2)} - ${storeCurrency.symbol}${sale_max.toFixed(2)}`}</span>
              </div>
            `;
          } else {
            priceDisplay = `
              <div class="ai-search-product-price">
                <span class="ai-search-sale-price">${storeCurrency.symbol}${min.toFixed(2)} - ${storeCurrency.symbol}${max.toFixed(2)}</span>
                <span class="ai-search-original-price">${storeCurrency.symbol}${sale_min.toFixed(2)} - ${storeCurrency.symbol}${sale_max.toFixed(2)}</span>
              </div>
            `;
          }
          saleDisplay = '<span class="ai-search-sale-badge">Sale</span>';
        } else {
          // Regular pricing
          if (min === max) {
            priceDisplay = `<div class="ai-search-product-price">${storeCurrency.symbol}${min.toFixed(2)}</div>`;
                      } else {
              priceDisplay = `<div class="ai-search-product-price">${storeCurrency.symbol}${min.toFixed(2)} - ${storeCurrency.symbol}${max.toFixed(2)}</div>`;
            }
        }
      } else if (product.price_min) {
        // Fallback to basic pricing
        priceDisplay = `<div class="ai-search-product-price">${storeCurrency.symbol}${product.price_min.toFixed(2)}</div>`;
      }
      
      // Generate star rating (placeholder for now - 4.5 stars as example)
      const rating = 4.5; // This would come from reviews in a real implementation
      const fullStars = Math.floor(rating);
      const hasHalfStar = rating % 1 !== 0;
      const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
      
      const starDisplay = `
        <div class="ai-search-product-rating">
          ${'★'.repeat(fullStars)}${hasHalfStar ? '☆' : ''}${'☆'.repeat(emptyStars)}
          <span class="ai-search-rating-count">(${Math.floor(Math.random() * 100) + 10})</span>
        </div>
      `;
      
      // Generate availability badge
      let availabilityBadge = '';
      if (!product.available) {
        availabilityBadge = '<span class="ai-search-product-unavailable">Out of Stock</span>';
      } else {
        // You could add "In Stock" or "Low Stock" badges here based on inventory
        availabilityBadge = '<span class="ai-search-product-available">In Stock</span>';
      }
      
      return `
        <div class="ai-search-product-card" data-product-url="${productUrl}" data-product-id="${product.id || product.shopify_product_id}" data-position="${index + 1}">
          <div class="ai-search-product-image-container">
            ${saleDisplay}
            ${imageUrl ? `
              <img src="${imageUrl}" alt="${escapeHtml(product.title)}" class="ai-search-product-image" loading="lazy" decoding="async" />
            ` : `
              <div class="ai-search-product-image-placeholder">
                <svg viewBox="0 0 24 24" class="ai-search-placeholder-icon">
                  <path fill="currentColor" d="M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19M19,19H5V5H19V19M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z" />
                </svg>
                <span>No Image</span>
              </div>
            `}
          </div>
          <div class="ai-search-product-info">
            <h3 class="ai-search-product-title">
              ${escapeHtml(product.title || '')}
            </h3>
            ${product.vendor ? `<p class="ai-search-product-vendor">${escapeHtml(product.vendor)}</p>` : ''}
            ${starDisplay}
            ${priceDisplay}
            ${availabilityBadge}
            <div class="ai-search-product-actions">
              ${product.available ? `
                <button class="ai-search-add-to-cart-btn" data-product-id="${product.id}" data-product-title="${escapeHtml(product.title || '')}">
                  <svg class="ai-search-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,7H16V6A4,4 0 0,0 12,2A4,4 0 0,0 8,6V7H5A1,1 0 0,0 4,8V19A3,3 0 0,0 7,22H17A3,3 0 0,0 20,19V8A1,1 0 0,0 19,7M10,6A2,2 0 0,1 12,4A2,2 0 0,1 14,6V7H10V6M18,19A1,1 0 0,1 17,20H7A1,1 0 0,1 6,19V9H8V10A1,1 0 0,0 10,10A1,1 0 0,0 10,8V9H14V10A1,1 0 0,0 16,10A1,1 0 0,0 16,8V9H18V19Z"/>
                  </svg>
                  Add to Cart
                </button>
                <button class="ai-search-quick-view-btn ai-search-quick-view-icon-only" data-product-id="${product.id}" aria-label="Quick view ${escapeHtml(product.title || '')}" title="Quick View">
                  <svg class="ai-search-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9M12,4.5C17,4.5 21.27,7.61 23,12C21.27,16.39 17,19.5 12,19.5C7,19.5 2.73,16.39 1,12C2.73,7.61 7,4.5 12,4.5M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7Z"/>
                  </svg>
                </button>
              ` : ''}
            </div>
            ${product.similarity_score ? `
              <div class="ai-search-product-relevance">
                Relevance: ${Math.round(product.similarity_score * 100)}%
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    productGridHtml = `
      <div class="ai-search-products-grid">
        ${productCardsHtml}
      </div>
    `;

    // Add load more button if there are more results
    if (hasMore) {
      const nextOffset = offset + limit;
      const currentUrl = new URL(request.url);
      const params = new URLSearchParams(currentUrl.search);
      params.set('offset', nextOffset.toString());
      params.set('limit', limit.toString());
      
      const loadMoreUrl = `?${params.toString()}`;
      productGridHtml += `
        <div class="ai-search-load-more-container">
          <a href="${loadMoreUrl}" class="ai-search-load-more-btn">Load More Products</a>
        </div>
      `;
    }
  }

  // Generate results summary - now smaller and less prominent
  let resultsSummary = '';
  if (query) {
    if (total > 0) {
      resultsSummary = `
        <div class="ai-search-results-summary-simple">
          <p>Results for "${escapeHtml(query)}" – ${total} product${total !== 1 ? 's' : ''}</p>
          ${offset > 0 ? `
            <p class="ai-search-pagination-info">
              Showing ${offset + 1}-${Math.min(offset + products.length, total)} of ${total} results
            </p>
          ` : ''}
        </div>
      `;
    } else {
      resultsSummary = `
        <div class="ai-search-results-summary-simple">
          <p>No results found for "${escapeHtml(query)}"</p>
        </div>
      `;
    }
  }

  // Generate no results or empty state
  let emptyState = '';
  if (query && products.length === 0) {
    emptyState = `
      <div class="ai-search-no-results">
        <h3>No products found for "${escapeHtml(query)}"</h3>
        <p>We couldn't find any products matching your search. Here are some suggestions to help you find what you're looking for:</p>
        <div class="ai-search-suggestions">
          <h4>Try these suggestions:</h4>
          <ul>
            <li><strong>Check your spelling</strong> – Make sure all words are spelled correctly</li>
            <li><strong>Use different keywords</strong> – Try synonyms or more general terms</li>
            <li><strong>Remove filters</strong> – Broaden your search by using fewer words</li>
            <li><strong>Browse categories</strong> – Explore our product collections to discover items</li>
          </ul>
        </div>
        <div class="ai-search-popular-searches">
          <h4>Popular searches:</h4>
          <div class="ai-search-popular-tags">
            <a href="/apps/xpertsearch/search?q=new&shop=${encodeURIComponent(shopDomain)}" class="ai-search-popular-tag">New Arrivals</a>
            <a href="/apps/xpertsearch/search?q=sale&shop=${encodeURIComponent(shopDomain)}" class="ai-search-popular-tag">Sale Items</a>
            <a href="/apps/xpertsearch/search?q=featured&shop=${encodeURIComponent(shopDomain)}" class="ai-search-popular-tag">Featured Products</a>
          </div>
        </div>
      </div>
    `;
  } else if (!query) {
    emptyState = `
      <div class="ai-search-empty-state">
        <h3>Search our products</h3>
        <p>Enter a product name, brand, or description to find exactly what you're looking for.</p>
        <div class="ai-search-examples">
          <h4>Try searching for:</h4>
          <div class="ai-search-example-tags">
                          <a href="${buildFilterUrl({ q: 'shirts' })}" class="ai-search-example-tag">Shirts</a>
              <a href="${buildFilterUrl({ q: 'accessories' })}" class="ai-search-example-tag">Accessories</a>
              <a href="${buildFilterUrl({ q: 'gifts' })}" class="ai-search-example-tag">Gifts</a>
          </div>
        </div>
      </div>
    `;
  }

  // Generate SEO section for products found
  let seoSection = '';
  if (query && products.length > 0) {
    const brands = [...new Set(products.filter(p => p.vendor).map(p => p.vendor))].slice(0, 3).join(', ');
    seoSection = `
      <div class="ai-search-seo-section">
        <h3>About "${escapeHtml(query)}" products</h3>
        <p>
          Discover our collection of ${escapeHtml(query.toLowerCase())} products. 
          Our AI-powered search helps you find exactly what you need from our catalog.
          ${brands ? ` Featured brands include ${escapeHtml(brands)}.` : ''}
        </p>
      </div>
    `;
  }

  // Mobile filter button removed to prevent navigation issues
  const mobileFilterButton = '';

  // Applied filters display removed to prevent navigation issues
  const appliedFilters = '';

  // Create the complete Liquid template that will render within the store's theme
  const liquidTemplate = `
    <link rel="stylesheet" href="${cssUrl}" />
    
    <div class="ai-search-page">
      <div class="ai-search-page-container">
        
        <!-- AI Chat Widget -->
        ${query && products.length > 0 ? `
          <div id="ai-chat-widget" class="ai-chat-widget">
            <button id="ai-chat-toggle" class="ai-chat-toggle" title="Ask AI to refine your search">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span class="ai-chat-toggle-text">Ask AI</span>
            </button>
            
            <div id="ai-chat-popup" class="ai-chat-popup hidden">
              <div class="ai-chat-header">
                <div class="ai-chat-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="m9 12 2 2 4-4"></path>
                  </svg>
                  Refine Search
                </div>
                <button id="ai-chat-close" class="ai-chat-close" type="button">×</button>
              </div>
              
              <div id="ai-chat-messages" class="ai-chat-messages">
                <div class="ai-chat-message assistant">
                  <div class="ai-chat-content">
                    Found ${products.length} products for "${escapeHtml(query)}". How can I help refine your search?
                  </div>
                </div>
              </div>
              
              <form id="ai-chat-form" class="ai-chat-form">
                <div class="ai-chat-input-wrapper">
                  <input type="text" id="ai-chat-input" class="ai-chat-input" placeholder="e.g., under $50, blue color, Nike brand..." />
                  <button type="submit" class="ai-chat-send" disabled>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22,2 15,22 11,13 2,9"></polygon>
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ` : ''}

        <!-- Results Summary -->
        ${resultsSummary}
        
        <!-- Mobile Filter Button and Applied Filters -->
        ${query ? `
          <div class="ai-search-controls">
            <div class="ai-search-mobile-controls">
              ${mobileFilterButton}
              ${sortingDropdown}
            </div>
            ${appliedFilters}
          </div>
        ` : ''}

        <!-- Main Content Area -->
        <div class="ai-search-main-content">
          <!-- Desktop Filters Sidebar -->
          ${filtersSidebar}
          
          <!-- Content Area -->
          <div class="ai-search-content">
            <!-- Desktop Sort (shown only if we have results) -->
            ${query && products.length > 0 ? `
              <div class="ai-search-desktop-sort">
                ${sortingDropdown}
              </div>
            ` : ''}
            
            <!-- Search Results or Empty State -->
            ${products.length > 0 ? productGridHtml : emptyState}
          </div>
        </div>

        <!-- SEO Benefits Section -->
        ${seoSection}
      </div>
      
      <!-- Mobile Filter Overlay removed to prevent navigation issues -->

      <!-- Quick View Modal -->
      <div id="quick-view-overlay" class="ai-search-quick-view-overlay">
        <div class="ai-search-quick-view-modal">
          <div class="ai-search-quick-view-header">
            <h3>Quick View</h3>
            <button id="close-quick-view" class="ai-search-close-quick-view">×</button>
          </div>
          <div class="ai-search-quick-view-content">
            <div class="ai-search-quick-view-loading">
              <div class="ai-search-spinner"></div>
              <p>Loading product details...</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      // Store search context for analytics
      window.searchPageData = {
        query: ${JSON.stringify(query)},
        shopDomain: ${JSON.stringify(shopDomain)},
        sessionId: sessionStorage.getItem('ai_search_session_id') || 'search_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
      };
      
      // Store session ID for later use
      if (!sessionStorage.getItem('ai_search_session_id')) {
        sessionStorage.setItem('ai_search_session_id', window.searchPageData.sessionId);
      }
      
      // Enhanced search page functionality
      document.addEventListener('DOMContentLoaded', function() {
        // Auto-focus search input for better UX (only if no query present)
        var searchInput = document.querySelector('.ai-search-page-input');
        if (searchInput && !searchInput.value.trim()) {
          // Small delay to ensure page has rendered
          setTimeout(function() {
            searchInput.focus();
          }, 100);
        }
        
        // Add click handlers for product cards with analytics tracking
        document.querySelectorAll('.ai-search-product-card').forEach(function(card) {
          card.addEventListener('click', function(event) {
            // Don't navigate if clicking on buttons
            if (event.target.closest('button')) {
              return;
            }
            
            // Track click event for analytics
            var productId = this.getAttribute('data-product-id');
            var position = this.getAttribute('data-position');
            var searchData = window.searchPageData || {};
            
            // Log click event
            fetch('/apps/xpertsearch/api/analytics', {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                event_type: 'click',
                shop_domain: searchData.shopDomain || window.location.hostname,
                product_id: parseInt(productId),
                position: parseInt(position) || 0,
                search_query: searchData.query || '',
                search_id: searchData.sessionId,
                session_id: searchData.sessionId,
                page_url: window.location.href,
                referrer: document.referrer,
                click_source: 'search_results_page'
              })
            }).catch(function(error) {
              console.warn('Failed to track click event:', error);
            });
            
            // Navigate to product page
            var productUrl = this.getAttribute('data-product-url');
            if (productUrl && productUrl !== '#') {
              window.location.href = productUrl;
            }
          });
          
          // Add pointer cursor
          card.style.cursor = 'pointer';
        });
        
        // Mobile filter overlay functionality
        var openFiltersBtn = document.getElementById('open-filters');
        var closeFiltersBtn = document.getElementById('close-filters');
        var filterOverlay = document.getElementById('filter-overlay');
        
        if (openFiltersBtn && filterOverlay) {
          openFiltersBtn.addEventListener('click', function() {
            filterOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
          });
        }
        
        if (closeFiltersBtn && filterOverlay) {
          closeFiltersBtn.addEventListener('click', function() {
            filterOverlay.classList.remove('active');
            document.body.style.overflow = '';
          });
        }
        
        // Close overlay when clicking background
        if (filterOverlay) {
          filterOverlay.addEventListener('click', function(e) {
            if (e.target === filterOverlay) {
              filterOverlay.classList.remove('active');
              document.body.style.overflow = '';
            }
          });
        }
        
        // Quick View modal functionality
        var quickViewOverlay = document.getElementById('quick-view-overlay');
        var closeQuickViewBtn = document.getElementById('close-quick-view');
        
        if (closeQuickViewBtn && quickViewOverlay) {
          closeQuickViewBtn.addEventListener('click', function() {
            quickViewOverlay.classList.remove('active');
            document.body.style.overflow = '';
          });
        }
        
        // Close quick view overlay when clicking background
        if (quickViewOverlay) {
          quickViewOverlay.addEventListener('click', function(e) {
            if (e.target === quickViewOverlay) {
              quickViewOverlay.classList.remove('active');
              document.body.style.overflow = '';
            }
          });
        }
        
        // Performance: Prefetch next page for better Core Web Vitals
        ${hasMore ? `
          setTimeout(function() {
            var prefetch = document.createElement('link');
            prefetch.rel = 'prefetch';
            var currentUrl = new URL(window.location);
            var params = new URLSearchParams(currentUrl.search);
            params.set('offset', '${offset + limit}');
            params.set('limit', '${limit}');
            prefetch.href = '?' + params.toString();
            document.head.appendChild(prefetch);
          }, 1000); // Delay to not interfere with initial page load
        ` : ''}
        
        // ESC key to close modals
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape') {
            if (filterOverlay && filterOverlay.classList.contains('active')) {
              filterOverlay.classList.remove('active');
              document.body.style.overflow = '';
            }
            if (quickViewOverlay && quickViewOverlay.classList.contains('active')) {
              quickViewOverlay.classList.remove('active');
              document.body.style.overflow = '';
            }
          }
        });
      });
      
      // Price filter application function
      function applyPriceFilter() {
        var minPrice = document.getElementById('price-min').value;
        var maxPrice = document.getElementById('price-max').value;
        var currentUrl = new URL(window.location);
        
        if (minPrice) {
          currentUrl.searchParams.set('price_min', minPrice);
        } else {
          currentUrl.searchParams.delete('price_min');
        }
        
        if (maxPrice) {
          currentUrl.searchParams.set('price_max', maxPrice);
        } else {
          currentUrl.searchParams.delete('price_max');
        }
        
        window.location.href = currentUrl.toString();
      }
      
      // The SearchPageManager from search-page.js will handle all add-to-cart and quick-view functionality
      // No need for duplicate inline JavaScript
      
      // Debug: Check if SearchPageManager is loaded
      if (typeof SearchPageManager !== 'undefined') {
        console.log('✅ SearchPageManager is loaded and available');
      } else {
        console.log('⚠️ SearchPageManager not found - check if search-page.js is loading correctly');
      }
      
      // Debug: Add click listener to check if quick view buttons are being clicked
      document.addEventListener('click', function(e) {
        if (e.target.closest('.ai-search-quick-view-btn')) {
          console.log('🔍 Quick View button clicked!', e.target.closest('.ai-search-quick-view-btn'));
        }
      });
      
      // AI Chat Widget Functionality
      var aiChatWidget = document.getElementById('ai-chat-widget');
      var aiChatToggle = document.getElementById('ai-chat-toggle');
      var aiChatPopup = document.getElementById('ai-chat-popup');
      var aiChatClose = document.getElementById('ai-chat-close');
      var aiChatForm = document.getElementById('ai-chat-form');
      var aiChatInput = document.getElementById('ai-chat-input');
      var aiChatMessages = document.getElementById('ai-chat-messages');
      var aiChatSend = document.querySelector('.ai-chat-send');
      var isChatLoading = false;
      
      // Context for conversational search
      var conversationContext = {
        queries: ['${escapeHtml(query)}'],
        filters: ${JSON.stringify(filters)},
        viewedProducts: [],
        preferences: {},
        sessionId: '${Date.now()}'
      };
      
      if (aiChatToggle) {
        aiChatToggle.addEventListener('click', function() {
          if (aiChatPopup) {
            aiChatPopup.classList.remove('hidden');
            setTimeout(function() {
              if (aiChatInput) {
                aiChatInput.focus();
              }
            }, 100);
          }
        });
      }
      
      if (aiChatClose) {
        aiChatClose.addEventListener('click', function() {
          if (aiChatPopup) {
            aiChatPopup.classList.add('hidden');
          }
        });
      }
      
      if (aiChatInput) {
        aiChatInput.addEventListener('input', function() {
          var hasValue = this.value.trim().length > 0;
          if (aiChatSend) {
            aiChatSend.disabled = !hasValue || isChatLoading;
          }
        });
      }
      
      if (aiChatForm) {
        aiChatForm.addEventListener('submit', function(e) {
          e.preventDefault();
          
          var message = aiChatInput.value.trim();
          if (!message || isChatLoading) return;
          
          sendChatMessage(message);
        });
      }
      
      // Close chat when clicking outside
      document.addEventListener('click', function(e) {
        if (aiChatPopup && !aiChatWidget.contains(e.target) && !aiChatPopup.classList.contains('hidden')) {
          aiChatPopup.classList.add('hidden');
        }
      });
      
      function sendChatMessage(message) {
        if (isChatLoading) return;
        
        // Add user message to chat
        addMessageToChat('user', message);
        
        // Clear input and disable submit
        aiChatInput.value = '';
        aiChatSend.disabled = true;
        isChatLoading = true;
        
        // Add loading message
        var loadingId = addMessageToChat('assistant', '', true);
        
        // Send to conversation API
        fetch('/apps/xpertsearch/api/conversation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: getConversationMessages().concat([{
              role: 'user',
              content: message,
              timestamp: Date.now()
            }]),
            shop_domain: '${escapeHtml(shopDomain)}',
            context: conversationContext
          })
        })
        .then(function(response) {
          return response.json();
        })
        .then(function(data) {
          // Remove loading message
          removeMessage(loadingId);
          
          if (data.success && data.data) {
            // Add assistant response
            addMessageToChat('assistant', data.data.message);
            
            // Update context
            if (data.data.context) {
              conversationContext = data.data.context;
            }
            
            // If new products were found, update the page
            if (data.data.products && data.data.products.length > 0) {
              setTimeout(function() {
                // Build new search URL with conversation results
                var newUrl = new URL(window.location);
                if (data.data.search_query) {
                  newUrl.searchParams.set('q', data.data.search_query);
                }
                // Apply any new filters from conversation
                if (data.data.filters) {
                  Object.keys(data.data.filters).forEach(function(key) {
                    if (data.data.filters[key] !== null && data.data.filters[key] !== undefined) {
                      newUrl.searchParams.set(key, data.data.filters[key]);
                    }
                  });
                }
                
                // Redirect to updated search
                window.location.href = newUrl.toString();
              }, 1500);
            }
          } else {
            addMessageToChat('assistant', "I'm sorry, I encountered an issue processing your request. Please try again.");
          }
        })
        .catch(function(error) {
          console.error('Conversation API error:', error);
          removeMessage(loadingId);
          addMessageToChat('assistant', "I'm sorry, I encountered an issue processing your request. Please try again.");
        })
        .finally(function() {
          isChatLoading = false;
        });
      }
      
      function addMessageToChat(role, content, isLoading) {
        var messageId = 'msg-' + Date.now() + Math.random();
        var messageClass = 'ai-chat-message ' + role;
        
        var messageElement = document.createElement('div');
        messageElement.className = messageClass;
        messageElement.id = messageId;
        
        if (isLoading) {
          messageElement.innerHTML = 
            '<div class="ai-chat-content">' +
              '<div class="ai-chat-loading">' +
                '<span></span><span></span><span></span>' +
              '</div>' +
            '</div>';
        } else {
          messageElement.innerHTML = 
            '<div class="ai-chat-content">' + escapeHtml(content) + '</div>';
        }
        
        aiChatMessages.appendChild(messageElement);
        
        // Scroll to bottom
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
        
        return messageId;
      }
      
      function removeMessage(messageId) {
        var element = document.getElementById(messageId);
        if (element) {
          element.remove();
        }
      }
      
      function getConversationMessages() {
        var messages = [];
        var messageElements = aiChatMessages.querySelectorAll('.ai-chat-message');
        
        messageElements.forEach(function(element) {
          var role = element.classList.contains('user') ? 'user' : 'assistant';
          var content = element.querySelector('.ai-chat-content').textContent;
          
          if (content && !element.querySelector('.ai-chat-loading')) {
            messages.push({
              role: role,
              content: content,
              timestamp: Date.now()
            });
          }
        });
        
        return messages;
      }
      
      function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
    </script>
    
    <!-- Clear browser cache for old search assets -->
    <script>
      // Clear any cached search page assets from previous versions
      if ('caches' in window) {
        caches.keys().then(function(cacheNames) {
          cacheNames.forEach(function(cacheName) {
            if (cacheName.includes('ai-search-v1') || cacheName.includes('search-page')) {
              console.log('Clearing old search cache:', cacheName);
              caches.delete(cacheName);
            }
          });
        });
      }
      
      // Force reload of stylesheets if they seem to be cached versions
      const links = document.querySelectorAll('link[rel="stylesheet"]');
      links.forEach(function(link) {
        if (link.href.includes('search-page.css')) {
          const href = link.href;
          link.href = '';
          link.href = href;
        }
      });
      
      // SearchPageManager is automatically initialized by search-page.js
      // No need to initialize it again to prevent duplicate event listeners
    </script>
    
    <!-- Load search page JavaScript for proper button functionality -->
    <script src="${jsUrl}"></script>
  </body>
</html>
  `;

  // Return as Liquid content so it renders within the store's theme
  return new Response(liquidTemplate, {
    status: 200,
    headers: {
      "Content-Type": "application/liquid",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}; 