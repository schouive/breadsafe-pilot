/**
 * INCO-Compliant Ingredient List Generator
 * 
 * Generates two versions of ingredient lists:
 * 1. Technical (complete) - For internal use, calculations, and audits
 * 2. Condensed (INCO) - For labels, shorter and regulatory compliant
 * 
 * Based on EU Regulation 1169/2011 (INCO)
 */

interface IngredientInput {
  name: string;
  composition: string | null;
  bakerPercentage: number;
  allergens: string[];
  allergensSecondary?: string[];
}

interface ParsedSubIngredient {
  name: string;
  weight: number; // Relative weight based on parent's percentage
  isAllergen: boolean;
  allergenType: 'main' | 'secondary' | null;
}

interface GeneratedLists {
  technical: string;    // Liste technique complète
  condensed: string;    // Liste condensée INCO pour étiquettes
  condensedHtml: string; // Version HTML avec allergènes en gras
}

// Common allergens list for detection
const COMMON_ALLERGENS = [
  'gluten', 'blé', 'seigle', 'orge', 'avoine', 'épeautre', 'kamut',
  'crustacés', 'œuf', 'oeuf', 'poisson', 'arachide', 'arachides',
  'soja', 'lait', 'lactose', 'lactosérum',
  'fruits à coque', 'noix', 'noisette', 'noisettes', 'amande', 'amandes', 
  'noix de cajou', 'pistache', 'pistaches', 'noix de pécan', 'noix du brésil', 'noix de macadamia',
  'céleri', 'moutarde', 'sésame', 'sulfites', 'anhydride sulfureux',
  'lupin', 'mollusques'
];

/**
 * Parse a composition string to extract sub-ingredients
 * Handles formats like: "Pomme de terre, émulsifiant (E471), sel"
 */
function parseComposition(
  composition: string,
  parentWeight: number,
  parentAllergens: string[]
): ParsedSubIngredient[] {
  if (!composition || composition.trim() === '') {
    return [];
  }

  // Split by comma, but respect parentheses
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  
  for (const char of composition) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());

  // Estimate weights: first ingredient gets 40%, rest distributed
  const weights: number[] = [];
  const totalParts = parts.length;
  
  if (totalParts === 1) {
    weights.push(1);
  } else {
    // Decreasing weights: first gets more
    let remaining = 1;
    for (let i = 0; i < totalParts; i++) {
      const weight = remaining * (0.5 - i * 0.05);
      weights.push(Math.max(weight, 0.05));
      remaining -= weights[i];
    }
    // Normalize to sum to 1
    const sum = weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < weights.length; i++) {
      weights[i] = weights[i] / sum;
    }
  }

  return parts.map((part, index) => {
    const cleanName = part.trim();
    const lowerName = cleanName.toLowerCase();
    
    // Check if this sub-ingredient is an allergen
    const isAllergen = parentAllergens.some(a => 
      lowerName.includes(a.toLowerCase())
    ) || COMMON_ALLERGENS.some(a => 
      lowerName.includes(a.toLowerCase())
    );

    return {
      name: cleanName,
      weight: parentWeight * weights[index],
      isAllergen,
      allergenType: isAllergen ? 'main' : null,
    };
  });
}

/**
 * Generate the TECHNICAL (complete) ingredient list
 * Lists all ingredients with their full compositions
 */
function generateTechnicalList(
  ingredients: IngredientInput[],
  allAllergens: string[]
): string {
  // Sort by weight (baker percentage) descending
  const sorted = [...ingredients].sort((a, b) => b.bakerPercentage - a.bakerPercentage);
  
  return sorted
    .map((ing) => {
      let text = ing.composition || ing.name;
      
      // Highlight allergens in UPPERCASE
      allAllergens.forEach((allergen) => {
        const regex = new RegExp(`\\b${escapeRegex(allergen)}\\b`, 'gi');
        text = text.replace(regex, allergen.toUpperCase());
      });
      
      // If the ingredient name contains an allergen, uppercase it
      allAllergens.forEach((allergen) => {
        if (ing.name.toLowerCase().includes(allergen.toLowerCase())) {
          const regex = new RegExp(`\\b${escapeRegex(ing.name)}\\b`, 'gi');
          text = text.replace(regex, ing.name.toUpperCase());
        }
      });
      
      return text;
    })
    .join(', ') + '.';
}

/**
 * Generate the CONDENSED (INCO) ingredient list for labels
 * - Decomposes compound ingredients
 * - Removes duplicates
 * - Groups common ingredients
 * - Orders by actual weight in finished product
 * - Highlights allergens in bold (using ** markdown or HTML)
 */
function generateCondensedList(
  ingredients: IngredientInput[],
  allAllergens: string[],
  format: 'markdown' | 'html' = 'markdown'
): string {
  // Collect all sub-ingredients with their estimated weights
  const subIngredientMap = new Map<string, { weight: number; isAllergen: boolean; originalName: string }>();
  
  for (const ing of ingredients) {
    if (ing.composition && ing.composition.trim() !== '') {
      // Parse composition to get sub-ingredients
      const subIngs = parseComposition(ing.composition, ing.bakerPercentage, ing.allergens);
      
      for (const sub of subIngs) {
        const key = normalizeIngredientName(sub.name);
        const existing = subIngredientMap.get(key);
        
        if (existing) {
          existing.weight += sub.weight;
        } else {
          subIngredientMap.set(key, {
            weight: sub.weight,
            isAllergen: sub.isAllergen || ing.allergens.length > 0,
            originalName: sub.name,
          });
        }
      }
    } else {
      // Simple ingredient without composition
      const key = normalizeIngredientName(ing.name);
      const existing = subIngredientMap.get(key);
      const isAllergen = ing.allergens.length > 0 || 
        COMMON_ALLERGENS.some(a => ing.name.toLowerCase().includes(a.toLowerCase()));
      
      if (existing) {
        existing.weight += ing.bakerPercentage;
        if (isAllergen) existing.isAllergen = true;
      } else {
        subIngredientMap.set(key, {
          weight: ing.bakerPercentage,
          isAllergen,
          originalName: ing.name,
        });
      }
    }
  }
  
  // Sort by weight descending
  const sortedIngredients = Array.from(subIngredientMap.entries())
    .sort((a, b) => b[1].weight - a[1].weight);
  
  // Format the list
  const formattedParts = sortedIngredients.map(([_, data]) => {
    let text = data.originalName;
    
    // Check if this ingredient contains any allergen
    const containsAllergen = data.isAllergen || 
      allAllergens.some(a => text.toLowerCase().includes(a.toLowerCase()));
    
    if (containsAllergen) {
      // Find which allergen is in this ingredient and format it
      text = formatAllergenInText(text, allAllergens, format);
    }
    
    return text;
  });
  
  return formattedParts.join(', ') + '.';
}

/**
 * Format allergen within text using bold
 */
function formatAllergenInText(
  text: string, 
  allergens: string[], 
  format: 'markdown' | 'html'
): string {
  let result = text;
  
  for (const allergen of allergens) {
    const regex = new RegExp(`(${escapeRegex(allergen)})`, 'gi');
    
    if (format === 'html') {
      result = result.replace(regex, '<strong>$1</strong>');
    } else {
      result = result.replace(regex, '**$1**');
    }
  }
  
  // If no specific allergen was found but the ingredient is flagged as allergen,
  // bold the whole ingredient name
  if (result === text) {
    // Check against common allergens
    for (const allergen of COMMON_ALLERGENS) {
      if (text.toLowerCase().includes(allergen.toLowerCase())) {
        const regex = new RegExp(`(${escapeRegex(allergen)})`, 'gi');
        if (format === 'html') {
          result = result.replace(regex, '<strong>$1</strong>');
        } else {
          result = result.replace(regex, '**$1**');
        }
      }
    }
  }
  
  return result;
}

/**
 * Normalize ingredient name for deduplication
 */
function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ùûü]/g, 'u')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ç]/g, 'c');
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Main export function - generates both list versions
 */
export function generateIngredientLists(
  ingredients: IngredientInput[],
  allAllergens: string[]
): GeneratedLists {
  if (!ingredients || ingredients.length === 0) {
    return {
      technical: '',
      condensed: '',
      condensedHtml: '',
    };
  }

  return {
    technical: generateTechnicalList(ingredients, allAllergens),
    condensed: generateCondensedList(ingredients, allAllergens, 'markdown'),
    condensedHtml: generateCondensedList(ingredients, allAllergens, 'html'),
  };
}

/**
 * Convert markdown bold (**text**) to plain uppercase for PDF/print
 */
export function markdownToUppercase(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, (_, match) => match.toUpperCase());
}

/**
 * Convert markdown bold (**text**) to HTML bold
 */
export function markdownToHtml(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export type { IngredientInput, GeneratedLists };
