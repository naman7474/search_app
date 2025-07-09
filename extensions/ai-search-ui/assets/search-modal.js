(function() {
  'use strict';

  let currentModal = null;
  let currentTimeout = null;
  const SEARCH_DELAY = 3000; // 3 seconds delay

  // Utility function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function createModal() {
    const modal = document.createElement('div');
    modal.className = 'ai-search-modal-backdrop';
    modal.innerHTML = `
      <div class="ai-search-modal-container">
        <div class="ai-search-modal-header">
          <h3>AI Search</h3>
          <button class="ai-search-close-btn" type="button">×</button>
        </div>
        <div class="ai-search-modal-search">
          <div class="ai-search-input-container">
            <input type="text" class="ai-search-modal-input" placeholder="Search for products..." autofocus>
            <button class="ai-search-submit-btn" type="button">Search</button>
          </div>
        </div>
        <div class="ai-search-content">
          <!-- Results will be inserted here -->
        </div>
      </div>
    `;
    
    return modal;
  }

  function showLoading(modal) {
    const content = modal.querySelector('.ai-search-content');
    content.innerHTML = `
      <div class="ai-search-loading">
        <div class="ai-search-loading-text">Searching...</div>
      </div>
    `;
  }

  function showError(modal, message = 'Search failed. Please try again.') {
    const content = modal.querySelector('.ai-search-content');
    content.innerHTML = `
      <div class="ai-search-error">
        ${message}
      </div>
    `;
  }

  function displayResults(modal, results) {
    const content = modal.querySelector('.ai-search-content');
    
    if (!results || results.length === 0) {
      content.innerHTML = `
        <div class="ai-search-no-results">
          No products found. Try searching with different keywords.
        </div>
      `;
      return;
    }

    const resultsHTML = results.map(product => {
      const imageUrl = product.image_url || product.featured_image || '';
      const price = product.price_min ? `$${product.price_min.toFixed(2)}` : '';
      const explanation = product.ai_explanation || '';
      const handle = product.handle || '';
      const productUrl = handle ? `/products/${handle}` : '#';
      
      return `
        <div class="ai-search-product" data-product-url="${productUrl}">
          ${imageUrl ? `<img src="${imageUrl}" alt="${escapeHtml(product.title)}" class="ai-search-product-image">` : ''}
          <div class="ai-search-product-info">
            <div class="ai-search-product-title">${escapeHtml(product.title || '')}</div>
            ${price ? `<div class="ai-search-product-price">${price}</div>` : ''}
            ${explanation ? `<div class="ai-search-product-explanation">${escapeHtml(explanation)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    content.innerHTML = `
      <div class="ai-search-results">
        ${resultsHTML}
      </div>
    `;

    // Add click handlers to products
    content.querySelectorAll('.ai-search-product').forEach(product => {
      product.addEventListener('click', function() {
        const url = this.getAttribute('data-product-url');
        if (url && url !== '#') {
          window.location.href = url;
        }
      });
    });
  }

  async function performSearch(query, modal) {
    if (!query.trim()) return;

    showLoading(modal);

    try {
      const shopDomain = window.location.hostname;
      const searchUrl = `/apps/xpertsearch/api/search?q=${encodeURIComponent(query)}&shop=${shopDomain}`;
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      
      // Debug logging to see actual response
      console.log('AI Search Response:', data);
      console.log('Products found:', data?.data?.products?.length || 0);
      
      if (data.success && data.data && data.data.products && Array.isArray(data.data.products)) {
        displayResults(modal, data.data.products);
      } else {
        console.log('No products found or invalid response structure', data);
        showError(modal, data.error || 'No products found matching your search.');
      }
    } catch (error) {
      console.error('Search error:', error);
      showError(modal);
    }
  }

  function openModal(initialQuery = '') {
    if (currentModal) {
      closeModal();
    }

    currentModal = createModal();
    document.body.appendChild(currentModal);
    document.body.style.overflow = 'hidden';

    const input = currentModal.querySelector('.ai-search-modal-input');
    const submitBtn = currentModal.querySelector('.ai-search-submit-btn');
    const closeBtn = currentModal.querySelector('.ai-search-close-btn');

    // Set initial query if provided
    if (initialQuery) {
      input.value = initialQuery;
      performSearch(initialQuery, currentModal);
    }

    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    currentModal.addEventListener('click', function(e) {
      if (e.target === currentModal) {
        closeModal();
      }
    });

    submitBtn.addEventListener('click', function() {
      performSearch(input.value, currentModal);
    });

    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        performSearch(input.value, currentModal);
      }
    });

    // Debounced search on input (only after 3 seconds of no typing)
    input.addEventListener('input', function() {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      
      const query = input.value.trim();
      if (query.length > 0) {
        currentTimeout = setTimeout(() => {
          performSearch(query, currentModal);
        }, SEARCH_DELAY);
      }
    });

    // Escape key to close
    document.addEventListener('keydown', handleEscapeKey);
    
    // Focus the input
    setTimeout(() => input.focus(), 100);
  }

  function closeModal() {
    if (currentModal) {
      document.body.removeChild(currentModal);
      document.body.style.overflow = '';
      currentModal = null;
      
      if (currentTimeout) {
        clearTimeout(currentTimeout);
        currentTimeout = null;
      }
      
      document.removeEventListener('keydown', handleEscapeKey);
    }
  }

  function handleEscapeKey(e) {
    if (e.key === 'Escape') {
      closeModal();
    }
  }

  // Global function to open modal (called by block buttons)
  window.openAISearchModal = function(initialQuery) {
    openModal(initialQuery);
  };

  // Initialize triggers when DOM is ready
  function initializeTriggers() {
    // Handle button triggers
    document.querySelectorAll('.ai-search-trigger-btn').forEach(button => {
      button.addEventListener('click', function() {
        const blockId = this.getAttribute('data-block-id');
        const placeholder = this.getAttribute('data-placeholder');
        openModal('');
      });
    });

    // Handle input triggers (fake inputs that open modal)
    document.querySelectorAll('.ai-search-input').forEach(input => {
      input.addEventListener('click', function() {
        const placeholder = this.getAttribute('placeholder') || '';
        openModal('');
      });
      
      input.addEventListener('focus', function() {
        this.blur(); // Remove focus
        const placeholder = this.getAttribute('placeholder') || '';
        openModal('');
      });
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTriggers);
  } else {
    initializeTriggers();
  }

  // Re-initialize when new content is added (for theme editor)
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(function(node) {
          if (node.nodeType === 1) { // Element node
            if (node.classList && (node.classList.contains('ai-search-trigger-btn') || node.classList.contains('ai-search-input'))) {
              initializeTriggers();
            } else if (node.querySelector && (node.querySelector('.ai-search-trigger-btn') || node.querySelector('.ai-search-input'))) {
              initializeTriggers();
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})(); 