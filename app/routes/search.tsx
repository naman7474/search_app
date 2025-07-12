import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { hybridSearch } from "../lib/search/hybrid-search.server";

// Helper function to generate facets from search results
function generateFacets(products: any[]): any {
  const facets = {
    vendors: new Map<string, number>(),
    product_types: new Map<string, number>(),
    availability: { in_stock: 0, out_of_stock: 0 },
    price_range: { min: Infinity, max: 0 }
  };

  products.forEach(product => {
    // Vendor facets
    if (product.vendor) {
      const count = facets.vendors.get(product.vendor) || 0;
      facets.vendors.set(product.vendor, count + 1);
    }

    // Product type facets
    if (product.product_type) {
      const count = facets.product_types.get(product.product_type) || 0;
      facets.product_types.set(product.product_type, count + 1);
    }

    // Availability facets
    if (product.available) {
      facets.availability.in_stock++;
    } else {
      facets.availability.out_of_stock++;
    }

    // Price range
    if (product.price_min) {
      facets.price_range.min = Math.min(facets.price_range.min, product.price_min);
      facets.price_range.max = Math.max(facets.price_range.max, product.price_min);
    }
  });

  // Convert Maps to sorted arrays
  return {
    vendors: Array.from(facets.vendors.entries())
      .sort((a, b) => b[1] - a[1]) // Sort by count
      .slice(0, 10), // Limit to top 10
    product_types: Array.from(facets.product_types.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    availability: facets.availability,
    price_range: facets.price_range.min === Infinity 
      ? { min: 0, max: 0 } 
      : facets.price_range
  };
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

  if (query.trim()) {
    try {
      const startTime = Date.now();
      
      // First, get all results to generate facets (limited to reasonable amount)
      const allResultsSearch = await hybridSearch({
        query: query.trim(),
        shopDomain,
        limit: 200, // Get more results for better facets
        filters: {} // No filters for facet generation
      });
      
      allProducts = allResultsSearch.products;
      
      // Then get filtered and paginated results
      const filteredSearch = await hybridSearch({
        query: query.trim(),
        shopDomain,
        limit: limit + 1, // Get one extra to check if there are more
        filters
      });
      
      let sortedProducts = filteredSearch.products;
      
      // Apply sorting
      if (sortBy === "price_low") {
        sortedProducts.sort((a, b) => (a.price_min || 0) - (b.price_min || 0));
      } else if (sortBy === "price_high") {
        sortedProducts.sort((a, b) => (b.price_min || 0) - (a.price_min || 0));
      } else if (sortBy === "title") {
        sortedProducts.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
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

  // Escape HTML for safe output in Liquid
  function escapeHtml(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Generate CSS link to our search page styles
  const cssUrl = `/apps/xpertsearch/assets/search-page.css`;
  
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
  
  // Generate sorting dropdown
  const sortingDropdown = query ? `
    <div class="ai-search-sorting">
      <label for="sort-select" class="ai-search-sort-label">Sort by:</label>
      <select id="sort-select" class="ai-search-sort-select" onchange="window.location.href='${buildFilterUrl({ sort: '' })}' + '&sort=' + this.value">
        <option value="relevance" ${sortBy === "relevance" ? "selected" : ""}>Relevance</option>
        <option value="price_low" ${sortBy === "price_low" ? "selected" : ""}>Price: Low to High</option>
        <option value="price_high" ${sortBy === "price_high" ? "selected" : ""}>Price: High to Low</option>
        <option value="title" ${sortBy === "title" ? "selected" : ""}>Name A-Z</option>
      </select>
    </div>
  ` : '';
  
  // Generate filtering sidebar for desktop
  const filtersSidebar = query && Object.keys(facets).length > 0 ? `
    <aside class="ai-search-filters">
      <details open>
        <summary>Filters</summary>
        
        ${facets.vendors && facets.vendors.length > 0 ? `
          <div class="ai-search-filter-group">
            <h4>Brand</h4>
            ${facets.vendors.map(([vendorName, count]: [string, number]) => `
              <label class="ai-search-filter-item">
                <input type="checkbox" 
                       onchange="window.location.href='${buildFilterUrl({ vendor: vendor === vendorName ? null : vendorName })}'"
                       ${vendor === vendorName ? "checked" : ""} />
                <span>${escapeHtml(vendorName)} (${count})</span>
              </label>
            `).join('')}
          </div>
        ` : ''}
        
        ${facets.product_types && facets.product_types.length > 0 ? `
          <div class="ai-search-filter-group">
            <h4>Product Type</h4>
            ${facets.product_types.map(([typeName, count]: [string, number]) => `
              <label class="ai-search-filter-item">
                <input type="checkbox" 
                       onchange="window.location.href='${buildFilterUrl({ product_type: productType === typeName ? null : typeName })}'"
                       ${productType === typeName ? "checked" : ""} />
                <span>${escapeHtml(typeName)} (${count})</span>
              </label>
            `).join('')}
          </div>
        ` : ''}
        
        ${facets.availability && (facets.availability.in_stock > 0 || facets.availability.out_of_stock > 0) ? `
          <div class="ai-search-filter-group">
            <h4>Availability</h4>
            <label class="ai-search-filter-item">
              <input type="checkbox" 
                     onchange="window.location.href='${buildFilterUrl({ availability: availability === "in_stock" ? null : "in_stock" })}'"
                     ${availability === "in_stock" ? "checked" : ""} />
              <span>In Stock (${facets.availability.in_stock})</span>
            </label>
            <label class="ai-search-filter-item">
              <input type="checkbox" 
                     onchange="window.location.href='${buildFilterUrl({ availability: availability === "out_of_stock" ? null : "out_of_stock" })}'"
                     ${availability === "out_of_stock" ? "checked" : ""} />
              <span>Out of Stock (${facets.availability.out_of_stock})</span>
            </label>
          </div>
        ` : ''}
        
        ${facets.price_range && facets.price_range.max > 0 ? `
          <div class="ai-search-filter-group">
            <h4>Price Range</h4>
            <div class="ai-search-price-inputs">
              <input type="number" 
                     placeholder="Min" 
                     value="${priceMin || ''}"
                     id="price-min" 
                     class="ai-search-price-input" />
              <input type="number" 
                     placeholder="Max" 
                     value="${priceMax || ''}"
                     id="price-max" 
                     class="ai-search-price-input" />
              <button type="button" onclick="applyPriceFilter()" class="ai-search-apply-price">Apply</button>
            </div>
            <div class="ai-search-price-range-info">
              Range: $${facets.price_range.min.toFixed(2)} - $${facets.price_range.max.toFixed(2)}
            </div>
          </div>
        ` : ''}
      </details>
    </aside>
  ` : '';

  // Generate product grid HTML
  let productGridHtml = '';
  if (products.length > 0) {
    const productCardsHtml = products.map(product => {
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
                <span class="ai-search-sale-price">$${min.toFixed(2)}</span>
                <span class="ai-search-original-price">$${sale_min === sale_max ? sale_min.toFixed(2) : `${sale_min.toFixed(2)} - $${sale_max.toFixed(2)}`}</span>
              </div>
            `;
          } else {
            priceDisplay = `
              <div class="ai-search-product-price">
                <span class="ai-search-sale-price">$${min.toFixed(2)} - $${max.toFixed(2)}</span>
                <span class="ai-search-original-price">$${sale_min.toFixed(2)} - $${sale_max.toFixed(2)}</span>
              </div>
            `;
          }
          saleDisplay = '<span class="ai-search-sale-badge">Sale</span>';
        } else {
          // Regular pricing
          if (min === max) {
            priceDisplay = `<div class="ai-search-product-price">$${min.toFixed(2)}</div>`;
          } else {
            priceDisplay = `<div class="ai-search-product-price">$${min.toFixed(2)} - $${max.toFixed(2)}</div>`;
          }
        }
      } else if (product.price_min) {
        // Fallback to basic pricing
        priceDisplay = `<div class="ai-search-product-price">$${product.price_min.toFixed(2)}</div>`;
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
        <div class="ai-search-product-card" data-product-url="${productUrl}">
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
                <button class="ai-search-add-to-cart-btn" onclick="addToCart('${product.id}', '${escapeHtml(product.title || '')}')">
                  <svg class="ai-search-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,7H16V6A4,4 0 0,0 12,2A4,4 0 0,0 8,6V7H5A1,1 0 0,0 4,8V19A3,3 0 0,0 7,22H17A3,3 0 0,0 20,19V8A1,1 0 0,0 19,7M10,6A2,2 0 0,1 12,4A2,2 0 0,1 14,6V7H10V6M18,19A1,1 0 0,1 17,20H7A1,1 0 0,1 6,19V9H8V10A1,1 0 0,0 10,10A1,1 0 0,0 10,8V9H14V10A1,1 0 0,0 16,10A1,1 0 0,0 16,8V9H18V19Z"/>
                  </svg>
                  Add to Cart
                </button>
                <button class="ai-search-quick-view-btn ai-search-quick-view-icon-only" onclick="quickView('${product.id}', '${product.shopify_product_id}', '${escapeHtml(product.title || '')}')" aria-label="Quick view ${escapeHtml(product.title || '')}" title="Quick View">
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
            <button onclick="document.querySelector('.ai-search-page-input').value='shirts'; document.querySelector('.ai-search-form').submit();" class="ai-search-example-tag">Shirts</button>
            <button onclick="document.querySelector('.ai-search-page-input').value='accessories'; document.querySelector('.ai-search-form').submit();" class="ai-search-example-tag">Accessories</button>
            <button onclick="document.querySelector('.ai-search-page-input').value='gifts'; document.querySelector('.ai-search-form').submit();" class="ai-search-example-tag">Gifts</button>
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

  // Mobile filter button
  const mobileFilterButton = query && Object.keys(facets).length > 0 ? `
    <button id="open-filters" class="ai-search-filter-btn">
      <span>Filters</span>
      ${Object.keys(filters).length > 0 ? `<span class="ai-search-filter-count">${Object.keys(filters).length}</span>` : ''}
    </button>
  ` : '';

  // Applied filters display
  let appliedFilters = '';
  if (Object.keys(filters).length > 0) {
    const filterTags = Object.entries(filters).map(([key, value]) => {
      let label = '';
      if (key === 'vendor') label = `Brand: ${value}`;
      else if (key === 'product_type') label = `Type: ${value}`;
      else if (key === 'availability') label = value === true ? 'In Stock' : 'Out of Stock';
      else if (key === 'price_min') label = `Min: $${value}`;
      else if (key === 'price_max') label = `Max: $${value}`;
      
      return `
        <span class="ai-search-applied-filter">
          ${escapeHtml(label)}
          <button onclick="window.location.href='${buildFilterUrl({ [key]: null })}'" class="ai-search-remove-filter">×</button>
        </span>
      `;
    }).join('');
    
    appliedFilters = `
      <div class="ai-search-applied-filters">
        <h4>Applied Filters:</h4>
        <div class="ai-search-filter-tags">
          ${filterTags}
          <button onclick="window.location.href='${buildFilterUrl(Object.keys(filters).reduce((acc, key) => ({ ...acc, [key]: null }), {}))}'" class="ai-search-clear-filters">Clear All</button>
        </div>
      </div>
    `;
  }

  // Create the complete Liquid template that will render within the store's theme
  const liquidTemplate = `
    <link rel="stylesheet" href="${cssUrl}" />
    
    <div class="ai-search-page">
      <div class="ai-search-page-container">
        


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
      
      <!-- Mobile Filter Overlay -->
      ${query && Object.keys(facets).length > 0 ? `
        <div id="filter-overlay" class="ai-search-filter-overlay">
          <div class="ai-search-filter-modal">
            <div class="ai-search-filter-header">
              <h3>Filters</h3>
              <button id="close-filters" class="ai-search-close-filters">×</button>
            </div>
            <div class="ai-search-filter-content">
              ${filtersSidebar.replace('<aside class="ai-search-filters">', '<div class="ai-search-filters-mobile">').replace('</aside>', '</div>')}
            </div>
          </div>
        </div>
      ` : ''}

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
        
        // Add click handlers for product cards
        document.querySelectorAll('.ai-search-product-card').forEach(function(card) {
          card.addEventListener('click', function(event) {
            // Don't navigate if clicking on buttons
            if (event.target.closest('button')) {
              return;
            }
            
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
      
      // Real Shopify Cart Integration
      function addToCart(productId, productTitle) {
        const button = event.target;
        const originalText = button.innerHTML;
        
        // Show loading state
        button.innerHTML = 'Adding...';
        button.disabled = true;
        
        // Get the first available variant ID for this product (using our internal product ID)
        fetch('/apps/xpertsearch/api/product-variants?product_id=' + productId)
          .then(response => response.json())
          .then(data => {
            if (data.variants && data.variants.length > 0) {
              const defaultVariant = data.variants.find(v => v.available) || data.variants[0];
              
              // Add to Shopify cart using AJAX API
              return fetch('/cart/add.js', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json'
                },
                body: JSON.stringify({
                  id: defaultVariant.id,
                  quantity: 1
                })
              });
            } else {
              throw new Error('No variants available');
            }
          })
          .then(response => {
            if (response.ok) {
              return response.json();
            } else {
              throw new Error('Failed to add to cart');
            }
          })
          .then(cartItem => {
            // Success - update UI
            button.innerHTML = 'Added!';
            button.style.background = '#28a745';
            
            // Update cart count in header if it exists
            updateCartCount();
            
            // Show success notification
            showCartNotification(productTitle + ' added to cart!');
            
            // Reset button after 2 seconds
            setTimeout(function() {
              button.innerHTML = originalText;
              button.disabled = false;
              button.style.background = '';
            }, 2000);
            
            // Track analytics
            if (typeof gtag !== 'undefined') {
              gtag('event', 'add_to_cart', {
                'currency': 'USD',
                'value': cartItem.price / 100,
                'items': [{
                  'item_id': cartItem.variant_id || productId,
                  'item_name': productTitle,
                  'quantity': 1,
                  'price': cartItem.price / 100
                }]
              });
            }
          })
          .catch(error => {
            console.error('Add to cart failed:', error);
            
            // Error state
            button.innerHTML = 'Error';
            button.style.background = '#dc3545';
            
            // Show error notification
            showCartNotification('Failed to add to cart. Please try again.', 'error');
            
            // Reset button after 2 seconds
            setTimeout(function() {
              button.innerHTML = originalText;
              button.disabled = false;
              button.style.background = '';
            }, 2000);
          });
      }
      
      // Update cart count in header
      function updateCartCount() {
        fetch('/cart.js')
          .then(response => response.json())
          .then(cart => {
            const cartCountElements = document.querySelectorAll('.cart-count, [data-cart-count]');
            cartCountElements.forEach(element => {
              element.textContent = cart.item_count;
            });
          })
          .catch(error => console.error('Failed to update cart count:', error));
      }
      
      // Show cart notification
      function showCartNotification(message, type = 'success') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.ai-search-cart-notification');
        existingNotifications.forEach(notification => notification.remove());
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = 'ai-search-cart-notification ai-search-cart-notification-' + type;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Show with animation
        setTimeout(() => notification.classList.add('show'), 100);
        
        // Hide after 3 seconds
        setTimeout(() => {
          notification.classList.remove('show');
          setTimeout(() => notification.remove(), 300);
        }, 3000);
      }
      
      // Quick View functionality with modal
      function quickView(productId, shopifyProductId, productTitle) {
        const overlay = document.getElementById('quick-view-overlay');
        const content = document.querySelector('.ai-search-quick-view-content');
        
        // Show modal with loading state
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Reset content to loading state
        content.innerHTML = \`
          <div class="ai-search-quick-view-loading">
            <div class="ai-search-spinner"></div>
            <p>Loading product details...</p>
          </div>
        \`;
        
        // Fetch product details
        fetch('/apps/xpertsearch/api/product-details?product_id=' + productId)
          .then(response => response.json())
          .then(product => {
            if (product.error) {
              throw new Error(product.error);
            }
            
            // Render product details in modal
            content.innerHTML = \`
              <div class="ai-search-quick-view-product">
                <div class="ai-search-quick-view-images">
                  \${product.image_url ? \`
                    <img src="\${product.image_url}" alt="\${product.title}" class="ai-search-quick-view-main-image" />
                  \` : \`
                    <div class="ai-search-quick-view-placeholder">
                      <svg viewBox="0 0 24 24" class="ai-search-placeholder-icon">
                        <path fill="currentColor" d="M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19M19,19H5V5H19V19M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z" />
                      </svg>
                      <span>No Image</span>
                    </div>
                  \`}
                </div>
                <div class="ai-search-quick-view-details">
                  <h2>\${product.title}</h2>
                  \${product.vendor ? \`<p class="ai-search-quick-view-vendor">\${product.vendor}</p>\` : ''}
                  
                  <div class="ai-search-quick-view-price">
                    \${product.on_sale ? \`
                      <span class="ai-search-sale-price">$\${product.price_range.min.toFixed(2)}</span>
                      <span class="ai-search-original-price">$\${product.price_range.sale_min.toFixed(2)}</span>
                    \` : \`
                      <span class="ai-search-current-price">$\${product.price_range ? product.price_range.min.toFixed(2) : product.price_min.toFixed(2)}</span>
                    \`}
                  </div>
                  
                  \${product.description ? \`
                    <div class="ai-search-quick-view-description">
                      <p>\${product.description.substring(0, 200)}\${product.description.length > 200 ? '...' : ''}</p>
                    </div>
                  \` : ''}
                  
                  <div class="ai-search-quick-view-actions">
                    \${product.available ? \`
                      <button class="ai-search-quick-view-add-cart" onclick="addToCart('\${productId}', '\${product.title}')">
                        <svg class="ai-search-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19,7H16V6A4,4 0 0,0 12,2A4,4 0 0,0 8,6V7H5A1,1 0 0,0 4,8V19A3,3 0 0,0 7,22H17A3,3 0 0,0 20,19V8A1,1 0 0,0 19,7M10,6A2,2 0 0,1 12,4A2,2 0 0,1 14,6V7H10V6M18,19A1,1 0 0,1 17,20H7A1,1 0 0,1 6,19V9H8V10A1,1 0 0,0 10,10A1,1 0 0,0 10,8V9H14V10A1,1 0 0,0 16,10A1,1 0 0,0 16,8V9H18V19Z"/>
                        </svg>
                        Add to Cart
                      </button>
                      <a href="/products/\${product.handle}" class="ai-search-quick-view-full-details">View Full Details</a>
                    \` : \`
                      <p class="ai-search-quick-view-unavailable">Out of Stock</p>
                      <a href="/products/\${product.handle}" class="ai-search-quick-view-full-details">View Product</a>
                    \`}
                  </div>
                </div>
              </div>
            \`;
          })
          .catch(error => {
            console.error('Quick view failed:', error);
            content.innerHTML = \`
              <div class="ai-search-quick-view-error">
                <p>Sorry, we couldn't load the product details.</p>
                <button onclick="quickView('\${productId}', '\${shopifyProductId}', '\${productTitle}')" class="ai-search-retry-btn">Try Again</button>
              </div>
            \`;
          });
        
        // Track analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'view_item', {
            'item_id': shopifyProductId,
            'item_name': productTitle,
            'content_type': 'product'
          });
        }
      }
    </script>
  `;

  // Return as Liquid content so it renders within the store's theme
  return new Response(liquidTemplate, {
    status: 200,
    headers: {
      "Content-Type": "application/liquid",
      "Cache-Control": "no-cache",
    },
  });
}; 