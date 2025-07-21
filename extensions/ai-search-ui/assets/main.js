
            // AI Search UI Extension - Auto-generated bundle v1753122242536
            // React and ReactDOM are expected to be loaded externally
            if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
              console.error('AI Search: React and ReactDOM must be loaded before this script');
            }
            
            // Clear old caches on script load
            if (typeof window !== 'undefined' && 'caches' in window) {
              window.caches.keys().then(function(cacheNames) {
                cacheNames.forEach(function(cacheName) {
                  if (cacheName.includes('ai-search-v1')) {
                    console.log('Clearing old AI search cache:', cacheName);
                    window.caches.delete(cacheName);
                  }
                });
              });
            }
          
"use strict";
var AISearchApp = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined")
      return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.temp.jsx
  var index_temp_exports = {};
  __export(index_temp_exports, {
    default: () => index_temp_default
  });
  var import_react = __toESM(__require("react"));
  var import_client = __require("react-dom/client");
  var import_jsx_runtime = __require("react/jsx-runtime");
  var SearchIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: "11", cy: "11", r: "8" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "m21 21-4.35-4.35" })
  ] });
  var SparkleIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" }) });
  var MicrophoneIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 1a4 4 0 0 0-4 4v7a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4z" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M19 10v2a7 7 0 0 1-14 0v-2" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: "12", y1: "19", x2: "12", y2: "23" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: "8", y1: "23", x2: "16", y2: "23" })
  ] });
  var StarIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "currentColor", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" }) });
  var styles = `
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

  .add-to-cart-button {
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-4);
    background: var(--gradient-primary);
    color: var(--text-inverse);
    border: none;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition);
    box-shadow: var(--shadow-sm);
    width: 100%;
  }

  .add-to-cart-button:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .add-to-cart-button:active {
    transform: translateY(0);
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
  var styleSheet = document.createElement("style");
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  var UnifiedSearch = ({ shopUrl, appProxyUrl, onProductClick, formatPrice, onClose, placeholderText }) => {
    const [query, setQuery] = (0, import_react.useState)("");
    const [products2, setProducts] = (0, import_react.useState)([]);
    const [isLoading, setIsLoading] = (0, import_react.useState)(false);
    const [error, setError] = (0, import_react.useState)(null);
    const [hasSearched, setHasSearched] = (0, import_react.useState)(false);
    const [showChat, setShowChat] = (0, import_react.useState)(false);
    const [messages, setMessages] = (0, import_react.useState)([]);
    const [chatInput, setChatInput] = (0, import_react.useState)("");
    const [isChatLoading, setIsChatLoading] = (0, import_react.useState)(false);
    const [context2, setContext] = (0, import_react.useState)(null);
    const [isVoiceRecording, setIsVoiceRecording] = (0, import_react.useState)(false);
    const inputRef = (0, import_react.useRef)(null);
    const chatInputRef = (0, import_react.useRef)(null);
    const resultsRef = (0, import_react.useRef)(null);
    (0, import_react.useEffect)(() => {
      inputRef.current?.focus();
    }, []);
    (0, import_react.useEffect)(() => {
      if (hasSearched && products2.length > 0 && resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, [hasSearched, products2]);
    const handleVoiceSearch = () => {
      if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
        alert("Voice search is not supported in your browser. Please try using Chrome.");
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      setIsVoiceRecording(true);
      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsVoiceRecording(false);
        setTimeout(() => {
          performSearch(transcript);
        }, 500);
      };
      recognition.onerror = (event) => {
        console.error("Voice recognition error:", event.error);
        setIsVoiceRecording(false);
      };
      recognition.onend = () => {
        setIsVoiceRecording(false);
      };
      recognition.start();
    };
    const performSearch = async (searchQuery) => {
      if (!searchQuery.trim() || isLoading)
        return;
      if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
      }
      window.searchTimeout = setTimeout(async () => {
        setIsLoading(true);
        setError(null);
        setHasSearched(true);
      try {
        const shopDomain = shopUrl.replace("https://", "").replace("http://", "").replace("/", "");
        const searchUrl = `${appProxyUrl}/api/search?q=${encodeURIComponent(searchQuery)}&shop=${shopDomain}`;
        const response = await fetch(searchUrl, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          }
        });
        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success && data.data && data.data.products) {
          setProducts(data.data.products);
          setContext({
            queries: [searchQuery],
            filters: data.data.query_info?.parsed_query?.filters || {},
            viewedProducts: [],
            preferences: {},
            sessionId: data.data.search_id || Date.now().toString()
          });
        } else {
          setProducts([]);
          setError(data.error || "No products found");
        }
      } catch (error2) {
        console.error("Search failed:", error2);
        setError("Search is currently unavailable. Please try again later.");
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
            role: "assistant",
            content: `I found ${products2.length} products for "${query}". How would you like to refine your search? You can ask me to filter by price, color, brand, or any other preferences.`,
            timestamp: Date.now()
          }
        ]);
      }
      setTimeout(() => chatInputRef.current?.focus(), 100);
    };
    const sendChatMessage = async (content) => {
      if (!content.trim() || isChatLoading)
        return;
      const userMessage = {
        role: "user",
        content: content.trim(),
        timestamp: Date.now()
      };
      setMessages((prev) => [...prev, userMessage]);
      setChatInput("");
      setIsChatLoading(true);
      try {
        const shopDomain = shopUrl.replace("https://", "").replace("http://", "").replace("/", "");
        const conversationUrl = `${appProxyUrl}/api/conversation`;
        const response = await fetch(conversationUrl, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messages: [...messages, userMessage],
            shop_domain: shopDomain,
            context: context2
          })
        });
        if (!response.ok) {
          throw new Error(`Conversation failed: ${response.statusText}`);
        }
        const data = await response.json();
        if (data.success && data.data) {
          const assistantMessage = {
            role: "assistant",
            content: data.data.message,
            timestamp: Date.now()
          };
          setMessages((prev) => [...prev, assistantMessage]);
          if (data.data.products && data.data.products.length > 0) {
            setProducts(data.data.products);
          }
          if (data.data.context) {
            setContext(data.data.context);
          }
        } else {
          throw new Error(data.error || "Failed to get response");
        }
      } catch (error2) {
        console.error("Chat failed:", error2);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: "I'm sorry, I encountered an issue processing your request. Please try again.",
          timestamp: Date.now()
        }]);
      } finally {
        setIsChatLoading(false);
      }
    };
    const handleChatSubmit = (e) => {
      e.preventDefault();
      sendChatMessage(chatInput);
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "unified-search", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "search-header", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "search-header-content", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SparkleIcon, {}),
          "AI-Powered Search"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            className: "search-close-button",
            onClick: onClose,
            "aria-label": "Close search",
            type: "button",
            children: "\xD7"
          }
        )
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "search-input-section", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", { onSubmit: handleSearch, className: "search-form", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "search-input-wrapper", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            ref: inputRef,
            type: "text",
            className: "search-input",
            placeholder: placeholderText,
            value: query,
            onChange: (e) => setQuery(e.target.value),
            disabled: isLoading,
            autoComplete: "off"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "submit",
            className: "search-button",
            disabled: !query.trim() || isLoading,
            "aria-label": "Search",
            children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "loading-spinner-small" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchIcon, {})
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            type: "button",
            className: `voice-button ${isVoiceRecording ? "recording" : ""}`,
            onClick: handleVoiceSearch,
            disabled: isLoading,
            "aria-label": "Voice search",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicrophoneIcon, {})
          }
        )
      ] }) }) }),
      isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "search-loading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "loading-spinner" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Searching for products..." })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "search-error", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: error }) }),
      hasSearched && !isLoading && products2.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref: resultsRef, className: "search-results-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "results-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StarIcon, {}),
            products2.length,
            " Products Found"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "button",
            {
              className: "refine-search-button",
              onClick: handleRefineSearch,
              type: "button",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SparkleIcon, {}),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Refine with AI" })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "products-grid", children: products2.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "product-card",
            onClick: () => onProductClick(product),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "product-image-container", children: [
                product.image_url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "img",
                  {
                    src: product.image_url,
                    alt: product.title,
                    className: "product-image",
                    onError: (e) => {
                      e.target.style.display = "none";
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = "flex";
                      }
                    }
                  }
                ) : null,
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "div",
                  {
                    className: "product-image-placeholder",
                    style: { display: product.image_url ? "none" : "flex" },
                    children: [
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { viewBox: "0 0 24 24", className: "placeholder-icon", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { fill: "currentColor", d: "M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19M19,19H5V5H19V19M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z" }) }),
                      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "No Image" })
                    ]
                  }
                )
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "product-info", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h5", { className: "product-title", children: product.title }),
                product.vendor && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "product-vendor", children: product.vendor }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "product-price", children: [
                  product.price_min && formatPrice(product.price_min),
                  product.price_max && product.price_max !== product.price_min && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
                    " - ",
                    formatPrice(product.price_max)
                  ] })
                ] }),
                !product.available && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "product-unavailable", children: "Out of stock" }),
                product.available && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    className: "add-to-cart-button",
                    onClick: (e) => {
                      e.stopPropagation();
                      trackAddToCart(product);
                    },
                    type: "button",
                    children: "Add to Cart"
                  }
                )
              ] })
            ]
          },
          product.id || product.shopify_product_id
        )) })
      ] }),
      hasSearched && !isLoading && products2.length === 0 && !error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "no-results", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "No products found" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Try adjusting your search terms or use voice search to describe what you're looking for." })
      ] }),
      showChat && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "chat-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "chat-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SparkleIcon, {}),
            "Refine Your Search with AI"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              className: "chat-close-button",
              onClick: () => setShowChat(false),
              type: "button",
              children: "\xD7"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "chat-messages", children: [
          messages.map((message, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              className: `chat-message ${message.role === "user" ? "user-message" : "assistant-message"}`,
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "message-content", children: message.content })
            },
            index
          )),
          isChatLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "chat-message assistant-message", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "message-content", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "typing-indicator", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {})
          ] }) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", { className: "chat-input-form", onSubmit: handleChatSubmit, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "chat-input-wrapper", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "input",
            {
              ref: chatInputRef,
              type: "text",
              className: "chat-input",
              placeholder: "Ask me to refine your search...",
              value: chatInput,
              onChange: (e) => setChatInput(e.target.value),
              disabled: isChatLoading
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "submit",
              className: "chat-send-button",
              disabled: !chatInput.trim() || isChatLoading,
              "aria-label": "Send message",
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: "22", y1: "2", x2: "11", y2: "13" }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("polygon", { points: "22,2 15,22 11,13 2,9" })
              ] })
            }
          )
        ] }) })
      ] })
    ] });
  };
  var AISearchApp = () => {
    const [query, setQuery] = (0, import_react.useState)("");
    const [isModalOpen, setIsModalOpen] = (0, import_react.useState)(false);
    const searchInputRef = (0, import_react.useRef)(null);
    const rootElement = document.getElementById("ai-search-root");
    const shopUrl = rootElement?.dataset?.shopUrl || window.Shopify?.shop || "";
    const appProxyUrl = rootElement?.dataset?.appProxyUrl || "/apps/xpertsearch";
    const displayMode = rootElement?.dataset?.displayMode || window.AISearchConfig?.displayMode || "bar";
    const placeholderText = rootElement?.dataset?.placeholder || window.AISearchConfig?.placeholderText || "Search for products...";
    (0, import_react.useEffect)(() => {
      const handleKeyDown = (event) => {
        if (event.key === "Escape" && isModalOpen) {
          closeModal();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }, [isModalOpen]);
    (0, import_react.useEffect)(() => {
      if (isModalOpen) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
      return () => {
        document.body.style.overflow = "";
      };
    }, [isModalOpen]);
    const openModal = () => {
      setIsModalOpen(true);
    };
    const closeModal = () => {
      setIsModalOpen(false);
      setQuery("");
    };
    const handleProductClick = async (product) => {
      if (product.handle) {
        try {
          const shopDomain = shopUrl.replace("https://", "").replace("http://", "").replace("/", "");
          try {
            await fetch(`${appProxyUrl}/api/analytics`, {
              method: "POST",
              headers: {
                "Accept": "application/json",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                event_type: "click",
                product_id: product.id || product.shopify_product_id,
                position: products.findIndex((p) => (p.id || p.shopify_product_id) === (product.id || product.shopify_product_id)) + 1,
                search_query: query,
                search_id: context?.sessionId,
                session_id: context?.sessionId,
                shop: shopDomain,
                page_url: window.location.href,
                referrer: document.referrer,
                click_source: "search_results"
              })
            });
          } catch (analyticsError) {
            console.warn("Failed to track click event:", analyticsError);
          }
          const productUrl = `${shopUrl}/products/${product.handle}`;
          window.open(productUrl, "_blank");
        } catch (error) {
          console.error("Error handling product click:", error);
          const productUrl = `${shopUrl}/products/${product.handle}`;
          window.open(productUrl, "_blank");
        }
      }
    };
    const trackAddToCart2 = async (product, quantity = 1) => {
      try {
        const shopDomain = shopUrl.replace("https://", "").replace("http://", "").replace("/", "");
        await fetch(`${appProxyUrl}/api/analytics`, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            event_type: 'add_to_cart',
            shop_domain: shopDomain,
            product_id: parseInt(product.id || product.shopify_product_id),
            // Ensure it's a number
            variant_id: product.variant_id ? parseInt(product.variant_id) : product.variants?.[0]?.id ? parseInt(product.variants[0].id) : null,
            quantity,
            session_id: context?.sessionId,
            search_query_id: context?.sessionId,
            click_event_id: null,
            // We could store this from the click event if needed
            product_title: product.title || 'Unknown Product'
          })
        });
        console.log("Add to cart event tracked successfully");
      } catch (error) {
        console.warn("Failed to track add to cart event:", error);
      }
    };
    const formatPrice = (price) => {
      if (!price)
        return "";
      const currency = window.Shopify?.currency?.active || "USD";
      try {
        const formatter = new Intl.NumberFormat("en-US", {
          style: "currency",
          currency
        });
        return formatter.format(price);
      } catch (error) {
        const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : currency === "GBP" ? "\xA3" : "$";
        return `${currencySymbol}${price.toFixed(2)}`;
      }
    };
    const handleInputChange = (e) => {
      const value = e.target.value;
      setQuery(value);
    };
    const handleKeyPress = (event) => {
      if (event.key === "Enter") {
        openModal();
      }
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: `ai-search-container ${displayMode === "button" ? "button-mode" : "bar-mode"}`, children: displayMode === "button" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
        "button",
        {
          className: "ai-search-button",
          onClick: openModal,
          "aria-label": "Open AI search",
          type: "button",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchIcon, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "button-text", children: "AI Search" })
          ]
        }
      ) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "search-input-wrapper", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "input",
          {
            ref: searchInputRef,
            type: "text",
            className: "ai-search-input",
            placeholder: placeholderText,
            value: query,
            onChange: handleInputChange,
            onKeyPress: handleKeyPress,
            onFocus: openModal,
            "aria-label": "Search products with AI",
            readOnly: true
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            className: "search-icon-button",
            onClick: openModal,
            "aria-label": "Open AI search",
            type: "button",
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchIcon, {})
          }
        )
      ] }) }),
      isModalOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ai-search-modal-overlay", onClick: closeModal, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "ai-search-modal", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        UnifiedSearch,
        {
          shopUrl,
          appProxyUrl,
          onProductClick: handleProductClick,
          formatPrice,
          onClose: closeModal,
          placeholderText
        }
      ) }) })
    ] });
  };
  function initializeApp() {
    const container = document.getElementById("ai-search-root");
    if (container) {
      if (window.aiSearchAppInitialized) {
        console.log("AI Search App already initialized, skipping...");
        return;
      }
      window.aiSearchAppInitialized = true;
      console.log("Initializing Enhanced AI Search App...");
      try {
        if (window.AISearchConfig) {
          Object.entries(window.AISearchConfig).forEach(([key, value]) => {
            container.dataset[key] = typeof value === "object" ? JSON.stringify(value) : value;
          });
        }
        const root = (0, import_client.createRoot)(container);
        root.render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AISearchApp, {}));
        console.log("Enhanced AI Search App initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Enhanced AI Search App:", error);
      }
    } else {
      console.error("AI Search container element not found");
    }
  }
  if ("caches" in window) {
    caches.keys().then(function(cacheNames) {
      cacheNames.forEach(function(cacheName) {
        if (cacheName.includes("ai-search-v1") || cacheName.includes("search-page")) {
          console.log("Clearing old search cache:", cacheName);
          caches.delete(cacheName);
        }
      });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
  } else {
    initializeApp();
  }
  var index_temp_default = AISearchApp;
  return __toCommonJS(index_temp_exports);
})();
