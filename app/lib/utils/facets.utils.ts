/**
 * Facet generation utilities for search results
 */

import type { ProductCandidate } from '../search/search.server';

export interface FacetValue {
  value: string;
  count: number;
  label?: string;
}

export interface PriceRangeFacet {
  min: number;
  max: number;
  count: number;
  label: string;
}

export interface SearchFacets {
  vendors: FacetValue[];
  product_types: FacetValue[];
  tags: FacetValue[];
  price_ranges: PriceRangeFacet[];
  availability: {
    in_stock: number;
    out_of_stock: number;
  };
  on_sale: {
    on_sale: number;
    regular_price: number;
  };
}

/**
 * Generate facets from search results
 */
export function generateFacets(products: ProductCandidate[]): SearchFacets {
  const facets: SearchFacets = {
    vendors: [],
    product_types: [],
    tags: [],
    price_ranges: [],
    availability: { in_stock: 0, out_of_stock: 0 },
    on_sale: { on_sale: 0, regular_price: 0 },
  };

  if (!products || products.length === 0) {
    return facets;
  }

  // Count maps for aggregation
  const vendorCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const tagCounts = new Map<string, number>();
  const prices: number[] = [];

  products.forEach(product => {
    // Vendor facets
    if (product.vendor) {
      const count = vendorCounts.get(product.vendor) || 0;
      vendorCounts.set(product.vendor, count + 1);
    }

    // Product type facets
    if (product.product_type) {
      const count = typeCounts.get(product.product_type) || 0;
      typeCounts.set(product.product_type, count + 1);
    }

    // Tag facets
    if (product.tags && Array.isArray(product.tags)) {
      product.tags.forEach(tag => {
        if (tag && typeof tag === 'string') {
          const count = tagCounts.get(tag) || 0;
          tagCounts.set(tag, count + 1);
        }
      });
    }

    // Availability facets
    if (product.available) {
      facets.availability.in_stock++;
    } else {
      facets.availability.out_of_stock++;
    }

    // Sale facets - for now, we'll skip this since ProductCandidate doesn't include variant data
    // This would need to be enhanced if we want to include sale information in facets
    facets.on_sale.regular_price++;

    // Collect prices for price range facets
    if (product.price_min && product.price_min > 0) {
      prices.push(product.price_min);
    }
  });

  // Convert maps to sorted arrays
  facets.vendors = Array.from(vendorCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count) // Sort by count descending
    .slice(0, 15); // Limit to top 15

  facets.product_types = Array.from(typeCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  facets.tags = Array.from(tagCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20); // More tags since they're usually more specific

  // Generate price range facets
  facets.price_ranges = generatePriceRangeFacets(prices, products);

  return facets;
}

/**
 * Generate price range facets with smart bucketing
 */
function generatePriceRangeFacets(
  prices: number[], 
  products: ProductCandidate[]
): PriceRangeFacet[] {
  if (prices.length === 0) {
    return [];
  }

  const sortedPrices = [...prices].sort((a, b) => a - b);
  const minPrice = sortedPrices[0];
  const maxPrice = sortedPrices[sortedPrices.length - 1];
  
  // If all products have the same price, return a single range
  if (minPrice === maxPrice) {
    return [{
      min: minPrice,
      max: maxPrice,
      count: products.length,
      label: formatPriceRangeLabel(minPrice, maxPrice),
    }];
  }

  // Generate smart price ranges based on distribution
  const ranges = generateSmartPriceRanges(minPrice, maxPrice);
  
  return ranges.map(range => {
    const count = products.filter(product => 
      product.price_min && 
      product.price_min >= range.min && 
      product.price_min <= range.max
    ).length;

    return {
      min: range.min,
      max: range.max,
      count,
      label: formatPriceRangeLabel(range.min, range.max),
    };
  }).filter(range => range.count > 0); // Only include ranges with products
}

/**
 * Generate smart price ranges based on price distribution
 */
function generateSmartPriceRanges(minPrice: number, maxPrice: number): Array<{ min: number; max: number }> {
  const priceRange = maxPrice - minPrice;
  
  // If the range is small, create fewer buckets
  if (priceRange <= 50) {
    return [
      { min: minPrice, max: minPrice + 20 },
      { min: minPrice + 20, max: minPrice + 40 },
      { min: minPrice + 40, max: maxPrice },
    ].filter(range => range.min < range.max);
  }
  
  // Standard price ranges for most products
  if (priceRange <= 200) {
    const bucketSize = 25;
    const ranges: Array<{ min: number; max: number }> = [];
    
    for (let i = minPrice; i < maxPrice; i += bucketSize) {
      ranges.push({
        min: i,
        max: Math.min(i + bucketSize, maxPrice),
      });
    }
    
    return ranges;
  }
  
  // For wide price ranges, use percentage-based buckets
  const buckets = [
    { min: minPrice, max: minPrice + (priceRange * 0.2) },
    { min: minPrice + (priceRange * 0.2), max: minPrice + (priceRange * 0.5) },
    { min: minPrice + (priceRange * 0.5), max: minPrice + (priceRange * 0.8) },
    { min: minPrice + (priceRange * 0.8), max: maxPrice },
  ];
  
  return buckets.filter(range => range.min < range.max);
}

/**
 * Format price range for display
 */
function formatPriceRangeLabel(min: number, max: number): string {
  const formatPrice = (price: number) => `$${Math.round(price)}`;
  
  if (min === max) {
    return formatPrice(min);
  }
  
  return `${formatPrice(min)} - ${formatPrice(max)}`;
}

/**
 * Filter facet values by minimum count threshold
 */
export function filterFacetsByMinCount(
  facets: SearchFacets, 
  minCount: number = 2
): SearchFacets {
  return {
    ...facets,
    vendors: facets.vendors.filter(f => f.count >= minCount),
    product_types: facets.product_types.filter(f => f.count >= minCount),
    tags: facets.tags.filter(f => f.count >= minCount),
    price_ranges: facets.price_ranges.filter(f => f.count >= minCount),
  };
}

/**
 * Get top facet values for each category
 */
export function getTopFacets(
  facets: SearchFacets,
  limits: { vendors?: number; types?: number; tags?: number } = {}
): SearchFacets {
  const { vendors = 10, types = 10, tags = 15 } = limits;
  
  return {
    ...facets,
    vendors: facets.vendors.slice(0, vendors),
    product_types: facets.product_types.slice(0, types),
    tags: facets.tags.slice(0, tags),
  };
} 