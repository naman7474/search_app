// AI Search - Enhanced search with instant AI-powered results
(function() {
    'use strict';

    // Initialize when DOM is ready
    function initializeWhenReady() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeAISearch);
        } else {
            initializeAISearch();
        }
    }

    function initializeAISearch() {
        // Get configuration
        const config = window.AISearchConfig;
        if (!config || !config.enabled) {
            console.log('AI Search is disabled or not configured');
            return;
        }

        console.log('Initializing AI Search...');

        // Find AI search inputs
        const searchInputs = document.querySelectorAll('.ai-search-input');
        
        if (searchInputs.length === 0) {
            console.warn('No AI search inputs found');
            return;
        }

        console.log(`Found ${searchInputs.length} AI search input(s), enhancing...`);

        // Enhance each search input
        searchInputs.forEach((input, index) => {
            enhanceSearchInput(input, config, index);
        });
    }

    function enhanceSearchInput(input, config, index) {
        // Skip if already enhanced
        if (input.dataset.aiSearchEnhanced) {
            return;
        }
        input.dataset.aiSearchEnhanced = 'true';

        // Get the wrapper (should be the parent)
        const wrapper = input.parentElement;
        
        // Create popover container
        const popover = document.createElement('div');
        popover.className = 'ai-search-popover';
        popover.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            max-height: 400px;
            overflow-y: auto;
            display: none;
            margin-top: 4px;
        `;

        // Create results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'ai-search-results';
        popover.appendChild(resultsContainer);
        
        // Add popover to wrapper
        wrapper.appendChild(popover);

        // Search state
        let currentQuery = '';
        let searchTimeout = null;

        // Search function
        async function performSearch(query) {
            if (query.length < 2) {
                hidePopover();
                return;
            }

            showLoading();

            try {
                const shopDomain = config.shopUrl.replace('https://', '').replace('http://', '');
                const searchUrl = `${config.appProxyUrl}/api/search?q=${encodeURIComponent(query)}&shop=${shopDomain}`;
                
                const response = await fetch(searchUrl);
                const data = await response.json();

                if (data.success && data.data && data.data.products) {
                    showResults(data.data.products.slice(0, config.resultsLimit || 10));
                } else {
                    showNoResults(query);
                }
            } catch (error) {
                console.error('AI Search failed:', error);
                showError();
            }
        }

        // Debounced search
        function debouncedSearch(query) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => performSearch(query), 300);
        }

        // Show loading state
        function showLoading() {
            resultsContainer.innerHTML = `
                <div style="padding: 16px; text-align: center; color: #666;">
                    <div style="display: inline-block; width: 16px; height: 16px; border: 2px solid #ddd; border-top: 2px solid #666; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    <span style="margin-left: 8px;">Searching...</span>
                </div>
            `;
            showPopover();
        }

        // Show results
        function showResults(products) {
            if (products.length === 0) {
                showNoResults(currentQuery);
                return;
            }

            const resultsHtml = products.map(product => `
                <div class="ai-search-result" style="
                    display: flex;
                    padding: 12px;
                    border-bottom: 1px solid #eee;
                    cursor: pointer;
                    transition: background-color 0.2s;
                " data-handle="${product.handle}">
                    ${product.image_url ? `
                        <img src="${product.image_url}" alt="${product.title}" style="
                            width: 48px;
                            height: 48px;
                            object-fit: cover;
                            border-radius: 4px;
                            margin-right: 12px;
                            flex-shrink: 0;
                        ">
                    ` : ''}
                    <div style="flex: 1; min-width: 0;">
                        <div style="font-weight: 500; font-size: 14px; line-height: 1.3; margin-bottom: 4px; color: #333;">
                            ${product.title}
                        </div>
                        <div style="font-size: 13px; color: #666;">
                            ${product.price_min ? `$${product.price_min}` : 'Price varies'}
                        </div>
                    </div>
                </div>
            `).join('');

            resultsContainer.innerHTML = resultsHtml;

            // Add click handlers and hover effects
            resultsContainer.querySelectorAll('.ai-search-result').forEach(item => {
                item.addEventListener('mouseenter', () => {
                    item.style.backgroundColor = '#f8f9fa';
                });
                item.addEventListener('mouseleave', () => {
                    item.style.backgroundColor = 'white';
                });
                item.addEventListener('click', () => {
                    const handle = item.dataset.handle;
                    if (handle) {
                        window.location.href = `/products/${handle}`;
                    }
                });
            });

            showPopover();
        }

        // Show no results
        function showNoResults(query) {
            resultsContainer.innerHTML = `
                <div style="padding: 24px; text-align: center; color: #666; font-size: 14px;">
                    No products found for "${query}"
                </div>
            `;
            showPopover();
        }

        // Show error
        function showError() {
            resultsContainer.innerHTML = `
                <div style="padding: 16px; text-align: center; color: #d32f2f; font-size: 14px;">
                    Search temporarily unavailable. Please try again.
                </div>
            `;
            showPopover();
        }

        // Show/hide popover
        function showPopover() {
            popover.style.display = 'block';
        }

        function hidePopover() {
            popover.style.display = 'none';
        }

        // Event listeners
        input.addEventListener('input', (e) => {
            currentQuery = e.target.value.trim();
            if (currentQuery.length === 0) {
                hidePopover();
                return;
            }
            debouncedSearch(currentQuery);
        });

        input.addEventListener('focus', () => {
            if (currentQuery.length >= 2) {
                showPopover();
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                hidePopover();
            }
        });

        // Close on escape
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hidePopover();
            }
        });

        console.log(`AI Search enhanced input #${index}`);
    }

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .ai-search-popover {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .ai-search-popover * {
            box-sizing: border-box;
        }
    `;
    document.head.appendChild(style);

    // Initialize
    initializeWhenReady();
})();