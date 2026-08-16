/**
 * avoidMatcher.js — Deterministic matching engine for Ingredient Scanner.
 * Matches extracted label ingredients against the user's local Avoid List.
 */

// Explicit synonym dictionary for suggested avoid items
export const SYNONYM_MAP = {
  'milk': ['milk', 'casein', 'whey', 'lactose', 'sodium caseinate', 'butter', 'cream', 'ghee'],
  'peanuts': ['peanut', 'peanuts', 'groundnut', 'groundnuts', 'peanut oil'],
  'tree nuts': ['almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts', 'hazelnut', 'hazelnuts', 'pistachio', 'pistachios', 'tree nut', 'tree nuts', 'macadamia', 'pecan'],
  'eggs': ['egg', 'eggs', 'albumen', 'ovalbumin', 'egg white', 'egg yolk'],
  'soy': ['soy', 'soya', 'soybean', 'soybeans', 'lecithin', 'soy lecithin', 'tofu'],
  'wheat / gluten': ['wheat', 'gluten', 'barley', 'rye', 'spelt', 'farina', 'semolina'],
  'sesame': ['sesame', 'sesamum', 'tahini', 'sesame oil'],
  'fragrance / parfum': ['fragrance', 'parfum', 'perfume', 'aroma', 'flavor', 'flavour'],
  'fluoride': ['fluoride', 'sodium fluoride', 'stannous fluoride', 'monofluorophosphate'],
  'sodium lauryl sulfate (sls)': ['sodium lauryl sulfate', 'sls', 'sodium dodecyl sulfate', 'sds']
};

/**
 * Normalizes text for matching:
 * - lowercase
 * - trim whitespace
 * - remove simple punctuation (keep alphanumeric characters and spaces)
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gets all terms (canonical name + synonyms) associated with an avoid item.
 */
export function getSearchTerms(avoidItemName) {
  const norm = normalizeText(avoidItemName);
  const terms = new Set([norm]);

  // Check synonym map entries
  for (const [key, synonyms] of Object.entries(SYNONYM_MAP)) {
    const normKey = normalizeText(key);
    if (norm === normKey || normKey.includes(norm) || norm.includes(normKey)) {
      synonyms.forEach(syn => terms.add(normalizeText(syn)));
    }
  }

  return Array.from(terms).filter(t => t.length > 0);
}

/**
 * Evaluates whether an individual extracted ingredient matches a single search term.
 */
export function isTermMatch(normalizedIngredient, normalizedTerm) {
  if (!normalizedIngredient || !normalizedTerm) return false;

  if (normalizedIngredient === normalizedTerm) return true;

  // Check if term is a whole word within the ingredient string
  const regex = new RegExp(`\\b${normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return regex.test(normalizedIngredient);
}

/**
 * Checks extracted ingredients against a user's Avoid List.
 * Returns an array of match objects:
 * [
 *   {
 *     avoidItem: "Peanuts",
 *     category: "Allergy",
 *     matchedIngredient: "Peanut Oil",
 *     matchedTerm: "peanut"
 *   }
 * ]
 */
export function checkAvoidList(extractedIngredients = [], avoidList = []) {
  if (!Array.isArray(extractedIngredients) || !Array.isArray(avoidList)) {
    return [];
  }

  const matches = [];
  const seenPairs = new Set();

  for (const avoidItem of avoidList) {
    if (!avoidItem || !avoidItem.name) continue;

    const terms = getSearchTerms(avoidItem.name);

    for (const rawIngredient of extractedIngredients) {
      const normIng = normalizeText(rawIngredient);
      if (!normIng) continue;

      for (const term of terms) {
        if (isTermMatch(normIng, term)) {
          const pairKey = `${avoidItem.id || avoidItem.name}_${rawIngredient}`;
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            matches.push({
              avoidItem: avoidItem.name,
              category: avoidItem.category || 'Allergy',
              matchedIngredient: rawIngredient,
              matchedTerm: term
            });
          }
          break; // Stop checking terms for this ingredient once matched
        }
      }
    }
  }

  return matches;
}

/**
 * Lightweight test suite for matching verification.
 */
export function runAvoidMatcherTests() {
  const sampleAvoidList = [
    { id: '1', name: 'Milk', category: 'Allergy' },
    { id: '2', name: 'Peanuts', category: 'Allergy' },
    { id: '3', name: 'Fragrance / parfum', category: 'Sensitivity' }
  ];

  const testCases = [
    {
      name: 'Matching whey in ingredients to Milk',
      ingredients: ['Water', 'Whey protein isolate', 'Cane sugar'],
      expectedMatchCount: 1,
      expectedAvoidItem: 'Milk'
    },
    {
      name: 'Matching peanut oil to Peanuts',
      ingredients: ['Peanut oil', 'Salt'],
      expectedMatchCount: 1,
      expectedAvoidItem: 'Peanuts'
    },
    {
      name: 'Non-matching ingredients',
      ingredients: ['Purified water', 'Glycerin', 'Aloe vera extract'],
      expectedMatchCount: 0
    }
  ];

  const results = testCases.map(tc => {
    const matches = checkAvoidList(tc.ingredients, sampleAvoidList);
    const passed = matches.length === tc.expectedMatchCount &&
      (!tc.expectedAvoidItem || matches.some(m => m.avoidItem === tc.expectedAvoidItem));
    return { name: tc.name, passed, matchesCount: matches.length };
  });

  return results;
}
