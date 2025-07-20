import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Icons as components
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18m9-9H3m7.5-7.5L3 21m18-10.5L10.5 21m10.5-18L3 13.5M21 3L13.5 10.5"/>
  </svg>
);

// Enhanced CSS with modern design
const styles = `
  /* CSS Variables for theming */
  :root {
    --primary: #6366f1;
    --primary-hover: #5558e3;
    --primary-light: rgba(99, 102, 241, 0.1);
    --primary-glow: rgba(99, 102, 241, 0.3);
    --secondary: #8b5cf6;
    --accent: #ec4899;
    --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    --gradient-accent: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    --text: #1f2937;
    --text-secondary: #6b7280;
    --text-tertiary: #9ca3af;
    --text-inverse: #ffffff;
    --bg: #ffffff;
    --bg-secondary: #f9fafb;
    --bg-elevated: #ffffff;
    --bg-glass: rgba(255, 255, 255, 0.8);
    --border: #e5e7eb;
    --border-hover: #d1d5db;
    --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    --shadow-2xl: 0 35px 60px -15px rgba(0, 0, 0, 0.3);
    --radius-sm: 6px;
    --radius: 8px;
    --radius-lg: 12px;
    --radius-xl: 16px;
    --radius-2xl: 24px;
    --transition: 0.2s ease;
    --transition-slow: 0.3s ease;
    --spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  }

  /* Container Styles */
  .ai-search-container {
    position: relative;
    z-index: 100;
  }

  .ai-search-container.button-mode {
    display: inline-block;
  }

  .ai-search-container.bar-mode {
    width: 100%;
    max-width: 480px;
  }

  /* Sexy Search Button */
  .ai-search-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 12px 24px;
    background: var(--gradient-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-2xl);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-md), 0 0 20px var(--primary-glow);
    overflow: hidden;
  }

  .ai-search-button::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
    transform: rotate(45deg) translateX(-100%);
    transition: transform 0.6s;
  }

  .ai-search-button:hover::before {
    transform: rotate(45deg) translateX(100%);
  }

  .ai-search-button:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: var(--shadow-xl), 0 0 30px var(--primary-glow);
  }

  .ai-search-button:active {
    transform: translateY(0) scale(0.98);
  }

  .button-text {
    position: relative;
    z-index: 1;
  }

  .ai-search-button svg {
    position: relative;
    z-index: 1;
    transition: transform var(--transition);
  }

  .ai-search-button:hover svg {
    transform: rotate(90deg);
  }

  /* Sexy Search Bar */
  .search-input-wrapper {
    position: relative;
    width: 100%;
  }

  .ai-search-input {
    width: 100%;
    padding: 16px 56px 16px 24px;
    background: var(--bg-elevated);
    border: 2px solid transparent;
    border-radius: var(--radius-2xl);
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
    transition: all var(--transition);
    box-shadow: var(--shadow-md);
    background-image: linear-gradient(var(--bg-elevated), var(--bg-elevated)), var(--gradient-primary);
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }

  .ai-search-input::placeholder {
    color: var(--text-tertiary);
    font-weight: 400;
  }

  .ai-search-input:hover {
    box-shadow: var(--shadow-lg);
    transform: translateY(-1px);
  }

  .ai-search-input:focus {
    outline: none;
    box-shadow: var(--shadow-xl), 0 0 0 4px var(--primary-light);
    transform: translateY(-2px);
  }

  .search-icon-button {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gradient-primary);
    border: none;
    color: var(--text-inverse);
    cursor: pointer;
    border-radius: var(--radius-xl);
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .search-icon-button:hover {
    transform: translateY(-50%) scale(1.1);
    box-shadow: var(--shadow-md);
  }

  /* Enhanced Modal Overlay with Blur */
  .ai-search-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    z-index: 99999;
    animation: fadeIn var(--transition-slow) ease-out;
  }

  @keyframes fadeIn {
    from { 
      opacity: 0;
      backdrop-filter: blur(0px);
    }
    to { 
      opacity: 1;
      backdrop-filter: blur(10px);
    }
  }

  /* Modern Modal Design */
  .ai-search-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 90vw;
    max-width: 900px;
    height: 85vh;
    max-height: 700px;
    background: var(--bg-elevated);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-2xl);
    overflow: hidden;
    animation: modalEntry var(--transition-slow) var(--spring);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  @keyframes modalEntry {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  /* Unified Search Container */
  .unified-search {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-elevated);
  }

  /* Search Header */
  .search-header {
    padding: 24px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-elevated) 100%);
  }

  .search-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .search-header h3 {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    color: var(--text);
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .search-close-button {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-glass);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-lg);
    transition: all var(--transition);
    font-size: 24px;
  }

  .search-close-button:hover {
    background: var(--bg-secondary);
    color: var(--text);
    border-color: var(--primary);
    transform: rotate(90deg);
  }

  /* Search Input Section */
  .search-input-section {
    padding: 20px 24px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .search-form {
    width: 100%;
  }

  .search-input-wrapper {
    position: relative;
  }

  .search-input {
    width: 100%;
    padding: 16px 60px 16px 24px;
    background: var(--bg-elevated);
    border: 2px solid var(--border);
    border-radius: var(--radius-xl);
    font-size: 18px;
    font-weight: 500;
    color: var(--text);
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: var(--shadow-md), 0 0 0 4px var(--primary-light);
  }

  .search-button {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    background: var(--gradient-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .search-button:hover:not(:disabled) {
    transform: translateY(-50%) scale(1.1);
    box-shadow: var(--shadow-md);
  }

  .search-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Content Area */
  .search-results-section {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    background: linear-gradient(to bottom, var(--bg-secondary), var(--bg));
  }

  /* Results Header */
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .results-header h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  /* Refine Search Button - The Sexy CTA */
  .refine-search-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: var(--gradient-secondary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-xl);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-md), 0 0 20px rgba(139, 92, 246, 0.3);
    position: relative;
    overflow: hidden;
  }

  .refine-search-button::before {
    content: '';
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: var(--gradient-accent);
    border-radius: var(--radius-xl);
    opacity: 0;
    z-index: -1;
    transition: opacity var(--transition);
  }

  .refine-search-button:hover::before {
    opacity: 1;
  }

  .refine-search-button:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: var(--shadow-lg), 0 0 30px rgba(139, 92, 246, 0.4);
  }

  .refine-search-button span {
    position: relative;
    z-index: 1;
  }

  .refine-search-button svg {
    position: relative;
    z-index: 1;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }

  /* Products Grid */
  .products-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr); /* 2x2 grid on desktop */
    gap: 20px;
  }

  /* Product Card */
  .product-card {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
    position: relative;
  }

  .product-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--gradient-primary);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--transition);
  }

  .product-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-light);
  }

  .product-card:hover::before {
    transform: scaleX(1);
  }

  .product-image-container {
    position: relative;
    padding-top: 100%;
    background: var(--bg-secondary);
    overflow: hidden;
  }

  .product-image {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform var(--transition-slow);
  }

  .product-image-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: var(--bg-secondary);
    color: var(--text-secondary);
    text-align: center;
  }

  .placeholder-icon {
    width: 48px;
    height: 48px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  .product-image-placeholder span {
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .product-card:hover .product-image {
    transform: scale(1.1);
  }

  .product-info {
    padding: 16px;
  }

  .product-title {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.4;
  }

  .product-vendor {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: var(--text-secondary);
  }

  .product-price {
    font-size: 18px;
    font-weight: 700;
    color: var(--primary);
  }

  .product-unavailable {
    display: inline-block;
    margin-top: 8px;
    padding: 4px 8px;
    background: var(--border);
    color: var(--text-secondary);
    font-size: 12px;
    border-radius: var(--radius-sm);
  }

  /* Loading State */
  .search-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 20px;
    color: var(--text-secondary);
  }

  .loading-spinner {
    width: 48px;
    height: 48px;
    border: 4px solid var(--border);
    border-top: 4px solid var(--primary);
    border-radius: 50%;
    animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
    margin-bottom: 20px;
  }

  .loading-spinner-small {
    width: 20px;
    height: 20px;
    border: 2px solid var(--text-inverse);
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Chat Section - Premium Design */
  .chat-section {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 400px;
    background: var(--bg-elevated);
    border-top: 1px solid var(--border);
    box-shadow: 0 -10px 30px -5px rgba(0, 0, 0, 0.1);
    display: flex;
    flex-direction: column;
    animation: slideUp var(--transition-slow) var(--spring);
  }

  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 24px;
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-elevated) 100%);
    border-bottom: 1px solid var(--border);
  }

  .chat-header h4 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    background: var(--gradient-secondary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .chat-close-button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius);
    transition: all var(--transition);
    font-size: 20px;
  }

  .chat-close-button:hover {
    background: var(--bg-secondary);
    color: var(--text);
    border-color: var(--primary);
    transform: rotate(90deg);
  }

  /* Chat Messages */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    background: linear-gradient(to bottom, var(--bg-secondary), var(--bg));
  }

  .chat-message {
    margin-bottom: 16px;
    animation: messageIn var(--transition) ease-out;
  }

  @keyframes messageIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .user-message {
    display: flex;
    justify-content: flex-end;
  }

  .assistant-message {
    display: flex;
    justify-content: flex-start;
  }

  .message-content {
    max-width: 70%;
    padding: 12px 16px;
    border-radius: var(--radius-xl);
    font-size: 14px;
    line-height: 1.5;
  }

  .user-message .message-content {
    background: var(--gradient-primary);
    color: var(--text-inverse);
    border-bottom-right-radius: var(--radius-sm);
  }

  .assistant-message .message-content {
    background: var(--bg-secondary);
    color: var(--text);
    border: 1px solid var(--border);
    border-bottom-left-radius: var(--radius-sm);
  }

  /* Typing Indicator */
  .typing-indicator {
    display: flex;
    gap: 4px;
    padding: 4px;
  }

  .typing-indicator span {
    width: 8px;
    height: 8px;
    background: var(--text-secondary);
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;
  }

  .typing-indicator span:nth-child(1) {
    animation-delay: -0.32s;
  }

  .typing-indicator span:nth-child(2) {
    animation-delay: -0.16s;
  }

  @keyframes typing {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* Chat Input */
  .chat-input-form {
    padding: 16px 20px;
    background: var(--bg-elevated);
    border-top: 1px solid var(--border);
  }

  .chat-input-wrapper {
    position: relative;
    display: flex;
    gap: 8px;
  }

  .chat-input {
    flex: 1;
    padding: 12px 16px;
    background: var(--bg-secondary);
    border: 2px solid var(--border);
    border-radius: var(--radius-xl);
    font-size: 14px;
    color: var(--text);
    transition: all var(--transition);
  }

  .chat-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px var(--primary-light);
  }

  .chat-send-button {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gradient-secondary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .chat-send-button:hover:not(:disabled) {
    transform: scale(1.1);
    box-shadow: var(--shadow-md);
  }

  .chat-send-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* No Results */
  .no-results {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
  }

  .no-results h4 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
  }

  /* Error State */
  .search-error {
    text-align: center;
    padding: 40px 20px;
    color: #ef4444;
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .ai-search-modal {
      width: 100vw;
      height: 100vh;
      max-width: none;
      max-height: none;
      border-radius: 0;
    }

    .products-grid {
      grid-template-columns: repeat(2, 1fr); /* Keep 2x2 grid even on mobile */
    }

    .message-content {
      max-width: 85%;
    }

    .chat-section {
      height: 50vh;
    }
  }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Unified Search Component
const UnifiedSearch = ({ shopUrl, appProxyUrl, onProductClick, formatPrice, onClose, placeholderText }) => {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [context, setContext] = useState(null);

  const inputRef = useRef(null);
  const chatInputRef = useRef(null);
  const resultsRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to results when search completes
  useEffect(() => {
    if (hasSearched && products.length > 0 && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [hasSearched, products]);

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const shopDomain = shopUrl.replace('https://', '').replace('http://', '').replace('/', '');
      const searchUrl = `${appProxyUrl}/api/search?q=${encodeURIComponent(searchQuery)}&shop=${shopDomain}`;
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Debug logging
      console.log('Search response:', data);
      console.log('Products found:', data?.data?.products?.length || 0);

      if (data.success && data.data && data.data.products) {
        console.log('Setting products:', data.data.products);
        
        // Debug image URLs
        data.data.products.forEach((product, index) => {
          console.log(`Product ${index}: ${product.title}, Image URL: ${product.image_url || 'NO IMAGE'}`);
        });
        
        setProducts(data.data.products);
        // Initialize context for chat
        setContext({
          queries: [searchQuery],
          filters: data.data.query_info?.parsed_query?.filters || {},
          viewedProducts: [],
          preferences: {},
          sessionId: data.data.search_id || Date.now().toString(),
        });
      } else {
        console.log('No products found or invalid response structure', data);
        setProducts([]);
        setError(data.error || 'No products found');
      }
    } catch (error) {
      console.error('Search failed:', error);
      setError('Search is currently unavailable. Please try again later.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      performSearch(query.trim());
    }
  };

  const handleRefineSearch = () => {
    setShowChat(true);
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: `I found ${products.length} products for "${query}". How would you like to refine your search? You can ask me to filter by price, color, brand, or any other preferences.`,
          timestamp: Date.now(),
        },
      ]);
    }
    setTimeout(() => chatInputRef.current?.focus(), 100);
  };

  const sendChatMessage = async (content) => {
    if (!content.trim() || isChatLoading) return;

    const userMessage = {
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const shopDomain = shopUrl.replace('https://', '').replace('http://', '').replace('/', '');
      const conversationUrl = `${appProxyUrl}/api/conversation`;

      const response = await fetch(conversationUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          shop_domain: shopDomain,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`Conversation failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const assistantMessage = {
          role: 'assistant',
          content: data.data.message,
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Update products if new search was performed
        if (data.data.products && data.data.products.length > 0) {
          setProducts(data.data.products);
        }

        // Update context
        if (data.data.context) {
          setContext(data.data.context);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat failed:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an issue processing your request. Please try again.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    sendChatMessage(chatInput);
  };

  return (
    <div className="unified-search">
      {/* Header */}
      <div className="search-header">
        <div className="search-header-content">
          <h3>Search Products</h3>
          <button 
            className="search-close-button" 
            onClick={onClose}
            aria-label="Close search"
            type="button"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main Search Input */}
      <div className="search-input-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="search-input"
              placeholder={placeholderText}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              autoComplete="off"
            />
            <button 
              type="submit"
              className="search-button"
              disabled={!query.trim() || isLoading}
              aria-label="Search"
            >
              {isLoading ? (
                <div className="loading-spinner-small"></div>
              ) : (
                <SearchIcon />
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="search-loading">
          <div className="loading-spinner"></div>
          <p>Searching for products...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="search-error">
          <p>{error}</p>
        </div>
      )}

      {/* Search Results */}
      {hasSearched && !isLoading && products.length > 0 && (
        <div ref={resultsRef} className="search-results-section">
          <div className="results-header">
            <h4>{products.length} Products Found</h4>
            <button 
              className="refine-search-button"
              onClick={handleRefineSearch}
              type="button"
            >
              <SparkleIcon />
              <span>Refine with AI</span>
            </button>
          </div>
          
          <div className="products-grid">
            {products.map((product) => (
              <div 
                key={product.id || product.shopify_product_id} 
                className="product-card"
                onClick={() => onProductClick(product)}
              >
                <div className="product-image-container">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.title}
                      className="product-image"
                      onError={(e) => {
                        console.log(`Failed to load image for ${product.title}:`, product.image_url);
                        e.target.style.display = 'none';
                        e.target.nextElementSibling.style.display = 'flex';
                      }}
                      onLoad={(e) => {
                        console.log(`Successfully loaded image for ${product.title}`);
                      }}
                    />
                  ) : null}
                  <div 
                    className="product-image-placeholder" 
                    style={{ display: product.image_url ? 'none' : 'flex' }}
                  >
                    <svg viewBox="0 0 24 24" className="placeholder-icon">
                      <path fill="currentColor" d="M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19M19,19H5V5H19V19M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z" />
                    </svg>
                    <span>No Image</span>
                  </div>
                </div>
                <div className="product-info">
                  <h5 className="product-title">{product.title}</h5>
                  {product.vendor && (
                    <p className="product-vendor">{product.vendor}</p>
                  )}
                  <div className="product-price">
                    {product.price_min && formatPrice(product.price_min)}
                    {product.price_max && product.price_max !== product.price_min && (
                      <span> - {formatPrice(product.price_max)}</span>
                    )}
                  </div>
                  {!product.available && (
                    <span className="product-unavailable">Out of stock</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {hasSearched && !isLoading && products.length === 0 && !error && (
        <div className="no-results">
          <h4>No products found</h4>
          <p>Try adjusting your search terms or browse our categories.</p>
        </div>
      )}

      {/* Chat Refinement Section */}
      {showChat && (
        <div className="chat-section">
          <div className="chat-header">
            <h4>Refine Your Search with AI</h4>
            <button 
              className="chat-close-button"
              onClick={() => setShowChat(false)}
              type="button"
            >
              ×
            </button>
          </div>
          
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div 
                key={index} 
                className={`chat-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
              >
                <div className="message-content">
                  {message.content}
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="chat-message assistant-message">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form className="chat-input-form" onSubmit={handleChatSubmit}>
            <div className="chat-input-wrapper">
              <input
                ref={chatInputRef}
                type="text"
                className="chat-input"
                placeholder="Ask me to refine your search..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatLoading}
              />
              <button 
                type="submit"
                className="chat-send-button"
                disabled={!chatInput.trim() || isChatLoading}
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22,2 15,22 11,13 2,9"></polygon>
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// Main App Component
const AISearchApp = () => {
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchInputRef = useRef(null);

  // Get configuration from DOM
  const rootElement = document.getElementById('ai-search-root');
  const shopUrl = rootElement?.dataset?.shopUrl || window.Shopify?.shop || '';
  const appProxyUrl = rootElement?.dataset?.appProxyUrl || '/apps/xpertsearch';
  const displayMode = rootElement?.dataset?.displayMode || window.AISearchConfig?.displayMode || 'bar';
  const placeholderText = rootElement?.dataset?.placeholder || window.AISearchConfig?.placeholderText || 'Search for products...';
  
  // Debug logging for configuration
  console.log('AI Search Configuration:', {
    shopUrl,
    appProxyUrl,
    displayMode,
    placeholderText,
    rootElement: rootElement,
    dataset: rootElement?.dataset
  });

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isModalOpen) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen]);

  // Open modal
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    setQuery('');
  };

  // Handle product click
  const handleProductClick = (product) => {
    if (product.handle) {
      // Navigate to product page
      const productUrl = `${shopUrl}/products/${product.handle}`;
      window.open(productUrl, '_blank');
    }
  };

  // Format price
  const formatPrice = (price) => {
    if (!price) return '';
    
    // Try to get shop currency from Shopify
    const currency = window.Shopify?.currency?.active || 'USD';
    
    try {
      // Use Intl.NumberFormat for proper currency formatting
      const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
      });
      return formatter.format(price);
    } catch (error) {
      // Fallback to simple formatting if currency is not supported
      const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
      return `${currencySymbol}${price.toFixed(2)}`;
    }
  };

  // Handle input change (for external input only)
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
  };

  // Handle key press for external input
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      openModal();
    }
  };

  return (
    <>
      {/* Widget - Button or Bar */}
      <div className={`ai-search-container ${displayMode === 'button' ? 'button-mode' : 'bar-mode'}`}>
        {displayMode === 'button' ? (
          <button 
            className="ai-search-button" 
            onClick={openModal}
            aria-label="Open search"
            type="button"
          >
            <SearchIcon />
            <span className="button-text">Search</span>
          </button>
        ) : (
          <div className="search-input-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              className="ai-search-input"
              placeholder={placeholderText}
              value={query}
              onChange={handleInputChange}
              onKeyPress={handleKeyPress}
              onFocus={openModal}
              aria-label="Search products"
              readOnly
            />
            <button 
              className="search-icon-button"
              onClick={openModal}
              aria-label="Open search"
              type="button"
            >
              <SearchIcon />
            </button>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {isModalOpen && (
        <div className="ai-search-modal-overlay" onClick={closeModal}>
          <div className="ai-search-modal" onClick={(e) => e.stopPropagation()}>
            <UnifiedSearch
              shopUrl={shopUrl}
              appProxyUrl={appProxyUrl}
              onProductClick={handleProductClick}
              formatPrice={formatPrice}
              onClose={closeModal}
              placeholderText={placeholderText}
            />
          </div>
        </div>
      )}
    </>
  );
};

// Initialize the app when DOM is ready
function initializeApp() {
  const container = document.getElementById('ai-search-root');
  if (container) {
    console.log('Initializing AI Search App...');
    try {
      // Pass config from window to container dataset for React component
      if (window.AISearchConfig) {
        Object.entries(window.AISearchConfig).forEach(([key, value]) => {
          container.dataset[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        });
      }
      
      const root = createRoot(container);
      root.render(<AISearchApp />);
      console.log('AI Search App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Search App:', error);
    }
  } else {
    console.error('AI Search container element not found');
  }
}

// Clear old browser caches before initializing app
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for potential external usage
export default AISearchApp;