import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const SearchIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const ChatIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2"
  >
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

const ArrowIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

// Enhanced styles with premium design improvements
const styles = `
  /* Premium AI Search Widget - Enhanced Design System */
  .ai-search-widget {
    /* Enhanced Color System */
    --primary: #6366f1;
    --primary-hover: #4f46e5;
    --primary-light: #a5b4fc;
    --primary-dark: #3730a3;
    
    --secondary: #10b981;
    --secondary-hover: #059669;
    
    --accent: #f59e0b;
    --accent-hover: #d97706;
    
    /* Sophisticated Background System */
    --bg: #ffffff;
    --bg-secondary: #f8fafc;
    --bg-tertiary: #f1f5f9;
    --bg-elevated: #ffffff;
    --bg-glass: rgba(255, 255, 255, 0.8);
    
    /* Advanced Text Colors */
    --text: #0f172a;
    --text-secondary: #475569;
    --text-tertiary: #94a3b8;
    --text-inverse: #ffffff;
    
    /* Enhanced Border System */
    --border: #e2e8f0;
    --border-hover: #cbd5e1;
    --border-focus: #6366f1;
    
    /* Sophisticated Shadow System */
    --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
    --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
    --shadow-2xl: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    
    /* Enhanced Spacing & Typography */
    --radius-sm: 8px;
    --radius: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    
    --font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'SF Pro Display', 'Segoe UI', system-ui, sans-serif;
    --font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    
    /* Animation System */
    --transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
    --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    
    position: relative;
    width: 100%;
    font-family: var(--font-family);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Dark Mode - Enhanced */
  @media (prefers-color-scheme: dark) {
    .ai-search-widget {
      --bg: #020617;
      --bg-secondary: #0f172a;
      --bg-tertiary: #1e293b;
      --bg-elevated: #1e293b;
      --bg-glass: rgba(15, 23, 42, 0.8);
      
      --text: #f1f5f9;
      --text-secondary: #cbd5e1;
      --text-tertiary: #64748b;
      
      --border: #334155;
      --border-hover: #475569;
    }
  }

  /* Premium Search Button */
  .ai-search-button {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 28px;
    background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-secondary) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow);
    position: relative;
    overflow: hidden;
  }

  .ai-search-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }

  .ai-search-button:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary);
    background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--primary-light) 100%);
  }

  .ai-search-button:hover::before {
    left: 100%;
  }

  .ai-search-button:active {
    transform: translateY(-1px);
    transition: all var(--transition-fast);
  }

  /* Enhanced Search Bar */
  .search-input-wrapper {
    position: relative;
    width: 100%;
  }

  .ai-search-input {
    width: 100%;
    padding: 16px 56px 16px 24px;
    background: var(--bg-elevated);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
    -webkit-appearance: none;
  }

  .ai-search-input::placeholder {
    color: var(--text-tertiary);
    font-weight: 400;
  }

  .ai-search-input:hover {
    border-color: var(--border-hover);
    box-shadow: var(--shadow);
  }

  .ai-search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: var(--shadow-md), 0 0 0 4px rgba(99, 102, 241, 0.1);
    transform: translateY(-1px);
  }

  .search-icon-button {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--primary);
    border: none;
    color: var(--text-inverse);
    cursor: pointer;
    border-radius: var(--radius);
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .search-icon-button:hover {
    background: var(--primary-hover);
    transform: translateY(-50%) scale(1.05);
    box-shadow: var(--shadow-md);
  }

  .search-icon-button:active {
    transform: translateY(-50%) scale(0.95);
  }

  /* Premium Modal Overlay */
  .ai-search-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
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
      backdrop-filter: blur(20px);
    }
  }

  /* Enhanced Modal Design */
  .ai-search-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--bg-elevated);
    display: flex;
    flex-direction: column;
    animation: slideUp var(--transition-slow) var(--spring);
  }

  @media (min-width: 768px) {
    .ai-search-modal {
      top: 8vh;
      left: 50%;
      right: auto;
      bottom: auto;
      transform: translateX(-50%);
      width: 90%;
      max-width: 800px;
      height: 84vh;
      max-height: 700px;
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-2xl);
      border: 1px solid var(--border);
      animation: slideDown var(--transition-slow) var(--spring);
    }
  }

  @keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }

  @keyframes slideDown {
    from { 
      opacity: 0;
      transform: translateX(-50%) translateY(-40px) scale(0.9);
    }
    to { 
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
    }
  }

  /* Premium Modal Header */
  .modal-header {
    padding: 20px 20px 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 16px;
    background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-secondary) 100%);
  }

  @media (min-width: 768px) {
    .modal-header {
      padding: 24px 32px 20px;
      border-radius: var(--radius-xl) var(--radius-xl) 0 0;
    }
  }

  .modal-search-input-wrapper {
    flex: 1;
    position: relative;
  }

  .modal-search-input {
    width: 100%;
    padding: 14px 52px 14px 20px;
    background: var(--bg-glass);
    backdrop-filter: blur(10px);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
    transition: all var(--transition);
    -webkit-appearance: none;
  }

  .modal-search-input::placeholder {
    color: var(--text-tertiary);
  }

  .modal-search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    background: var(--bg-elevated);
  }

  .modal-search-button {
    position: absolute;
    right: 6px;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .modal-search-button:hover {
    transform: translateY(-50%) scale(1.05);
    box-shadow: var(--shadow-md);
  }

  /* Enhanced Mode Toggle */
  .modal-mode-toggle {
    display: flex;
    background: var(--bg-glass);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 6px;
    gap: 4px;
  }

  .mode-toggle-button {
    width: 44px;
    height: 44px;
    border: none;
    background: transparent;
    color: var(--text-tertiary);
    border-radius: var(--radius);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition);
    position: relative;
  }

  .mode-toggle-button:hover {
    color: var(--text);
    background: rgba(99, 102, 241, 0.1);
  }

  .mode-toggle-button.active {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
    color: var(--text-inverse);
    box-shadow: var(--shadow);
    transform: scale(1.05);
  }

  /* Premium Close Button */
  .modal-close-button {
    width: 48px;
    height: 48px;
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
  }

  .modal-close-button:hover {
    background: var(--bg-secondary);
    color: var(--text);
    border-color: var(--border-hover);
    transform: scale(1.05);
  }

  /* Enhanced Modal Content */
  .modal-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px 20px;
    scrollbar-width: thin;
    scrollbar-color: var(--primary-light) transparent;
  }

  @media (min-width: 768px) {
    .modal-content {
      padding: 32px;
    }
  }

  .modal-content::-webkit-scrollbar {
    width: 8px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: transparent;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%);
    border-radius: 4px;
  }

  /* Premium Loading State */
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
    position: relative;
  }

  .loading-spinner::after {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    right: -4px;
    bottom: -4px;
    border: 2px solid transparent;
    border-top: 2px solid var(--primary-light);
    border-radius: 50%;
    animation: spin 1.5s linear infinite reverse;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Enhanced Search Results */
  .search-results {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;
  }

  @media (min-width: 768px) {
    .search-results {
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }
  }

  /* Premium Product Cards */
  .product-item {
    display: flex;
    gap: 20px;
    padding: 20px;
    background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-secondary) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition);
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
  }

  .product-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
    transition: left 0.6s;
  }

  .product-item:hover {
    border-color: var(--primary);
    box-shadow: var(--shadow-xl);
    transform: translateY(-4px);
    background: linear-gradient(135deg, var(--bg-elevated) 0%, rgba(99, 102, 241, 0.05) 100%);
  }

  .product-item:hover::before {
    left: 100%;
  }

  .product-image {
    width: 88px;
    height: 88px;
    border-radius: var(--radius-lg);
    object-fit: cover;
    background: var(--bg-tertiary);
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
    transition: all var(--transition);
  }

  .product-item:hover .product-image {
    transform: scale(1.05);
    box-shadow: var(--shadow-md);
  }

  .product-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  .product-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .product-vendor {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .product-price {
    font-size: 18px;
    font-weight: 800;
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-top: auto;
  }

  /* Enhanced Suggestions */
  .search-suggestions {
    margin-top: 32px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
  }

  .suggestions-label {
    font-size: 14px;
    color: var(--text-secondary);
    margin-bottom: 16px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .suggestion-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
  }

  .suggestion-pill {
    padding: 12px 20px;
    background: linear-gradient(135deg, var(--bg-glass) 0%, var(--bg-secondary) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }

  .suggestion-pill::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent);
    transition: left 0.5s;
  }

  .suggestion-pill:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    background: linear-gradient(135deg, var(--bg-elevated) 0%, rgba(99, 102, 241, 0.1) 100%);
  }

  .suggestion-pill:hover::before {
    left: 100%;
  }

  /* Enhanced Empty State */
  .no-results {
    text-align: center;
    padding: 80px 20px;
    color: var(--text-secondary);
  }

  .no-results h3 {
    font-size: 24px;
    font-weight: 800;
    color: var(--text);
    margin: 0 0 12px 0;
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .no-results p {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }

  /* Enhanced Error State */
  .search-error {
    text-align: center;
    padding: 32px 24px;
    color: #dc2626;
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border: 1px solid #fecaca;
    border-radius: var(--radius-lg);
    margin: 24px 0;
    font-weight: 600;
    box-shadow: var(--shadow-sm);
  }

  /* Mobile Optimizations */
  @media (max-width: 767px) {
    .ai-search-button,
    .search-icon-button,
    .modal-search-button,
    .mode-toggle-button,
    .modal-close-button {
      min-width: 48px;
      min-height: 48px;
    }
    
    .ai-search-input,
    .modal-search-input {
      font-size: 16px;
    }
    
    .modal-header {
      padding: 16px;
    }
    
    .modal-content {
      padding: 20px 16px;
    }
    
    .product-item {
      padding: 16px;
      gap: 16px;
    }
    
    .product-image {
      width: 72px;
      height: 72px;
    }
  }

  /* Enhanced Accessibility */
  .ai-search-widget *:focus-visible {
    outline: 3px solid var(--primary);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }

  /* Reduced Motion */
  @media (prefers-reduced-motion: reduce) {
    .ai-search-widget *,
    .ai-search-widget *::before,
    .ai-search-widget *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* High Contrast Mode */
  @media (prefers-contrast: high) {
    .ai-search-widget {
      --border: #000000;
      --text: #000000;
      --bg: #ffffff;
    }
  }

  /* Premium Conversational Search Styles */
  .conversational-search {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-elevated);
  }

  .messages-container {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 20px;
    scrollbar-width: thin;
    scrollbar-color: var(--primary-light) transparent;
  }

  .messages-container::-webkit-scrollbar {
    width: 6px;
  }

  .messages-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .messages-container::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%);
    border-radius: 3px;
  }

  /* Enhanced Message Bubbles */
  .message {
    display: flex;
    gap: 16px;
    animation: messageSlide var(--transition-slow) var(--spring);
    max-width: 85%;
  }

  .message.user {
    margin-left: auto;
    flex-direction: row-reverse;
  }

  @keyframes messageSlide {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .message-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-secondary);
    box-shadow: var(--shadow-sm);
    border: 2px solid var(--border);
  }

  .message.user .message-avatar {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
    color: var(--text-inverse);
    border-color: var(--primary);
  }

  .message-content {
    flex: 1;
    padding: 16px 20px;
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 15px;
    line-height: 1.6;
    color: var(--text);
    position: relative;
    box-shadow: var(--shadow-sm);
  }

  .message.user .message-content {
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
    color: var(--text-inverse);
    border-color: var(--primary);
    box-shadow: var(--shadow-md);
  }

  /* Chat bubble arrows */
  .message-content::before {
    content: '';
    position: absolute;
    top: 16px;
    left: -8px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-right: 8px solid var(--bg-secondary);
  }

  .message.user .message-content::before {
    left: auto;
    right: -8px;
    border-left: 8px solid var(--primary);
    border-right: none;
  }

  /* Enhanced Typing Indicator */
  .typing-indicator {
    display: flex;
    gap: 16px;
    max-width: 85%;
    animation: messageSlide var(--transition-slow) var(--spring);
  }

  .typing-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 16px;
    color: var(--text-secondary);
    box-shadow: var(--shadow-sm);
    border: 2px solid var(--border);
  }

  .typing-content {
    padding: 16px 20px;
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: var(--shadow-sm);
    position: relative;
  }

  .typing-content::before {
    content: '';
    position: absolute;
    top: 16px;
    left: -8px;
    width: 0;
    height: 0;
    border-top: 8px solid transparent;
    border-bottom: 8px solid transparent;
    border-right: 8px solid var(--bg-secondary);
  }

  .typing-dots {
    display: flex;
    gap: 4px;
  }

  .typing-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--primary);
    animation: typingPulse 1.4s infinite ease-in-out;
  }

  .typing-dot:nth-child(2) {
    animation-delay: 0.2s;
  }

  .typing-dot:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes typingPulse {
    0%, 60%, 100% {
      transform: scale(1);
      opacity: 0.5;
    }
    30% {
      transform: scale(1.2);
      opacity: 1;
    }
  }

  /* Enhanced Suggestion Pills */
  .conversation-suggestions {
    padding: 16px 24px;
    border-top: 1px solid var(--border);
    background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-secondary) 100%);
  }

  .suggestions-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-secondary);
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .conversation-suggestion-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .conversation-suggestion-pill {
    padding: 8px 16px;
    background: linear-gradient(135deg, var(--bg-glass) 0%, var(--bg-secondary) 100%);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    cursor: pointer;
    transition: all var(--transition);
    white-space: nowrap;
    position: relative;
    overflow: hidden;
  }

  .conversation-suggestion-pill::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.2), transparent);
    transition: left 0.5s;
  }

  .conversation-suggestion-pill:hover {
    border-color: var(--primary);
    color: var(--primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
    background: linear-gradient(135deg, var(--bg-elevated) 0%, rgba(99, 102, 241, 0.1) 100%);
  }

  .conversation-suggestion-pill:hover::before {
    left: 100%;
  }

  /* Premium Chat Input Container */
  .chat-input-container {
    padding: 20px 24px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 16px;
    background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-secondary) 100%);
    backdrop-filter: blur(10px);
  }

  @media (min-width: 768px) {
    .chat-input-container {
      border-radius: 0 0 var(--radius-xl) var(--radius-xl);
    }
  }

  .chat-input {
    flex: 1;
    padding: 14px 20px;
    background: var(--bg-glass);
    backdrop-filter: blur(10px);
    border: 2px solid var(--border);
    border-radius: var(--radius-lg);
    font-size: 15px;
    font-weight: 500;
    color: var(--text);
    resize: none;
    min-height: 52px;
    max-height: 120px;
    font-family: inherit;
    transition: all var(--transition);
    -webkit-appearance: none;
  }

  .chat-input::placeholder {
    color: var(--text-tertiary);
  }

  .chat-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
    background: var(--bg-elevated);
  }

  .chat-send-button {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
    color: var(--text-inverse);
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition);
    flex-shrink: 0;
    box-shadow: var(--shadow-md);
    position: relative;
    overflow: hidden;
  }

  .chat-send-button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    transition: left 0.5s;
  }

  .chat-send-button:hover:not(:disabled) {
    background: linear-gradient(135deg, var(--primary-hover) 0%, var(--primary-dark) 100%);
    transform: scale(1.05);
    box-shadow: var(--shadow-lg);
  }

  .chat-send-button:hover:not(:disabled)::before {
    left: 100%;
  }

  .chat-send-button:active {
    transform: scale(0.95);
  }

  .chat-send-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  /* Enhanced Product Grid in Chat */
  .chat-products-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    margin-top: 16px;
  }

  @media (min-width: 600px) {
    .chat-products-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .chat-product-item {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: linear-gradient(135deg, var(--bg-elevated) 0%, var(--bg-secondary) 100%);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    transition: all var(--transition);
    text-decoration: none;
    color: inherit;
    position: relative;
    overflow: hidden;
    box-shadow: var(--shadow-sm);
  }

  .chat-product-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.1), transparent);
    transition: left 0.6s;
  }

  .chat-product-item:hover {
    border-color: var(--primary);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
    background: linear-gradient(135deg, var(--bg-elevated) 0%, rgba(99, 102, 241, 0.05) 100%);
  }

  .chat-product-item:hover::before {
    left: 100%;
  }

  .chat-product-image {
    width: 60px;
    height: 60px;
    border-radius: var(--radius);
    object-fit: cover;
    background: var(--bg-tertiary);
    flex-shrink: 0;
    box-shadow: var(--shadow-sm);
  }

  .chat-product-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .chat-product-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.3;
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .chat-product-price {
    font-size: 16px;
    font-weight: 700;
    background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    margin-top: auto;
  }
`;

// We'll define the UnifiedSearch component inline since JSX can't import TS files
// The unified search functionality will be built into this component

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
      const searchUrl = `${appProxyUrl}/search?q=${encodeURIComponent(searchQuery)}&shop=${shopDomain}`;
      
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

      if (data.success && data.data && data.data.products) {
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
      const conversationUrl = `${appProxyUrl}/conversation`;

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
              <ChatIcon />
              Refine Search
            </button>
          </div>
          
          <div className="products-grid">
            {products.map((product) => (
              <div 
                key={product.id || product.shopify_product_id} 
                className="product-card"
                onClick={() => onProductClick(product)}
              >
                {product.image_url && (
                  <div className="product-image-container">
                    <img 
                      src={product.image_url} 
                      alt={product.title}
                      className="product-image"
                    />
                  </div>
                )}
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
            <h4>Refine Your Search</h4>
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

const AISearchApp = () => {
  const [query, setQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const searchInputRef = useRef(null);
  const debounceTimerRef = useRef(null);

  // Get data attributes from root element
  const rootElement = document.getElementById('ai-search-root');
  const shopUrl = rootElement?.dataset?.shopUrl || window.Shopify?.shop || '';
  const appProxyUrl = rootElement?.dataset?.appProxyUrl || '/apps/xpertsearch';
  const displayMode = rootElement?.dataset?.displayMode || window.AISearchConfig?.displayMode || 'bar';
  const placeholderText = rootElement?.dataset?.placeholder || window.AISearchConfig?.placeholderText || 'Search for products...';

  // Close modal on escape key
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
    const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '$';
    
    return `${currencySymbol}${price.toFixed(2)}`;
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
    console.error('AI Search root element not found');
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// Export for testing
export default AISearchApp;