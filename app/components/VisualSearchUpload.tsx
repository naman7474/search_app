import React, { useState, useRef, useCallback } from 'react';

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

export interface VisualSearchResult {
  products: Product[];
  total_count: number;
  query_info: {
    original_query: string;
    processing_time_ms: number;
  };
  visual_features?: {
    category: string;
    colors: string[];
    style: string[];
    materials: string[];
    features: string[];
    confidence: number;
  };
  search_id: string;
}

interface VisualSearchUploadProps {
  shopUrl: string;
  appProxyUrl: string;
  onResults: (results: VisualSearchResult) => void;
  onProductClick: (product: Product) => void;
  formatPrice: (price: number | null | undefined) => string;
  onClose: () => void;
}

const VisualSearchUpload: React.FC<VisualSearchUploadProps> = ({
  shopUrl,
  appProxyUrl,
  onResults,
  onProductClick,
  formatPrice,
  onClose,
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<VisualSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supported file types
  const SUPPORTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB

  const validateFile = useCallback((file: File): string | null => {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      return 'Please upload a JPEG, PNG, WebP, or GIF image.';
    }
    
    if (file.size > MAX_SIZE) {
      return 'Image must be smaller than 5MB.';
    }
    
    return null;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSelectedImage(file);
    setError(null);
    setSearchResults(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, [validateFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => SUPPORTED_TYPES.includes(file.type));
    
    if (imageFile) {
      handleFileSelect(imageFile);
    } else {
      setError('Please drop a valid image file (JPEG, PNG, WebP, or GIF).');
    }
  }, [handleFileSelect, SUPPORTED_TYPES]);

  const performVisualSearch = useCallback(async () => {
    if (!selectedImage) return;

    setIsSearching(true);
    setError(null);

    try {
      const shopDomain = shopUrl.replace('https://', '').replace('http://', '').replace('/', '');
      const formData = new FormData();
      formData.append('image', selectedImage);
      formData.append('shop', shopDomain);
      formData.append('limit', '20');
      formData.append('session_id', `visual-${Date.now()}`);

      const response = await fetch(`${appProxyUrl}/api/visual-search`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Search failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        setSearchResults(data.data);
        onResults(data.data);
      } else {
        throw new Error(data.error || 'Visual search failed');
      }

    } catch (err) {
      console.error('Visual search error:', err);
      setError(err instanceof Error ? err.message : 'Visual search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [selectedImage, shopUrl, appProxyUrl, onResults]);

  const clearSelection = useCallback(() => {
    setSelectedImage(null);
    setImagePreview(null);
    setSearchResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div className="visual-search-upload">
      {/* Header */}
      <div className="visual-search-header">
        <h3>Visual Search</h3>
        <button 
          className="visual-search-close-button" 
          onClick={onClose}
          aria-label="Close visual search"
          type="button"
        >
          ×
        </button>
      </div>

      {/* Upload Area */}
      {!selectedImage && (
        <div
          className={`visual-search-dropzone ${dragActive ? 'drag-active' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-content">
            <div className="dropzone-icon">📸</div>
            <p className="dropzone-text">
              Drop an image here or click to upload
            </p>
            <p className="dropzone-subtext">
              Search for similar products using photos
            </p>
            <p className="dropzone-formats">
              Supports JPEG, PNG, WebP, GIF (max 5MB)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={SUPPORTED_TYPES.join(',')}
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Image Preview & Controls */}
      {selectedImage && imagePreview && (
        <div className="visual-search-preview">
          <div className="preview-image-container">
            <img 
              src={imagePreview} 
              alt="Selected for visual search" 
              className="preview-image"
            />
            <button 
              className="preview-clear-button"
              onClick={clearSelection}
              aria-label="Remove image"
              type="button"
            >
              ×
            </button>
          </div>
          
          <div className="preview-actions">
            <button
              className="visual-search-button"
              onClick={performVisualSearch}
              disabled={isSearching}
              type="button"
            >
              {isSearching ? 'Searching...' : 'Find Similar Products'}
            </button>
            
            <button
              className="visual-search-button-secondary"
              onClick={clearSelection}
              disabled={isSearching}
              type="button"
            >
              Choose Different Image
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="visual-search-error">
          <p>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="visual-search-loading">
          <div className="loading-spinner"></div>
          <p>Analyzing your image and finding similar products...</p>
        </div>
      )}

      {/* Search Results */}
      {searchResults && (
        <div className="visual-search-results">
          <div className="results-header">
            <h4>Found {searchResults.total_count} similar products</h4>
            {searchResults.visual_features && (
              <div className="extracted-features">
                <p className="features-label">Detected:</p>
                <div className="features-tags">
                  <span className="feature-tag">{searchResults.visual_features.category}</span>
                  {searchResults.visual_features.colors.slice(0, 2).map((color, idx) => (
                    <span key={idx} className="feature-tag color-tag">{color}</span>
                  ))}
                  {searchResults.visual_features.style.slice(0, 2).map((style, idx) => (
                    <span key={idx} className="feature-tag">{style}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="visual-search-products">
            {searchResults.products.map((product) => (
              <div 
                key={product.id} 
                className="visual-search-product"
                onClick={() => onProductClick(product)}
              >
                {product.image_url && (
                  <div className="product-image-container">
                    <img 
                      src={product.image_url} 
                      alt={product.title}
                      className="product-image"
                    />
                    <div className="similarity-badge">
                      {Math.round(product.similarity_score * 100)}% match
                    </div>
                  </div>
                )}
                
                <div className="product-info">
                  <h5 className="product-title">{product.title}</h5>
                  {product.vendor && (
                    <p className="product-vendor">{product.vendor}</p>
                  )}
                  <div className="product-price">
                    {product.price_min !== null && (
                      <span className="price">
                        {formatPrice(product.price_min)}
                        {product.price_max !== product.price_min && product.price_max !== null && (
                          ` - ${formatPrice(product.price_max)}`
                        )}
                      </span>
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

      {/* Instructions */}
      {!selectedImage && !isSearching && !searchResults && (
        <div className="visual-search-instructions">
          <h4>How Visual Search Works</h4>
          <ul>
            <li>📸 Upload a photo of any product</li>
            <li>🔍 AI analyzes colors, style, and features</li>
            <li>🛍️ Find similar products in this store</li>
            <li>⚡ Get results in seconds</li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default VisualSearchUpload; 