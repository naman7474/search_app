// app/lib/ai/spell-correction.server.ts

/**
 * Basic spell correction using Levenshtein distance
 * This is a simple implementation - in production, consider using a dedicated service
 */

// Common e-commerce terms dictionary
const ECOMMERCE_DICTIONARY = new Set([
  // Common product categories
  'dress', 'dresses', 'shirt', 'shirts', 'shoes', 'pants', 'jacket', 'jackets',
  'sweater', 'sweaters', 'jeans', 'coat', 'coats', 'bag', 'bags', 'watch', 'watches',
  'jewelry', 'accessories', 'hat', 'hats', 'scarf', 'scarves', 'gloves', 'socks',
  'underwear', 'swimsuit', 'swimwear', 'bikini', 'shorts', 'skirt', 'skirts',
  'blouse', 'blazer', 'suit', 'suits', 'tie', 'ties', 'belt', 'belts',
  
  // Colors
  'red', 'blue', 'green', 'yellow', 'black', 'white', 'gray', 'grey', 'pink',
  'purple', 'orange', 'brown', 'beige', 'navy', 'gold', 'silver', 'rose',
  
  // Materials
  'cotton', 'silk', 'wool', 'leather', 'denim', 'polyester', 'nylon', 'linen',
  'cashmere', 'velvet', 'suede', 'satin', 'chiffon', 'lace', 'mesh',
  
  // Sizes
  'small', 'medium', 'large', 'extra', 'plus', 'petite', 'tall', 'regular',
  'slim', 'fit', 'loose', 'tight', 'oversized',
  
  // Occasions
  'casual', 'formal', 'business', 'party', 'wedding', 'evening', 'cocktail',
  'work', 'office', 'gym', 'sports', 'athletic', 'outdoor', 'beach', 'summer',
  'winter', 'spring', 'fall', 'autumn',
  
  // Brands (add common brands)
  'nike', 'adidas', 'puma', 'reebok', 'levis', 'gap', 'zara', 'uniqlo',
  
  // Common misspellings -> corrections
  'womens', 'women', 'mens', 'men', 'kids', 'children', 'baby', 'babies',
]);

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }
  
  return dp[m][n];
}

/**
 * Find the closest word in the dictionary
 */
function findClosestWord(word: string, dictionary: Set<string>, maxDistance: number = 2): string | null {
  const lowerWord = word.toLowerCase();
  
  // If word is already in dictionary, return it
  if (dictionary.has(lowerWord)) {
    return lowerWord;
  }
  
  let minDistance = Infinity;
  let closestWord: string | null = null;
  
  // Find word with minimum edit distance
  for (const dictWord of dictionary) {
    const distance = levenshteinDistance(lowerWord, dictWord);
    if (distance < minDistance && distance <= maxDistance) {
      minDistance = distance;
      closestWord = dictWord;
    }
  }
  
  return closestWord;
}

/**
 * Common spelling corrections map
 */
const COMMON_CORRECTIONS: Record<string, string> = {
  // Common typos
  'drss': 'dress',
  'shrt': 'shirt',
  'pnts': 'pants',
  'jckt': 'jacket',
  'swetr': 'sweater',
  'jwlry': 'jewelry',
  'accsories': 'accessories',
  
  // Phonetic mistakes
  'blak': 'black',
  'blu': 'blue',
  'grn': 'green',
  'gry': 'gray',
  'wht': 'white',
  
  // Common abbreviations
  'sm': 'small',
  'md': 'medium',
  'lg': 'large',
  'xl': 'extra large',
  'xxl': 'extra extra large',
};

/**
 * Correct spelling in a query
 */
export function spellCorrect(query: string): string {
  const words = query.toLowerCase().split(/\s+/);
  const correctedWords = words.map(word => {
    // Check common corrections first
    if (COMMON_CORRECTIONS[word]) {
      return COMMON_CORRECTIONS[word];
    }
    
    // Try to find in dictionary
    const correction = findClosestWord(word, ECOMMERCE_DICTIONARY);
    return correction || word;
  });
  
  return correctedWords.join(' ');
}

/**
 * Check if spelling correction is needed
 */
export function needsSpellCorrection(query: string): boolean {
  const words = query.toLowerCase().split(/\s+/);
  return words.some(word => {
    return !ECOMMERCE_DICTIONARY.has(word) && 
           !COMMON_CORRECTIONS[word] &&
           word.length > 3; // Don't correct very short words
  });
}

/**
 * Get spell correction suggestions
 */
export function getSpellingSuggestions(query: string): string[] {
  const suggestions: string[] = [];
  const words = query.toLowerCase().split(/\s+/);
  
  words.forEach((word, index) => {
    if (!ECOMMERCE_DICTIONARY.has(word) && word.length > 3) {
      const correction = findClosestWord(word, ECOMMERCE_DICTIONARY);
      if (correction && correction !== word) {
        const correctedWords = [...words];
        correctedWords[index] = correction;
        suggestions.push(correctedWords.join(' '));
      }
    }
  });
  
  return [...new Set(suggestions)]; // Remove duplicates
} 