import React, { useState, useRef, useEffect } from 'react';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface ConversationContext {
  queries: string[];
  filters: Record<string, any>;
  viewedProducts: any[];
  preferences: Record<string, any>;
  sessionId: string;
}

export interface Product {
  id: string;
  shopify_product_id: number;
  title: string;
  description?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  vendor?: string | null;
  product_type?: string | null;
  tags?: string[] | null;
  similarity_score: number;
  available: boolean;
  image_url?: string;
  handle?: string;
}

interface ConversationalSearchProps {
  shopUrl: string;
  appProxyUrl: string;
  onProductClick: (product: Product) => void;
  formatPrice: (price: number | null | undefined) => string;
  onClose: () => void;
}

const ConversationalSearch: React.FC<ConversationalSearchProps> = ({
  shopUrl,
  appProxyUrl,
  onProductClick,
  formatPrice,
  onClose,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm here to help you find the perfect products. What are you looking for today?",
      timestamp: Date.now(),
    },
  ]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [suggestedResponses, setSuggestedResponses] = useState<string[]>([]);
  const [context, setContext] = useState<ConversationContext | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsLoading(true);
    setError(null);

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
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.data.message,
          timestamp: Date.now(),
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Update products if search was performed
        if (data.data.products && data.data.products.length > 0) {
          setProducts(data.data.products);
        } else if (!data.data.searchPerformed) {
          // Clear products if no search was performed (clarification mode)
          setProducts([]);
        }

        // Update suggestions
        setSuggestedQuestions(data.data.suggestedQuestions || []);
        setSuggestedResponses(data.data.suggestedResponses || []);

        // Update context
        if (data.data.context) {
          setContext(data.data.context);
        }
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Conversation failed:', error);
      setError('I encountered an issue. Please try again.');
      
      // Add error message to conversation
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an issue processing your request. Please try again or rephrase your question.",
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(currentInput);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(currentInput);
    }
  };

  return (
    <div className="conversational-search">
      {/* Header */}
      <div className="conversation-header">
        <h3>Chat with AI Assistant</h3>
        <button 
          className="conversation-close-button" 
          onClick={onClose}
          aria-label="Close conversation"
          type="button"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="conversation-messages">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`conversation-message ${message.role === 'user' ? 'user-message' : 'assistant-message'}`}
          >
            <div className="message-content">
              {message.content}
            </div>
            {message.timestamp && (
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="conversation-message assistant-message">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Products Grid */}
      {products.length > 0 && (
        <div className="conversation-products">
          <h4>Recommended Products</h4>
          <div className="conversation-products-grid">
            {products.map((product) => (
              <div
                key={product.id || product.shopify_product_id}
                className="conversation-product-card"
                onClick={() => onProductClick(product)}
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="product-card-image"
                    loading="lazy"
                  />
                )}
                <div className="product-card-info">
                  <h5 className="product-card-title">{product.title}</h5>
                  <p className="product-card-price">
                    {formatPrice(product.price_min)}
                  </p>
                  {product.vendor && (
                    <p className="product-card-vendor">by {product.vendor}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div className="conversation-suggestions">
          <h5>Suggested questions:</h5>
          <div className="suggestion-buttons">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                className="suggestion-button"
                onClick={() => handleSuggestionClick(question)}
                type="button"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Responses */}
      {suggestedResponses.length > 0 && !suggestedQuestions.length && (
        <div className="conversation-suggestions">
          <h5>You might be interested in:</h5>
          <div className="suggestion-buttons">
            {suggestedResponses.map((response, index) => (
              <button
                key={index}
                className="suggestion-button"
                onClick={() => handleSuggestionClick(response)}
                type="button"
              >
                {response}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form className="conversation-input-form" onSubmit={handleInputSubmit}>
        <div className="conversation-input-wrapper">
          <input
            ref={inputRef}
            type="text"
            className="conversation-input"
            placeholder="Type your message here..."
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            aria-label="Type your message"
          />
          <button
            type="submit"
            className="conversation-send-button"
            disabled={!currentInput.trim() || isLoading}
            aria-label="Send message"
          >
            <svg 
              width="20" 
              height="20" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22,2 15,22 11,13 2,9"></polygon>
            </svg>
          </button>
        </div>
      </form>

      {error && (
        <div className="conversation-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default ConversationalSearch; 