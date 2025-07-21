import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

// Modern UI Icons as components
const SearchIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8"></circle>
    <path d="m21 21-4.35-4.35"></path>
  </svg>
);

const SparkleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
  </svg>
);

const MicrophoneIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="23"/>
    <line x1="8" y1="23" x2="16" y2="23"/>
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);

// Enhanced CSS with cutting-edge design
const styles = `
  /* Modern CSS Custom Properties */
  :root {
    --search-primary: #6366f1;
    --search-primary-hover: #5558e3;
    --search-primary-light: rgba(99, 102, 241, 0.1);
    --search-primary-glow: rgba(99, 102, 241, 0.3);
    --search-secondary: #8b5cf6;
    --search-accent: #ec4899;
    --search-success: #10b981;
    --search-warning: #f59e0b;
    --search-error: #ef4444;
    
    /* Gradients */
    --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    --gradient-accent: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    --gradient-glass: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.05) 100%);
    
    /* Colors */
    --text: #1f2937;
    --text-secondary: #6b7280;
    --text-tertiary: #9ca3af;
    --text-inverse: #ffffff;
    --bg: #ffffff;
    --bg-secondary: #f9fafb;
    --bg-elevated: #ffffff;
    --bg-glass: rgba(255, 255, 255, 0.9);
    --bg-dark: rgba(0, 0, 0, 0.9);
    --border: #e5e7eb;
    --border-hover: #d1d5db;
    
    /* Shadows */
    --shadow-xs: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
    --shadow-sm: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
    --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    --shadow-md: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    --shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --shadow-xl: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    --shadow-2xl: 0 35px 60px -15px rgba(0, 0, 0, 0.3);
    --shadow-glow: 0 0 20px var(--search-primary-glow);
    
    /* Border Radius */
    --radius-sm: 6px;
    --radius: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --radius-2xl: 24px;
    --radius-full: 9999px;
    
    /* Transitions */
    --transition: 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    --transition-slow: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    --spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
    
    /* Spacing */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.25rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-10: 2.5rem;
    --space-12: 3rem;
    --space-16: 4rem;
    --space-20: 5rem;
    --space-24: 6rem;
  }

  /* Dark Mode Support */
  @media (prefers-color-scheme: dark) {
    :root {
      --text: #f9fafb;
      --text-secondary: #d1d5db;
      --text-tertiary: #9ca3af;
      --text-inverse: #1f2937;
      --bg: #111827;
      --bg-secondary: #1f2937;
      --bg-elevated: #374151;
      --bg-glass: rgba(17, 24, 39, 0.9);
      --border: #374151;
      --border-hover: #4b5563;
    }
  }

  /* Base Styles */
  .ai-search-container {
    position: relative;
    z-index: 100;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }

  .ai-search-container.button-mode {
    display: inline-block;
  }

  .ai-search-container.bar-mode {
    width: 100%;
    max-width: 560px;
  }

  /* Modern Search Button */
  .ai-search-button {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    background: var(--gradient-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-full);
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-md), var(--shadow-glow);
    overflow: hidden;
    backdrop-filter: blur(12px);
  }

  .ai-search-button::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--gradient-glass);
    opacity: 0;
    transition: opacity var(--transition);
    border-radius: inherit;
  }

  .ai-search-button:hover::before {
    opacity: 1;
  }

  .ai-search-button:hover {
    transform: translateY(-2px) scale(1.02);
    box-shadow: var(--shadow-xl), 0 0 40px var(--search-primary-glow);
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

  /* Glass-morphism Search Bar */
  .search-input-wrapper {
    position: relative;
    width: 100%;
  }

  .ai-search-input {
    width: 100%;
    padding: var(--space-5) var(--space-16) var(--space-5) var(--space-6);
    background: var(--bg-glass);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 2px solid transparent;
    border-radius: var(--radius-full);
    font-size: 16px;
    font-weight: 500;
    color: var(--text);
    transition: all var(--transition);
    box-shadow: var(--shadow-lg);
    background-image: 
      linear-gradient(var(--bg-glass), var(--bg-glass)),
      var(--gradient-primary);
    background-origin: border-box;
    background-clip: padding-box, border-box;
  }

  .ai-search-input::placeholder {
    color: var(--text-tertiary);
    font-weight: 400;
  }

  .ai-search-input:hover {
    box-shadow: var(--shadow-xl);
    transform: translateY(-1px);
    border-color: var(--search-primary-light);
  }

  .ai-search-input:focus {
    outline: none;
    box-shadow: var(--shadow-xl), 0 0 0 4px var(--search-primary-light);
    transform: translateY(-2px);
    border-color: var(--search-primary);
  }

  .search-icon-button {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gradient-primary);
    border: none;
    color: var(--text-inverse);
    cursor: pointer;
    border-radius: var(--radius-full);
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .search-icon-button:hover {
    transform: translateY(-50%) scale(1.1);
    box-shadow: var(--shadow-md);
  }

  /* Enhanced Modal with Modern Design */
  .ai-search-modal-overlay {
    position: fixed;
    inset: 0;
    background: var(--bg-dark);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    z-index: 99999;
    animation: fadeIn var(--transition-slow) ease-out;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
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

  /* Ultra-Modern Modal Design */
  .ai-search-modal {
    width: min(95vw, 1000px);
    height: min(90vh, 800px);
    background: var(--bg-glass);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border-radius: var(--radius-2xl);
    box-shadow: var(--shadow-2xl);
    overflow: hidden;
    animation: modalEntry var(--transition-slow) var(--spring);
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    flex-direction: column;
  }

  @keyframes modalEntry {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(20px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  /* Unified Search Interface */
  .unified-search {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: transparent;
  }

  /* Modern Search Header */
  .search-header {
    padding: var(--space-6);
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-elevated) 100%);
    backdrop-filter: blur(12px);
  }

  .search-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .search-header h3 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: var(--text);
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .search-close-button {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-glass);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-full);
    transition: all var(--transition);
    font-size: 24px;
  }

  .search-close-button:hover {
    background: var(--bg-secondary);
    color: var(--text);
    border-color: var(--search-primary);
    transform: rotate(90deg) scale(1.1);
  }

  /* Search Input Section with Voice */
  .search-input-section {
    padding: var(--space-6);
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
  }

  .search-form {
    width: 100%;
  }

  .search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .search-input {
    flex: 1;
    padding: var(--space-5) var(--space-16) var(--space-5) var(--space-6);
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
    border-color: var(--search-primary);
    box-shadow: var(--shadow-md), 0 0 0 4px var(--search-primary-light);
  }

  .search-button {
    position: absolute;
    right: var(--space-2);
    top: 50%;
    transform: translateY(-50%);
    width: 52px;
    height: 52px;
    background: var(--gradient-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-full);
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

  .voice-button {
    width: 52px;
    height: 52px;
    background: var(--gradient-secondary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-full);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
  }

  .voice-button:hover {
    transform: scale(1.1);
    box-shadow: var(--shadow-md);
  }

  .voice-button.recording {
    animation: pulse 1.5s infinite;
    background: var(--gradient-accent);
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }

  /* Content Area with Better Layout */
  .search-results-section {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
    background: linear-gradient(to bottom, var(--bg-secondary), var(--bg));
  }

  /* Results Header with Enhanced Design */
  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-6);
    padding: var(--space-4);
    background: var(--bg-glass);
    backdrop-filter: blur(8px);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border);
  }

  .results-header h4 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* Ultra-Sexy Refine Search Button */
  .refine-search-button {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-5);
    background: var(--gradient-secondary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-full);
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
    inset: -2px;
    background: var(--gradient-accent);
    border-radius: var(--radius-full);
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
    animation: sparkle 2s infinite;
  }

  @keyframes sparkle {
    0%, 100% { transform: scale(1) rotate(0deg); }
    25% { transform: scale(1.1) rotate(90deg); }
    50% { transform: scale(1) rotate(180deg); }
    75% { transform: scale(1.1) rotate(270deg); }
  }

  /* Enhanced Products Grid */
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-6);
    margin-top: var(--space-4);
  }

  /* Premium Product Card Design */
  .product-card {
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
    position: relative;
    backdrop-filter: blur(8px);
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
    transform: translateY(-8px);
    box-shadow: var(--shadow-xl);
    border-color: var(--search-primary-light);
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
    width: 64px;
    height: 64px;
    margin-bottom: var(--space-2);
    opacity: 0.5;
  }

  .product-image-placeholder span {
    font-size: 14px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .product-card:hover .product-image {
    transform: scale(1.1);
  }

  .product-info {
    padding: var(--space-5);
  }

  .product-title {
    margin: 0 0 var(--space-2) 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .product-vendor {
    margin: 0 0 var(--space-2) 0;
    font-size: 14px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 500;
  }

  .product-price {
    font-size: 20px;
    font-weight: 700;
    color: var(--search-primary);
    margin: var(--space-2) 0;
  }

  .product-unavailable {
    display: inline-block;
    margin-top: var(--space-2);
    padding: var(--space-1) var(--space-2);
    background: var(--search-error);
    color: var(--text-inverse);
    font-size: 12px;
    font-weight: 600;
    border-radius: var(--radius-sm);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  /* Enhanced Loading States */
  .search-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-20) var(--space-6);
    color: var(--text-secondary);
  }

  .loading-spinner {
    width: 64px;
    height: 64px;
    border: 4px solid var(--border);
    border-top: 4px solid var(--search-primary);
    border-radius: 50%;
    animation: spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite;
    margin-bottom: var(--space-5);
  }

  .loading-spinner-small {
    width: 24px;
    height: 24px;
    border: 2px solid var(--text-inverse);
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* Premium Chat Section */
  .chat-section {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 450px;
    background: var(--bg-glass);
    backdrop-filter: blur(20px);
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
    padding: var(--space-5) var(--space-6);
    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-elevated) 100%);
    border-bottom: 1px solid var(--border);
  }

  .chat-header h4 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--text);
    background: var(--gradient-secondary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .chat-close-button {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: 1px solid var(--border);
    color: var(--text-secondary);
    cursor: pointer;
    border-radius: var(--radius-full);
    transition: all var(--transition);
    font-size: 20px;
  }

  .chat-close-button:hover {
    background: var(--bg-secondary);
    color: var(--text);
    border-color: var(--search-primary);
    transform: rotate(90deg);
  }

  /* Enhanced Chat Messages */
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-5);
    background: linear-gradient(to bottom, var(--bg-secondary), var(--bg));
  }

  .chat-message {
    margin-bottom: var(--space-4);
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
    padding: var(--space-4) var(--space-5);
    border-radius: var(--radius-xl);
    font-size: 15px;
    line-height: 1.5;
    backdrop-filter: blur(8px);
  }

  .user-message .message-content {
    background: var(--gradient-primary);
    color: var(--text-inverse);
    border-bottom-right-radius: var(--radius-sm);
    box-shadow: var(--shadow-md);
  }

  .assistant-message .message-content {
    background: var(--bg-glass);
    color: var(--text);
    border: 1px solid var(--border);
    border-bottom-left-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
  }

  /* Enhanced Typing Indicator */
  .typing-indicator {
    display: flex;
    gap: var(--space-1);
    padding: var(--space-1);
  }

  .typing-indicator span {
    width: 10px;
    height: 10px;
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

  /* Premium Chat Input */
  .chat-input-form {
    padding: var(--space-4) var(--space-5);
    background: var(--bg-elevated);
    border-top: 1px solid var(--border);
  }

  .chat-input-wrapper {
    position: relative;
    display: flex;
    gap: var(--space-3);
  }

  .chat-input {
    flex: 1;
    padding: var(--space-4) var(--space-5);
    background: var(--bg-glass);
    backdrop-filter: blur(8px);
    border: 2px solid var(--border);
    border-radius: var(--radius-xl);
    font-size: 15px;
    color: var(--text);
    transition: all var(--transition);
  }

  .chat-input:focus {
    outline: none;
    border-color: var(--search-primary);
    box-shadow: 0 0 0 3px var(--search-primary-light);
  }

  .chat-send-button {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--gradient-secondary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-full);
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

  /* Enhanced No Results */
  .no-results {
    text-align: center;
    padding: var(--space-16) var(--space-6);
    color: var(--text-secondary);
  }

  .no-results h4 {
    margin: 0 0 var(--space-2) 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--text);
  }

  /* Error State */
  .search-error {
    text-align: center;
    padding: var(--space-10) var(--space-6);
    color: var(--search-error);
    background: rgba(239, 68, 68, 0.1);
    border-radius: var(--radius-lg);
    margin: var(--space-4);
  }

  /* Premium Responsive Design */
  @media (max-width: 768px) {
    .ai-search-modal {
      width: 100vw;
      height: 100vh;
      border-radius: 0;
    }

    .products-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-4);
    }

    .message-content {
      max-width: 85%;
    }

    .chat-section {
      height: 50vh;
    }

    .search-header h3 {
      font-size: 24px;
    }
    
    .product-title {
      font-size: 16px;
    }
    
    .product-price {
      font-size: 18px;
    }
  }

  @media (max-width: 480px) {
    .products-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-3);
    }
    
    .product-info {
      padding: var(--space-4);
    }
    
    .search-input-section {
      padding: var(--space-4);
    }
    
    .chat-messages {
      padding: var(--space-3);
    }
  }

  /* Premium Animations */
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .product-card {
    animation: fadeInUp 0.6s ease-out;
  }

  .product-card:nth-child(1) { animation-delay: 0.1s; }
  .product-card:nth-child(2) { animation-delay: 0.2s; }
  .product-card:nth-child(3) { animation-delay: 0.3s; }
  .product-card:nth-child(4) { animation-delay: 0.4s; }

  /* Accessibility Improvements */
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    :root {
      --border: #000;
      --text-secondary: #000;
      --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
      --shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      --shadow-md: 0 8px 16px rgba(0, 0, 0, 0.3);
    }
  }

  /* Print styles */
  @media print {
    .ai-search-modal-overlay {
      display: none !important;
    }
  }
`;

// Inject enhanced styles
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

// Enhanced Unified Search Component
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
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);

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

  // Voice Search Implementation
  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice search is not supported in your browser. Please try using Chrome.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    setIsVoiceRecording(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsVoiceRecording(false);
      // Auto-search after voice input
      setTimeout(() => {
        performSearch(transcript);
      }, 500);
    };

    recognition.onerror = (event) => {
      console.error('Voice recognition error:', event.error);
      setIsVoiceRecording(false);
    };

    recognition.onend = () => {
      setIsVoiceRecording(false);
    };

    recognition.start();
  };

  const performSearch = async (searchQuery) => {
    if (!searchQuery.trim() || isLoading) return;

    // Debounce to prevent multiple rapid searches
    if (window.searchTimeout) {
      clearTimeout(window.searchTimeout);
    }
    
    window.searchTimeout = setTimeout(async () => {
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
    }, 200); // 200ms debounce
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
      {/* Enhanced Header */}
      <div className="search-header">
        <div className="search-header-content">
          <h3>
            <SparkleIcon />
            AI-Powered Search
          </h3>
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

      {/* Enhanced Search Input with Voice */}
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
            <button
              type="button"
              className={`voice-button ${isVoiceRecording ? 'recording' : ''}`}
              onClick={handleVoiceSearch}
              disabled={isLoading}
              aria-label="Voice search"
            >
              <MicrophoneIcon />
            </button>
          </div>
        </form>
      </div>

      {/* Enhanced Loading State */}
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

      {/* Enhanced Search Results */}
      {hasSearched && !isLoading && products.length > 0 && (
        <div ref={resultsRef} className="search-results-section">
          <div className="results-header">
            <h4>
              <StarIcon />
              {products.length} Products Found
            </h4>
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
                        e.target.style.display = 'none';
                        if (e.target.nextElementSibling) {
                          e.target.nextElementSibling.style.display = 'flex';
                        }
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
          <p>Try adjusting your search terms or use voice search to describe what you're looking for.</p>
        </div>
      )}

      {/* Enhanced Chat Refinement Section */}
      {showChat && (
        <div className="chat-section">
          <div className="chat-header">
            <h4>
              <SparkleIcon />
              Refine Your Search with AI
            </h4>
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

// Enhanced Main App Component
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
      {/* Enhanced Widget - Button or Bar */}
      <div className={`ai-search-container ${displayMode === 'button' ? 'button-mode' : 'bar-mode'}`}>
        {displayMode === 'button' ? (
          <button 
            className="ai-search-button" 
            onClick={openModal}
            aria-label="Open AI search"
            type="button"
          >
            <SearchIcon />
            <span className="button-text">AI Search</span>
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
              aria-label="Search products with AI"
              readOnly
            />
            <button 
              className="search-icon-button"
              onClick={openModal}
              aria-label="Open AI search"
              type="button"
            >
              <SearchIcon />
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Search Modal */}
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

// Initialize the enhanced app when DOM is ready
function initializeApp() {
  const container = document.getElementById('ai-search-root');
  if (container) {
    if (window.aiSearchAppInitialized) {
      console.log('AI Search App already initialized, skipping...');
      return;
    }
    window.aiSearchAppInitialized = true;
    console.log('Initializing Enhanced AI Search App...');
    try {
      // Pass config from window to container dataset for React component
      if (window.AISearchConfig) {
        Object.entries(window.AISearchConfig).forEach(([key, value]) => {
          container.dataset[key] = typeof value === 'object' ? JSON.stringify(value) : value;
        });
      }
      
      const root = createRoot(container);
      root.render(<AISearchApp />);
      console.log('Enhanced AI Search App initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Enhanced AI Search App:', error);
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