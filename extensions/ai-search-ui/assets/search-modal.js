(function() {
  'use strict';

  let currentModal = null;
  let currentTimeout = null;
  const SEARCH_DELAY = 3000; // Reduced delay for better UX on redirect

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
          <div class="ai-search-hint">
            Press Enter or click Search to find products
          </div>
        </div>
      </div>
    `;
    
    return modal;
  }

  function redirectToSearch(query) {
    if (!query.trim()) return;

    // Close modal first for smooth transition
    closeModal();
    
    // Redirect to the dedicated search results page
    const shopDomain = window.location.hostname;
    const searchUrl = `/apps/xpertsearch/search?q=${encodeURIComponent(query.trim())}&shop=${shopDomain}`;
    
    // Use window.location.href for better compatibility across all browsers
    window.location.href = searchUrl;
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
      // If there's an initial query, redirect immediately
      setTimeout(() => redirectToSearch(initialQuery), 100);
      return;
    }

    // Event listeners
    closeBtn.addEventListener('click', closeModal);
    currentModal.addEventListener('click', function(e) {
      if (e.target === currentModal) {
        closeModal();
      }
    });

    submitBtn.addEventListener('click', function() {
      redirectToSearch(input.value);
    });

    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        redirectToSearch(input.value);
      }
    });

    // Optional: Auto-redirect after user stops typing (disabled by default)
    // Uncomment the following lines if you want auto-redirect behavior
    /*
    input.addEventListener('input', function() {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
      
      const query = input.value.trim();
      if (query.length > 2) { // Only auto-search for queries longer than 2 characters
        currentTimeout = setTimeout(() => {
          redirectToSearch(query);
        }, SEARCH_DELAY);
      }
    });
    */

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

    // Handle icon button triggers
    document.querySelectorAll('.ai-search-icon-btn').forEach(button => {
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
            if (node.classList && (node.classList.contains('ai-search-trigger-btn') || node.classList.contains('ai-search-icon-btn') || node.classList.contains('ai-search-input'))) {
              initializeTriggers();
            } else if (node.querySelector && (node.querySelector('.ai-search-trigger-btn') || node.querySelector('.ai-search-icon-btn') || node.querySelector('.ai-search-input'))) {
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