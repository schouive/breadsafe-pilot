/**
 * INCO-Compliant Ingredient List Generator
 * 
 * Generates two versions of ingredient lists:
 * 1. Technical (complete) - For internal use, calculations, and audits
 * 2. Condensed (INCO) - For labels, shorter and regulatory compliant
 * 
 * Based on EU Regulation 1169/2011 (INCO)
 * 
 * RULES FOR INCO LIST:
 * - Never display intermediate/functional raw materials (dorage, améliorant, prémix, correcteur)
 * - Fully decompose intermediate ingredients into their final components
 * - Remove duplicates and group identical additives
 * - Order by descending actual weight in finished product
 * - Highlight allergens in BOLD
 * - Never show compound ingredient structure in final INCO list
 */

interface IngredientInput {
  name: string;
  composition: string | null;
  bakerPercentage: number;
  allergens: string[];
  allergensSecondary?: string[];
  type?: string; // 'farine' or 'ingredient'
}

interface FlatIngredient {
  name: string;
  weight: number;
  isAllergen: boolean;
  allergenNames: string[];
  isAdditive: boolean;
  additiveFunction?: string; // émulsifiant, conservateur, etc.
}

interface GeneratedLists {
  technical: string;    // Liste technique complète
  condensed: string;    // Liste condensée INCO pour étiquettes
  condensedHtml: string; // Version HTML avec allergènes en gras
}

// Names of intermediate/functional raw materials to decompose (never show these names)
const INTERMEDIATE_MATERIALS = [
  'dorage', 'dorure',
  'améliorant', 'ameliorant',
  'prémix', 'premix',
  'correcteur',
  'mix',
  'préparation', 'preparation',
  'mélange', 'melange',
  'base',
];

// Common allergens list for detection
const COMMON_ALLERGENS = [
  'gluten', 'blé', 'ble', 'seigle', 'orge', 'avoine', 'épeautre', 'epeautre', 'kamut',
  'froment',
  'crustacés', 'crustaces',
  'œuf', 'oeuf', 'œufs', 'oeufs',
  'poisson', 'poissons',
  'arachide', 'arachides', 'cacahuète', 'cacahuete',
  'soja',
  'lait', 'lactose', 'lactosérum', 'lactoserum', 'beurre', 'crème', 'creme',
  'fruits à coque', 'noix', 'noisette', 'noisettes', 'amande', 'amandes',
  'noix de cajou', 'pistache', 'pistaches', 'noix de pécan', 'noix du brésil', 'noix de macadamia',
  'céleri', 'celeri',
  'moutarde',
  'sésame', 'sesame',
  'sulfites', 'anhydride sulfureux', 'sulfite',
  'lupin', 'lupins',
  'mollusques', 'mollusque'
];

// Additive functions for INCO grouping
const ADDITIVE_PATTERNS: { pattern: RegExp; function: string }[] = [
  { pattern: /émulsifiant|emulsifiant/i, function: 'émulsifiant' },
  { pattern: /conservateur/i, function: 'conservateur' },
  { pattern: /antioxydant/i, function: 'antioxydant' },
  { pattern: /colorant/i, function: 'colorant' },
  { pattern: /épaississant|epaississant/i, function: 'épaississant' },
  { pattern: /stabilisant/i, function: 'stabilisant' },
  { pattern: /acidifiant/i, function: 'acidifiant' },
  { pattern: /agent de traitement de la farine/i, function: 'agent de traitement de la farine' },
  { pattern: /anti-agglomérant|antiagglomerant/i, function: 'anti-agglomérant' },
  { pattern: /arôme|arome/i, function: 'arôme' },
  { pattern: /exhausteur de goût|exhausteur/i, function: 'exhausteur de goût' },
  { pattern: /E\d{3,4}/i, function: 'additif' },
];

/**
 * Check if an ingredient name is an intermediate material that should be decomposed
 */
function isIntermediateMaterial(name: string): boolean {
  const lowerName = name.toLowerCase();
  return INTERMEDIATE_MATERIALS.some(term => lowerName.includes(term));
}

/**
 * Check if a text contains an allergen
 */
function containsAllergen(text: string, allergens: string[]): { isAllergen: boolean; foundAllergens: string[] } {
  const lowerText = text.toLowerCase();
  const foundAllergens: string[] = [];
  
  // Check against provided allergens
  for (const allergen of allergens) {
    if (lowerText.includes(allergen.toLowerCase())) {
      foundAllergens.push(allergen);
    }
  }
  
  // Check against common allergens
  for (const allergen of COMMON_ALLERGENS) {
    if (lowerText.includes(allergen.toLowerCase()) && !foundAllergens.includes(allergen)) {
      foundAllergens.push(allergen);
    }
  }
  
  return { isAllergen: foundAllergens.length > 0, foundAllergens };
}

/**
 * Detect if an ingredient is an additive and get its function
 */
function detectAdditive(name: string): { isAdditive: boolean; function?: string } {
  for (const { pattern, function: func } of ADDITIVE_PATTERNS) {
    if (pattern.test(name)) {
      return { isAdditive: true, function: func };
    }
  }
  return { isAdditive: false };
}

/**
 * Parse a composition string to extract sub-ingredients
 * Handles nested compositions and respects parentheses
 */
function parseComposition(
  composition: string,
  parentWeight: number,
  parentAllergens: string[]
): FlatIngredient[] {
  if (!composition || composition.trim() === '') {
    return [];
  }

  // Split by comma, respecting parentheses
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  
  for (const char of composition) {
    if (char === '(' || char === '[') depth++;
    else if (char === ')' || char === ']') depth--;
    else if (char === ',' && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) parts.push(current.trim());

  // Estimate weights: decreasing distribution based on INCO order
  const weights = estimateWeights(parts.length);
  
  const results: FlatIngredient[] = [];

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i].trim();
    const weight = parentWeight * weights[i];
    
    // Check for nested composition in parentheses: "Ingredient (sub1, sub2)"
    const nestedMatch = part.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (nestedMatch) {
      // Has nested composition - recursively parse
      const [, mainName, nestedComposition] = nestedMatch;
      
      // If the main name is an intermediate material, just decompose
      if (isIntermediateMaterial(mainName)) {
        const subIngredients = parseComposition(nestedComposition, weight, parentAllergens);
        results.push(...subIngredients);
      } else {
        // For non-intermediate materials, decompose sub-ingredients
        const subIngredients = parseComposition(nestedComposition, weight, parentAllergens);
        results.push(...subIngredients);
      }
    } else {
      // Simple ingredient
      const { isAllergen, foundAllergens } = containsAllergen(part, parentAllergens);
      const { isAdditive, function: additiveFunction } = detectAdditive(part);
      
      // Clean up the name (remove E-numbers format duplicates)
      const cleanedName = cleanIngredientName(part);
      
      results.push({
        name: cleanedName,
        weight,
        isAllergen,
        allergenNames: foundAllergens,
        isAdditive,
        additiveFunction,
      });
    }
  }

  return results;
}

/**
 * Estimate weights for sub-ingredients based on position (INCO order = decreasing weight)
 */
function estimateWeights(count: number): number[] {
  if (count === 0) return [];
  if (count === 1) return [1];
  
  // Use exponential decay: first ingredient gets most, decreasing thereafter
  const weights: number[] = [];
  let remaining = 1;
  
  for (let i = 0; i < count; i++) {
    // Each subsequent ingredient gets ~60% of what's left
    const factor = Math.max(0.6 - (i * 0.05), 0.1);
    const weight = i === count - 1 ? remaining : remaining * factor;
    weights.push(weight);
    remaining -= weight;
  }
  
  // Normalize to ensure sum = 1
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

/**
 * Clean ingredient name - remove redundant info
 */
function cleanIngredientName(name: string): string {
  let cleaned = name.trim();
  
  // Remove leading/trailing punctuation
  cleaned = cleaned.replace(/^[,;:\s]+|[,;:\s]+$/g, '');
  
  return cleaned;
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
    .replace(/[ç]/g, 'c')
    .replace(/['']/g, "'");
}

/**
 * Flatten all ingredients to their base components
 */
function flattenIngredients(
  ingredients: IngredientInput[],
  allAllergens: string[]
): FlatIngredient[] {
  const flatIngredients: FlatIngredient[] = [];

  for (const ing of ingredients) {
    const hasComposition = ing.composition && ing.composition.trim() !== '';
    const shouldDecompose = hasComposition && (
      isIntermediateMaterial(ing.name) || 
      ing.composition!.includes(',') // Contains multiple sub-ingredients
    );

    if (shouldDecompose) {
      // Decompose the ingredient
      const subIngredients = parseComposition(
        ing.composition!,
        ing.bakerPercentage,
        [...ing.allergens, ...allAllergens]
      );
      flatIngredients.push(...subIngredients);
    } else if (hasComposition) {
      // Simple ingredient with composition that's just a single ingredient
      const { isAllergen, foundAllergens } = containsAllergen(ing.composition!, allAllergens);
      const { isAdditive, function: additiveFunction } = detectAdditive(ing.composition!);
      
      flatIngredients.push({
        name: cleanIngredientName(ing.composition!),
        weight: ing.bakerPercentage,
        isAllergen: isAllergen || ing.allergens.length > 0,
        allergenNames: [...foundAllergens, ...ing.allergens],
        isAdditive,
        additiveFunction,
      });
    } else {
      // Simple ingredient without composition
      const { isAllergen, foundAllergens } = containsAllergen(ing.name, allAllergens);
      const { isAdditive, function: additiveFunction } = detectAdditive(ing.name);
      
      flatIngredients.push({
        name: cleanIngredientName(ing.name),
        weight: ing.bakerPercentage,
        isAllergen: isAllergen || ing.allergens.length > 0,
        allergenNames: [...foundAllergens, ...ing.allergens],
        isAdditive,
        additiveFunction,
      });
    }
  }

  return flatIngredients;
}

/**
 * Merge duplicates and group by normalized name
 */
function mergeAndDeduplicate(ingredients: FlatIngredient[]): FlatIngredient[] {
  const merged = new Map<string, FlatIngredient>();

  for (const ing of ingredients) {
    const key = normalizeIngredientName(ing.name);
    const existing = merged.get(key);

    if (existing) {
      // Merge: add weights, combine allergens
      existing.weight += ing.weight;
      if (ing.isAllergen) existing.isAllergen = true;
      existing.allergenNames = [...new Set([...existing.allergenNames, ...ing.allergenNames])];
      if (ing.isAdditive && !existing.isAdditive) {
        existing.isAdditive = true;
        existing.additiveFunction = ing.additiveFunction;
      }
    } else {
      merged.set(key, { ...ing });
    }
  }

  return Array.from(merged.values());
}

/**
 * Group additives by function for INCO compliance
 */
function groupAdditivesByFunction(ingredients: FlatIngredient[]): FlatIngredient[] {
  const result: FlatIngredient[] = [];
  const additiveGroups = new Map<string, FlatIngredient[]>();

  for (const ing of ingredients) {
    if (ing.isAdditive && ing.additiveFunction && ing.additiveFunction !== 'additif') {
      const group = additiveGroups.get(ing.additiveFunction) || [];
      group.push(ing);
      additiveGroups.set(ing.additiveFunction, group);
    } else {
      result.push(ing);
    }
  }

  // Add grouped additives with combined weights
  for (const [func, additives] of additiveGroups.entries()) {
    const totalWeight = additives.reduce((sum, a) => sum + a.weight, 0);
    const names = additives.map(a => a.name.replace(new RegExp(`^${func}\\s*[:\\s]*`, 'i'), ''));
    
    result.push({
      name: `${func} : ${names.join(', ')}`,
      weight: totalWeight,
      isAllergen: additives.some(a => a.isAllergen),
      allergenNames: [...new Set(additives.flatMap(a => a.allergenNames))],
      isAdditive: true,
      additiveFunction: func,
    });
  }

  return result;
}

/**
 * Format allergens in text with bold
 */
function formatWithAllergens(
  ingredient: FlatIngredient,
  allAllergens: string[],
  format: 'markdown' | 'html'
): string {
  let text = ingredient.name;
  const allAllergensList = [...new Set([...allAllergens, ...COMMON_ALLERGENS])];

  if (ingredient.isAllergen) {
    // Try to find and highlight specific allergens in the text
    for (const allergen of allAllergensList) {
      const regex = new RegExp(`\\b(${escapeRegex(allergen)})\\b`, 'gi');
      if (regex.test(text)) {
        if (format === 'html') {
          text = text.replace(regex, '<strong>$1</strong>');
        } else {
          text = text.replace(regex, '**$1**');
        }
      }
    }

    // If no allergen was found in text but ingredient is flagged, bold the whole thing
    if (format === 'markdown' && !text.includes('**') && ingredient.allergenNames.length > 0) {
      text = `**${text}**`;
    } else if (format === 'html' && !text.includes('<strong>') && ingredient.allergenNames.length > 0) {
      text = `<strong>${text}</strong>`;
    }
  }

  return text;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
      let text = ing.name;
      
      // Add composition in parentheses if exists
      if (ing.composition && ing.composition.trim() !== '') {
        text += ` (${ing.composition})`;
      }
      
      // Highlight allergens in UPPERCASE
      allAllergens.forEach((allergen) => {
        const regex = new RegExp(`\\b${escapeRegex(allergen)}\\b`, 'gi');
        text = text.replace(regex, allergen.toUpperCase());
      });
      
      return text;
    })
    .join(', ') + '.';
}

/**
 * Generate the CONDENSED (INCO) ingredient list for labels
 * - Decomposes compound ingredients completely
 * - Never shows intermediate material names
 * - Removes duplicates
 * - Groups additives by function
 * - Orders by actual weight in finished product
 * - Highlights allergens in bold
 */
function generateCondensedList(
  ingredients: IngredientInput[],
  allAllergens: string[],
  format: 'markdown' | 'html' = 'markdown'
): string {
  // Step 1: Flatten all ingredients to their base components
  const flat = flattenIngredients(ingredients, allAllergens);
  
  // Step 2: Merge duplicates
  const merged = mergeAndDeduplicate(flat);
  
  // Step 3: Group additives by function (optional, can be disabled)
  const grouped = groupAdditivesByFunction(merged);
  
  // Step 4: Sort by weight descending
  const sorted = grouped.sort((a, b) => b.weight - a.weight);
  
  // Step 5: Format with allergen highlighting
  const formatted = sorted.map(ing => formatWithAllergens(ing, allAllergens, format));
  
  return formatted.join(', ') + '.';
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
