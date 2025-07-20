/**
 * Price utility functions
 */

export interface PriceRange {
  min: number;
  max: number;
  sale_min?: number;
  sale_max?: number;
  currency?: string;
}

export interface ProductVariant {
  price: number;
  compare_at_price?: number;
  available: boolean;
  inventory_quantity: number;
}

/**
 * Calculate price range from product variants
 */
export function calculatePriceRange(variants: ProductVariant[]): PriceRange | null {
  if (!variants || variants.length === 0) {
    return null;
  }

  const prices = variants.map(v => v.price).filter(p => typeof p === 'number' && p >= 0);
  const comparePrices = variants
    .map(v => v.compare_at_price)
    .filter(p => typeof p === 'number' && p >= 0);

  if (prices.length === 0) {
    return null;
  }

  const priceRange: PriceRange = {
    min: Math.min(...prices),
    max: Math.max(...prices),
  };

  // Calculate sale prices if any variants have compare_at_price
  if (comparePrices.length > 0) {
    const saleVariants = variants.filter(v => 
      v.compare_at_price && v.compare_at_price > v.price
    );
    
    if (saleVariants.length > 0) {
      const salePrices = saleVariants.map(v => v.price);
      priceRange.sale_min = Math.min(...salePrices);
      priceRange.sale_max = Math.max(...salePrices);
    }
  }

  return priceRange;
}

/**
 * Format price for display
 */
export function formatPrice(
  price: number, 
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(price);
  } catch (error) {
    // Fallback for invalid currency/locale
    return `$${price.toFixed(2)}`;
  }
}

/**
 * Format price range for display
 */
export function formatPriceRange(
  priceRange: PriceRange,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  if (!priceRange) return '';

  const minFormatted = formatPrice(priceRange.min, currency, locale);
  const maxFormatted = formatPrice(priceRange.max, currency, locale);

  if (priceRange.min === priceRange.max) {
    return minFormatted;
  }

  return `${minFormatted} - ${maxFormatted}`;
}

/**
 * Calculate discount percentage
 */
export function calculateDiscountPercentage(
  originalPrice: number,
  salePrice: number
): number {
  if (originalPrice <= 0 || salePrice >= originalPrice) {
    return 0;
  }
  
  return Math.round(((originalPrice - salePrice) / originalPrice) * 100);
}

/**
 * Check if product is on sale
 */
export function isOnSale(variants: ProductVariant[]): boolean {
  return variants.some(variant => 
    variant.compare_at_price && 
    variant.compare_at_price > variant.price
  );
}

/**
 * Get best price from variants (lowest available price)
 */
export function getBestPrice(variants: ProductVariant[]): number | null {
  const availablePrices = variants
    .filter(v => v.available && v.inventory_quantity > 0)
    .map(v => v.price);
  
  return availablePrices.length > 0 ? Math.min(...availablePrices) : null;
}

/**
 * Get price comparison data
 */
export function getPriceComparison(variants: ProductVariant[]): {
  currentPrice: number | null;
  originalPrice: number | null;
  savings: number | null;
  discountPercentage: number;
} {
  const bestPrice = getBestPrice(variants);
  if (!bestPrice) {
    return {
      currentPrice: null,
      originalPrice: null,
      savings: null,
      discountPercentage: 0,
    };
  }

  // Find the variant with the best price that has a compare_at_price
  const bestVariant = variants.find(v => 
    v.price === bestPrice && 
    v.available && 
    v.inventory_quantity > 0 &&
    v.compare_at_price &&
    v.compare_at_price > v.price
  );

  if (!bestVariant?.compare_at_price) {
    return {
      currentPrice: bestPrice,
      originalPrice: null,
      savings: null,
      discountPercentage: 0,
    };
  }

  const savings = bestVariant.compare_at_price - bestPrice;
  const discountPercentage = calculateDiscountPercentage(
    bestVariant.compare_at_price,
    bestPrice
  );

  return {
    currentPrice: bestPrice,
    originalPrice: bestVariant.compare_at_price,
    savings,
    discountPercentage,
  };
} 