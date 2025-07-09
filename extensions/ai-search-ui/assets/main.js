
          // AI Search UI Extension - Auto-generated bundle
          // React and ReactDOM are expected to be loaded externally
          if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
            console.error('AI Search: React and ReactDOM must be loaded before this script');
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
  var SparkleIcon = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 3v18m9-9H3m7.5-7.5L3 21m18-10.5L10.5 21m10.5-18L3 13.5M21 3L13.5 10.5" }) });
  var UnifiedSearch = ({ shopUrl, appProxyUrl, onProductClick, formatPrice, onClose, placeholderText }) => {
    const [query, setQuery] = (0, import_react.useState)("");
    const [products, setProducts] = (0, import_react.useState)([]);
    const [isLoading, setIsLoading] = (0, import_react.useState)(false);
    const [error, setError] = (0, import_react.useState)(null);
    const [hasSearched, setHasSearched] = (0, import_react.useState)(false);
    const [showChat, setShowChat] = (0, import_react.useState)(false);
    const [messages, setMessages] = (0, import_react.useState)([]);
    const [chatInput, setChatInput] = (0, import_react.useState)("");
    const [isChatLoading, setIsChatLoading] = (0, import_react.useState)(false);
    const [context, setContext] = (0, import_react.useState)(null);
    const inputRef = (0, import_react.useRef)(null);
    const chatInputRef = (0, import_react.useRef)(null);
    const resultsRef = (0, import_react.useRef)(null);
    (0, import_react.useEffect)(() => {
      inputRef.current?.focus();
    }, []);
    (0, import_react.useEffect)(() => {
      if (hasSearched && products.length > 0 && resultsRef.current) {
        resultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, [hasSearched, products]);
    const performSearch = async (searchQuery) => {
      if (!searchQuery.trim())
        return;
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
        console.log("Search response:", data);
        console.log("Search data:", data?.data);
        console.log("Products found:", data?.data?.products?.length || 0);
        if (data.success && data.data && data.data.products && Array.isArray(data.data.products)) {
          console.log("Setting products:", data.data.products);
          setProducts(data.data.products);
          setContext({
            queries: [searchQuery],
            filters: data.data.query_info?.parsed_query?.filters || {},
            viewedProducts: [],
            preferences: {},
            sessionId: data.data.search_id || Date.now().toString()
          });
        } else {
          console.log("No products found or invalid response structure", data);
          console.log("Response structure check:", {
            hasSuccess: !!data.success,
            hasData: !!data.data,
            hasProducts: !!data.data?.products,
            isArray: Array.isArray(data.data?.products),
            productsLength: data.data?.products?.length
          });
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
            content: `I found ${products.length} products for "${query}". How would you like to refine your search? You can ask me to filter by price, color, brand, or any other preferences.`,
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
            context
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "Search Products" }),
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
        )
      ] }) }) }),
      isLoading && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "search-loading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "loading-spinner" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Searching for products..." })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "search-error", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: error }) }),
      hasSearched && !isLoading && products.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref: resultsRef, className: "search-results-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "results-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h4", { children: [
            products.length,
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
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "products-grid", children: products.map((product) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            className: "product-card",
            onClick: () => onProductClick(product),
            children: [
              product.image_url && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "product-image-container", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "img",
                {
                  src: product.image_url,
                  alt: product.title,
                  className: "product-image"
                }
              ) }),
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
                !product.available && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "product-unavailable", children: "Out of stock" })
              ] })
            ]
          },
          product.id || product.shopify_product_id
        )) })
      ] }),
      hasSearched && !isLoading && products.length === 0 && !error && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "no-results", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "No products found" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Try adjusting your search terms or browse our categories." })
      ] }),
      showChat && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "chat-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "chat-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", { children: "Refine Your Search with AI" }),
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
    console.log("AI Search Configuration:", {
      shopUrl,
      appProxyUrl,
      displayMode,
      placeholderText,
      rootElement,
      dataset: rootElement?.dataset,
      allDataAttributes: rootElement ? Object.keys(rootElement.dataset) : "no element"
    });
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
    const handleProductClick = (product) => {
      if (product.handle) {
        const productUrl = `${shopUrl}/products/${product.handle}`;
        window.open(productUrl, "_blank");
      }
    };
    const formatPrice = (price) => {
      if (!price)
        return "";
      const currency = window.Shopify?.currency?.active || "USD";
      const currencySymbol = currency === "USD" ? "$" : currency === "EUR" ? "\u20AC" : currency === "GBP" ? "\xA3" : "$";
      return `${currencySymbol}${price.toFixed(2)}`;
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
          "aria-label": "Open search",
          type: "button",
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SearchIcon, {}),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "button-text", children: "Search" })
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
            onClick: openModal,
            "aria-label": "Search products"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            className: "search-icon-button",
            onClick: openModal,
            "aria-label": "Open search",
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
      console.log("Initializing AI Search App...");
      try {
        if (window.AISearchConfig) {
          Object.entries(window.AISearchConfig).forEach(([key, value]) => {
            container.dataset[key] = typeof value === "object" ? JSON.stringify(value) : value;
          });
        }
        const root = (0, import_client.createRoot)(container);
        root.render(/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AISearchApp, {}));
        console.log("AI Search App initialized successfully");
      } catch (error) {
        console.error("Failed to initialize AI Search App:", error);
      }
    } else {
      console.error("AI Search container element not found");
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeApp);
  } else {
    initializeApp();
  }
  var index_temp_default = AISearchApp;
  return __toCommonJS(index_temp_exports);
})();
