/**
 * Search Page JavaScript Module
 * Handles all interactive functionality for the search results page
 */

class SearchPageManager {
  constructor() {
    console.log('SearchPageManager: Constructor called');
    this.init();
  }

  init() {
    console.log('SearchPageManager: Initializing event listeners and functionality');
    this.bindEventListeners();
    this.setupQuickView();
    this.setupAddToCart();
    this.setupFilters();
    this.setupPagination();
    console.log('SearchPageManager: Initialization complete');
  }

  /**
   * Bind all event listeners
   */
  bindEventListeners() {
    console.log('SearchPageManager: Binding event listeners');
    
    // Add to cart buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.ai-search-add-to-cart-btn')) {
        console.log('SearchPageManager: Add to cart button clicked');
        e.preventDefault();
        const button = e.target.closest('.ai-search-add-to-cart-btn');
        const productId = button.dataset.productId;
        const productTitle = button.dataset.productTitle;
        console.log('SearchPageManager: Product ID:', productId, 'Title:', productTitle);
        this.handleAddToCart(button, productId, productTitle);
      }
    });

    // Quick view buttons
    document.addEventListener('click', (e) => {
      if (e.target.closest('.ai-search-quick-view-btn')) {
        e.preventDefault();
        const button = e.target.closest('.ai-search-quick-view-btn');
        const productId = button.dataset.productId;
        this.handleQuickView(productId);
      }
    });

    // Filter toggles
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-filter-toggle]')) {
        e.preventDefault();
        const toggle = e.target.closest('[data-filter-toggle]');
        this.toggleFilter(toggle);
      }
    });

    // Price filter apply button
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-apply-price-filter]')) {
        e.preventDefault();
        this.handlePriceFilter();
      }
    });

    // Close modals on overlay click
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('ai-search-modal-overlay')) {
        this.closeModal();
      }
    });

    // Close modals on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });

    // Pagination links
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-pagination]')) {
        e.preventDefault();
        const link = e.target.closest('[data-pagination]');
        const url = link.href;
        this.loadPage(url);
      }
    });
  }

  /**
   * Handle add to cart functionality with error handling
   */
  async handleAddToCart(button, productId, productTitle) {
    if (!productId || !productTitle) {
      console.error('Missing product data for add to cart');
      this.showError('Unable to add product to cart. Missing product information.');
      return;
    }

    const originalText = button.innerHTML;
    const originalDisabled = button.disabled;

    try {
      // Show loading state
      button.innerHTML = `
        <span class="ai-search-spinner"></span>
        Adding...
      `;
      button.disabled = true;

      // Get the first available variant ID
      const variantResponse = await this.fetchWithRetry(
        `/apps/xpertsearch/api/product-variants?product_id=${encodeURIComponent(productId)}`,
        { timeout: 5000 }
      );

      if (!variantResponse.ok) {
        throw new Error(`Failed to fetch variants: ${variantResponse.statusText}`);
      }

      const variantData = await variantResponse.json();
      
      if (!variantData.variants || variantData.variants.length === 0) {
        throw new Error('No variants available for this product');
      }

      const defaultVariant = variantData.variants.find(v => v.available) || variantData.variants[0];
      
      if (!defaultVariant.available) {
        throw new Error('Product is currently out of stock');
      }

      // Add to Shopify cart
      const cartResponse = await this.fetchWithRetry('/cart/add.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          id: defaultVariant.id,
          quantity: 1
        }),
        timeout: 5000
      });

      if (!cartResponse.ok) {
        const errorData = await cartResponse.json().catch(() => ({}));
        throw new Error(errorData.description || 'Failed to add to cart');
      }

      const cartItem = await cartResponse.json();

      // Success state
      button.innerHTML = `
        <svg class="ai-search-btn-icon ai-search-success-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
        </svg>
        Added!
      `;
      button.classList.add('ai-search-success');

      // Update cart count if element exists
      this.updateCartCount();

      // Show success notification
      this.showSuccess(`${productTitle} added to cart!`);

      // Track analytics
      this.trackAddToCart(productId, productTitle, cartItem);

    } catch (error) {
      console.error('Add to cart error:', error);
      
      // Error state
      button.innerHTML = `
        <svg class="ai-search-btn-icon ai-search-error-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
        </svg>
        Try Again
      `;
      button.classList.add('ai-search-error');

      // Show user-friendly error message
      const userMessage = this.getUserFriendlyErrorMessage(error.message);
      this.showError(userMessage);

    } finally {
      // Reset button after 3 seconds
      setTimeout(() => {
        button.innerHTML = originalText;
        button.disabled = originalDisabled;
        button.classList.remove('ai-search-success', 'ai-search-error');
      }, 3000);
    }
  }

  /**
   * Handle quick view modal
   */
  async handleQuickView(productId) {
    try {
      const response = await this.fetchWithRetry(
        `/apps/xpertsearch/api/product-details?product_id=${encodeURIComponent(productId)}`,
        { timeout: 5000 }
      );

      if (!response.ok) {
        throw new Error('Failed to load product details');
      }

      const productData = await response.json();
      this.showQuickViewModal(productData);

    } catch (error) {
      console.error('Quick view error:', error);
      this.showError('Unable to load product details. Please try again.');
    }
  }

  /**
   * Show quick view modal with product details
   */
  showQuickViewModal(product) {
    const modal = document.createElement('div');
    modal.className = 'ai-search-modal-overlay';
    modal.innerHTML = `
      <div class="ai-search-modal ai-search-quick-view-modal" role="dialog" aria-modal="true" aria-labelledby="quick-view-title">
        <div class="ai-search-modal-header">
          <h2 id="quick-view-title">${this.escapeHtml(product.title)}</h2>
          <button class="ai-search-modal-close" aria-label="Close modal">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z"/>
            </svg>
          </button>
        </div>
        <div class="ai-search-modal-content">
          <div class="ai-search-quick-view-content">
            <div class="ai-search-quick-view-image">
              ${product.image_url ? `<img src="${product.image_url}" alt="${this.escapeHtml(product.title)}" loading="lazy">` : ''}
            </div>
            <div class="ai-search-quick-view-details">
              <div class="ai-search-quick-view-price">
                ${this.formatPrice(product.price_min, product.price_max)}
              </div>
              ${product.description ? `<div class="ai-search-quick-view-description">${product.description}</div>` : ''}
              <div class="ai-search-quick-view-actions">
                <button 
                  class="ai-search-quick-view-add-cart ai-search-add-to-cart-btn" 
                  data-product-id="${product.id}" 
                  data-product-title="${this.escapeHtml(product.title)}"
                  ${!product.available ? 'disabled' : ''}
                >
                  <svg class="ai-search-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19,7H16V6A4,4 0 0,0 12,2A4,4 0 0,0 8,6V7H5A1,1 0 0,0 4,8V19A3,3 0 0,0 7,22H17A3,3 0 0,0 20,19V8A1,1 0 0,0 19,7M10,6A2,2 0 0,1 12,4A2,2 0 0,1 14,6V7H10V6M18,19A1,1 0 0,1 17,20H7A1,1 0 0,1 6,19V9H8V10A1,1 0 0,0 10,10A1,1 0 0,0 10,8V9H14V10A1,1 0 0,0 16,10A1,1 0 0,0 16,8V9H18V19Z"/>
                  </svg>
                  ${product.available ? 'Add to Cart' : 'Out of Stock'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    
    // Focus management for accessibility
    const closeButton = modal.querySelector('.ai-search-modal-close');
    closeButton.focus();
    
    // Trap focus within modal
    this.trapFocus(modal);

    // Close button functionality
    closeButton.addEventListener('click', () => this.closeModal());
  }

  /**
   * Close any open modals
   */
  closeModal() {
    const modals = document.querySelectorAll('.ai-search-modal-overlay');
    modals.forEach(modal => modal.remove());
  }

  /**
   * Fetch with retry logic and timeout
   */
  async fetchWithRetry(url, options = {}, retries = 2) {
    const { timeout = 5000, ...fetchOptions } = options;
    
    for (let i = 0; i <= retries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        return response;
        
      } catch (error) {
        if (i === retries) {
          throw error;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }

  /**
   * Update cart count in header
   */
  async updateCartCount() {
    try {
      const response = await fetch('/cart.js');
      if (response.ok) {
        const cart = await response.json();
        const countElements = document.querySelectorAll('[data-cart-count]');
        countElements.forEach(el => {
          el.textContent = cart.item_count || 0;
        });
      }
    } catch (error) {
      console.error('Failed to update cart count:', error);
    }
  }

  /**
   * Show success notification
   */
  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  /**
   * Show error notification
   */
  showError(message) {
    this.showNotification(message, 'error');
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `ai-search-notification ai-search-notification-${type}`;
    notification.innerHTML = `
      <div class="ai-search-notification-content">
        <span class="ai-search-notification-message">${this.escapeHtml(message)}</span>
        <button class="ai-search-notification-close" aria-label="Close notification">×</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-hide after 5 seconds
    const autoHide = setTimeout(() => notification.remove(), 5000);

    // Manual close
    notification.querySelector('.ai-search-notification-close').addEventListener('click', () => {
      clearTimeout(autoHide);
      notification.remove();
    });
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyErrorMessage(errorMessage) {
    const errorMap = {
      'Failed to fetch': 'Network error. Please check your connection and try again.',
      'The operation was aborted': 'Request timed out. Please try again.',
      'No variants available': 'This product is currently unavailable.',
      'Product is currently out of stock': 'This item is out of stock.',
    };

    return errorMap[errorMessage] || 'Something went wrong. Please try again.';
  }

  /**
   * Format price for display
   */
  formatPrice(minPrice, maxPrice) {
    if (!minPrice) return 'Price unavailable';
    
    // Get store currency from Shopify global or default to USD
    const currency = window.Shopify?.currency?.active || 'USD';
    
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    });

    if (!maxPrice || minPrice === maxPrice) {
      return formatter.format(minPrice);
    }

    return `${formatter.format(minPrice)} - ${formatter.format(maxPrice)}`;
  }

  /**
   * Escape HTML for security
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Trap focus within an element (for accessibility)
   */
  trapFocus(element) {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  }

  /**
   * Track add to cart analytics
   */
  trackAddToCart(productId, productTitle, cartItem) {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', 'add_to_cart', {
        currency: 'USD',
        value: cartItem.price / 100,
        items: [{
          item_id: cartItem.variant_id || productId,
          item_name: productTitle,
          price: cartItem.price / 100,
          quantity: 1,
        }]
      });
    }

    // Custom analytics endpoint
    fetch('/apps/xpertsearch/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'add_to_cart',
        product_id: productId,
        product_title: productTitle,
        variant_id: cartItem.variant_id,
        price: cartItem.price,
      })
    }).catch(error => console.error('Analytics tracking failed:', error));
  }

  /**
   * Handle price filter application
   */
  handlePriceFilter() {
    const priceMinInput = document.getElementById('price-min');
    const priceMaxInput = document.getElementById('price-max');
    
    if (!priceMinInput || !priceMaxInput) return;
    
    const priceMin = priceMinInput.value.trim();
    const priceMax = priceMaxInput.value.trim();
    
    // Build the current URL with new price filters
    const url = new URL(window.location);
    
    if (priceMin) {
      url.searchParams.set('price_min', priceMin);
    } else {
      url.searchParams.delete('price_min');
    }
    
    if (priceMax) {
      url.searchParams.set('price_max', priceMax);
    } else {
      url.searchParams.delete('price_max');
    }
    
    // Navigate to the new URL
    window.location.href = url.toString();
  }

  /**
   * Setup other functionality placeholders
   */
  setupQuickView() {
    // Additional quick view setup if needed
  }

  setupAddToCart() {
    // Additional add to cart setup if needed
  }

  setupFilters() {
    // Filter functionality setup
  }

  setupPagination() {
    // Pagination setup
  }

  toggleFilter(toggle) {
    // Filter toggle implementation
  }

  loadPage(url) {
    // Page loading implementation
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('SearchPageManager: Initializing after DOM loaded');
    new SearchPageManager();
  });
} else {
  console.log('SearchPageManager: Initializing immediately');
  new SearchPageManager();
} 