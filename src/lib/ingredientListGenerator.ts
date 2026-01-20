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
 * - PRIMARY allergens (direct recipe ingredients): bold only, no uppercase
 * - SECONDARY allergens (from compositions): no bold, no uppercase
 * - For wheat flour: add (**gluten**) in bold
 * - Never show compound ingredient structure in final INCO list
 * - Never show technological enzymes
 * - Never show both additive name AND E-code for same additive
 */

interface IngredientInput {
  name: string;
  composition: string | null;
  bakerPercentage: number;
  allergens: string[];       // Primary allergens
  allergensSecondary?: string[]; // Secondary allergens (from composition)
  type?: string; // 'farine' or 'ingredient'
}

interface FlatIngredient {
  name: string;
  weight: number;
  isPrimaryAllergen: boolean;    // From direct recipe ingredient
  isSecondaryAllergen: boolean;  // From composition
  allergenNames: string[];
  isAdditive: boolean;
  additiveFunction?: string;
  additiveName?: string;         // Clean name without function prefix
  eCode?: string;                // E-code if detected
  isFromPrimaryIngredient: boolean; // Track if this came from a direct recipe ingredient
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

// Technological enzymes to EXCLUDE from INCO list (processing aids)
const ENZYMES_TO_EXCLUDE = [
  'amylase', 'amylases',
  'alpha-amylase', 'alpha amylase',
  'protéase', 'protease', 'protéases', 'proteases',
  'lipase', 'lipases',
  'xylanase', 'xylanases',
  'glucose oxydase', 'glucose-oxydase',
  'hémicellulase', 'hemicellulase', 'hémicellulases', 'hemicellulases',
  'transglutaminase',
  'maltase',
  'invertase',
  'lactase',
  'pectinase', 'pectinases',
  'cellulase', 'cellulases',
  'enzyme', 'enzymes',
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

// Wheat-related terms that require gluten mention
const WHEAT_TERMS = [
  'blé', 'ble', 'froment', 'farine de blé', 'farine de ble'
];

// Additive functions for INCO grouping
const ADDITIVE_FUNCTIONS: { pattern: RegExp; function: string; priority: number }[] = [
  { pattern: /émulsifiant|emulsifiant/i, function: 'émulsifiant', priority: 1 },
  { pattern: /conservateur/i, function: 'conservateur', priority: 2 },
  { pattern: /antioxydant/i, function: 'antioxydant', priority: 3 },
  { pattern: /colorant/i, function: 'colorant', priority: 4 },
  { pattern: /épaississant|epaississant/i, function: 'épaississant', priority: 5 },
  { pattern: /stabilisant/i, function: 'stabilisant', priority: 6 },
  { pattern: /acidifiant/i, function: 'acidifiant', priority: 7 },
  { pattern: /agent de traitement de la farine/i, function: 'agent de traitement de la farine', priority: 8 },
  { pattern: /anti-agglomérant|antiagglomerant|anti-mottant/i, function: 'anti-agglomérant', priority: 9 },
  { pattern: /arôme|arome/i, function: 'arôme', priority: 10 },
  { pattern: /exhausteur de goût|exhausteur/i, function: 'exhausteur de goût', priority: 11 },
  { pattern: /poudre à lever|poudre levante|levure chimique/i, function: 'poudre à lever', priority: 12 },
];

// E-code to additive name mapping for deduplication
const E_CODE_MAPPING: Record<string, { name: string; function: string }> = {
  'e471': { name: 'mono et diglycérides d\'acides gras', function: 'émulsifiant' },
  'e472e': { name: 'esters mono- et diacétyltartriques', function: 'émulsifiant' },
  'e322': { name: 'lécithine', function: 'émulsifiant' },
  'e300': { name: 'acide ascorbique', function: 'agent de traitement de la farine' },
  'e282': { name: 'propionate de calcium', function: 'conservateur' },
  'e281': { name: 'propionate de sodium', function: 'conservateur' },
  'e200': { name: 'acide sorbique', function: 'conservateur' },
  'e202': { name: 'sorbate de potassium', function: 'conservateur' },
  'e270': { name: 'acide lactique', function: 'acidifiant' },
  'e330': { name: 'acide citrique', function: 'acidifiant' },
  'e500': { name: 'carbonates de sodium', function: 'poudre à lever' },
  'e503': { name: 'carbonates d\'ammonium', function: 'poudre à lever' },
  'e450': { name: 'diphosphates', function: 'poudre à lever' },
  'e341': { name: 'phosphates de calcium', function: 'acidifiant' },
  'e160a': { name: 'carotènes', function: 'colorant' },
  'e160b': { name: 'rocou', function: 'colorant' },
  'e100': { name: 'curcumine', function: 'colorant' },
  'e170': { name: 'carbonate de calcium', function: 'anti-agglomérant' },
  'e551': { name: 'dioxyde de silicium', function: 'anti-agglomérant' },
  'e412': { name: 'gomme de guar', function: 'épaississant' },
  'e415': { name: 'gomme xanthane', function: 'épaississant' },
  'e466': { name: 'carboxyméthylcellulose', function: 'épaississant' },
};

// Reverse mapping: additive names to their E-codes
const ADDITIVE_NAME_TO_E_CODE: Record<string, string> = {};
for (const [eCode, data] of Object.entries(E_CODE_MAPPING)) {
  ADDITIVE_NAME_TO_E_CODE[data.name.toLowerCase()] = eCode;
}

/**
 * Check if an ingredient is an enzyme to exclude
 */
function isEnzymeToExclude(name: string): boolean {
  const lowerName = name.toLowerCase();
  return ENZYMES_TO_EXCLUDE.some(enzyme => lowerName.includes(enzyme));
}

/**
 * Check if an ingredient name is an intermediate material that should be decomposed
 */
function isIntermediateMaterial(name: string): boolean {
  const lowerName = name.toLowerCase();
  return INTERMEDIATE_MATERIALS.some(term => lowerName.includes(term));
}

/**
 * Check if a text contains wheat (for gluten annotation)
 */
function containsWheat(text: string): boolean {
  const lowerText = text.toLowerCase();
  return WHEAT_TERMS.some(term => lowerText.includes(term));
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
 * Extract E-code from text if present
 */
function extractECode(text: string): string | null {
  const match = text.match(/\bE\s*(\d{3,4}[a-z]?)\b/i);
  if (match) {
    return `e${match[1].toLowerCase()}`;
  }
  return null;
}

/**
 * Detect if an ingredient is an additive and get its function
 */
function detectAdditive(name: string): { isAdditive: boolean; function?: string; cleanName?: string; eCode?: string } {
  const lowerName = name.toLowerCase().trim();
  
  // Check for E-code
  const eCode = extractECode(name);
  if (eCode && E_CODE_MAPPING[eCode]) {
    return {
      isAdditive: true,
      function: E_CODE_MAPPING[eCode].function,
      cleanName: E_CODE_MAPPING[eCode].name,
      eCode
    };
  }
  
  // Check for additive function patterns
  for (const { pattern, function: func } of ADDITIVE_FUNCTIONS) {
    if (pattern.test(name)) {
      // Extract the clean name after the function
      const cleanName = name.replace(pattern, '').replace(/^[\s:,]+|[\s:,]+$/g, '').trim();
      return { 
        isAdditive: true, 
        function: func,
        cleanName: cleanName || name,
        eCode: ADDITIVE_NAME_TO_E_CODE[cleanName.toLowerCase()] || undefined
      };
    }
  }
  
  // Check if the name matches a known additive
  for (const [eCode, data] of Object.entries(E_CODE_MAPPING)) {
    if (lowerName.includes(data.name.toLowerCase())) {
      return {
        isAdditive: true,
        function: data.function,
        cleanName: data.name,
        eCode
      };
    }
  }
  
  // Check for standalone E-code patterns
  if (/^E\s*\d{3,4}[a-z]?$/i.test(name.trim())) {
    return { isAdditive: true, function: 'additif', cleanName: name.trim(), eCode: eCode || undefined };
  }
  
  return { isAdditive: false };
}

/**
 * Parse a composition string to extract sub-ingredients
 * All ingredients from composition are marked as secondary (not primary allergens)
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
    
    // Skip enzymes
    if (isEnzymeToExclude(part)) {
      continue;
    }
    
    // Check for nested composition in parentheses: "Ingredient (sub1, sub2)"
    const nestedMatch = part.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (nestedMatch) {
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
      // Simple ingredient from composition = SECONDARY allergen
      const { isAllergen, foundAllergens } = containsAllergen(part, parentAllergens);
      const { isAdditive, function: additiveFunction, cleanName, eCode } = detectAdditive(part);
      
      const ingredientName = cleanIngredientName(isAdditive && cleanName ? cleanName : part);
      
      results.push({
        name: ingredientName,
        weight,
        isPrimaryAllergen: false,  // From composition = always secondary
        isSecondaryAllergen: isAllergen,
        allergenNames: foundAllergens,
        isAdditive,
        additiveFunction,
        additiveName: cleanName,
        eCode,
        isFromPrimaryIngredient: false,
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
  
  const weights: number[] = [];
  let remaining = 1;
  
  for (let i = 0; i < count; i++) {
    const factor = Math.max(0.6 - (i * 0.05), 0.1);
    const weight = i === count - 1 ? remaining : remaining * factor;
    weights.push(weight);
    remaining -= weight;
  }
  
  const sum = weights.reduce((a, b) => a + b, 0);
  return weights.map(w => w / sum);
}

/**
 * Clean ingredient name - remove redundant info
 */
function cleanIngredientName(name: string): string {
  let cleaned = name.trim();
  cleaned = cleaned.replace(/^[,;:\s]+|[,;:\s]+$/g, '');
  // Remove E-code parentheses if name is provided
  cleaned = cleaned.replace(/\s*\(E\s*\d{3,4}[a-z]?\)/gi, '');
  return cleaned;
}

/**
 * Normalize ingredient name for deduplication - aggressive normalization
 */
function normalizeIngredientName(name: string): string {
  let normalized = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[éèêë]/g, 'e')
    .replace(/[àâä]/g, 'a')
    .replace(/[ùûü]/g, 'u')
    .replace(/[îï]/g, 'i')
    .replace(/[ôö]/g, 'o')
    .replace(/[ç]/g, 'c')
    .replace(/['']/g, "'")
    .replace(/[-–—]/g, ' ')
    .replace(/\s+/g, ' ');
    
  // Remove common prefixes/suffixes that don't change meaning
  normalized = normalized.replace(/^(de |du |des |d'|le |la |les |l')/, '');
  
  return normalized;
}

/**
 * Create a canonical key for additive deduplication
 */
function getAdditiveKey(ingredient: FlatIngredient): string {
  if (ingredient.eCode) {
    return ingredient.eCode;
  }
  if (ingredient.additiveName) {
    return normalizeIngredientName(ingredient.additiveName);
  }
  return normalizeIngredientName(ingredient.name);
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
    // Skip enzymes at the top level too
    if (isEnzymeToExclude(ing.name)) {
      continue;
    }
    
    const hasComposition = ing.composition && ing.composition.trim() !== '';
    const shouldDecompose = hasComposition && (
      isIntermediateMaterial(ing.name) || 
      ing.composition!.includes(',')
    );

    // Check if this is a primary allergen (direct ingredient in recipe)
    const isPrimaryAllergen = ing.allergens && ing.allergens.length > 0;

    if (shouldDecompose) {
      // Decompose the ingredient - sub-ingredients are secondary
      const subIngredients = parseComposition(
        ing.composition!,
        ing.bakerPercentage,
        [...ing.allergens, ...allAllergens]
      );
      flatIngredients.push(...subIngredients);
    } else if (hasComposition) {
      // Skip if composition is an enzyme
      if (isEnzymeToExclude(ing.composition!)) {
        continue;
      }
      
      // Simple ingredient with single composition
      const { isAllergen, foundAllergens } = containsAllergen(ing.composition!, allAllergens);
      const { isAdditive, function: additiveFunction, cleanName, eCode } = detectAdditive(ing.composition!);
      
      flatIngredients.push({
        name: cleanIngredientName(isAdditive && cleanName ? cleanName : ing.composition!),
        weight: ing.bakerPercentage,
        isPrimaryAllergen: isPrimaryAllergen,
        isSecondaryAllergen: isAllergen && !isPrimaryAllergen,
        allergenNames: [...foundAllergens, ...ing.allergens],
        isAdditive,
        additiveFunction,
        additiveName: cleanName,
        eCode,
        isFromPrimaryIngredient: true,
      });
    } else {
      // Simple ingredient without composition = PRIMARY if has allergens
      const { isAllergen, foundAllergens } = containsAllergen(ing.name, allAllergens);
      const { isAdditive, function: additiveFunction, cleanName, eCode } = detectAdditive(ing.name);
      
      flatIngredients.push({
        name: cleanIngredientName(isAdditive && cleanName ? cleanName : ing.name),
        weight: ing.bakerPercentage,
        isPrimaryAllergen: isPrimaryAllergen || (isAllergen && ing.allergens.length > 0),
        isSecondaryAllergen: isAllergen && !isPrimaryAllergen,
        allergenNames: [...foundAllergens, ...ing.allergens],
        isAdditive,
        additiveFunction,
        additiveName: cleanName,
        eCode,
        isFromPrimaryIngredient: true,
      });
    }
  }

  return flatIngredients;
}

/**
 * Merge duplicates and group by normalized name
 * Special handling for additives to prevent name/E-code duplicates
 */
function mergeAndDeduplicate(ingredients: FlatIngredient[]): FlatIngredient[] {
  const merged = new Map<string, FlatIngredient>();
  const additivesMerged = new Map<string, FlatIngredient>();

  for (const ing of ingredients) {
    // Handle additives separately to avoid name/E-code duplicates
    if (ing.isAdditive) {
      const key = getAdditiveKey(ing);
      const existing = additivesMerged.get(key);

      if (existing) {
        existing.weight += ing.weight;
        if (ing.isPrimaryAllergen) existing.isPrimaryAllergen = true;
        if (ing.isSecondaryAllergen && !existing.isPrimaryAllergen) existing.isSecondaryAllergen = true;
        existing.allergenNames = [...new Set([...existing.allergenNames, ...ing.allergenNames])];
        if (ing.isFromPrimaryIngredient) existing.isFromPrimaryIngredient = true;
        // Keep the better name (prefer descriptive name over E-code)
        if (ing.additiveName && !existing.additiveName) {
          existing.additiveName = ing.additiveName;
          existing.name = ing.additiveName;
        }
        if (ing.eCode && !existing.eCode) {
          existing.eCode = ing.eCode;
        }
        if (ing.additiveFunction && !existing.additiveFunction) {
          existing.additiveFunction = ing.additiveFunction;
        }
      } else {
        additivesMerged.set(key, { ...ing });
      }
    } else {
      // Regular ingredients
      const key = normalizeIngredientName(ing.name);
      const existing = merged.get(key);

      if (existing) {
        existing.weight += ing.weight;
        if (ing.isPrimaryAllergen) existing.isPrimaryAllergen = true;
        if (ing.isSecondaryAllergen && !existing.isPrimaryAllergen) existing.isSecondaryAllergen = true;
        existing.allergenNames = [...new Set([...existing.allergenNames, ...ing.allergenNames])];
        if (ing.isFromPrimaryIngredient) existing.isFromPrimaryIngredient = true;
      } else {
        merged.set(key, { ...ing });
      }
    }
  }

  // Combine regular and additive ingredients
  return [...Array.from(merged.values()), ...Array.from(additivesMerged.values())];
}

/**
 * Group additives by function for INCO compliance
 * Format: "function : additive1, additive2"
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

  // Create grouped additive entries
  for (const [func, additives] of additiveGroups.entries()) {
    // Deduplicate additive names within the group
    const uniqueNames = new Map<string, string>();
    for (const a of additives) {
      const key = normalizeIngredientName(a.additiveName || a.name);
      if (!uniqueNames.has(key)) {
        uniqueNames.set(key, a.additiveName || a.name);
      }
    }
    
    const totalWeight = additives.reduce((sum, a) => sum + a.weight, 0);
    const names = Array.from(uniqueNames.values());
    
    result.push({
      name: `${func} : ${names.join(', ')}`,
      weight: totalWeight,
      isPrimaryAllergen: additives.some(a => a.isPrimaryAllergen),
      isSecondaryAllergen: additives.some(a => a.isSecondaryAllergen) && !additives.some(a => a.isPrimaryAllergen),
      allergenNames: [...new Set(additives.flatMap(a => a.allergenNames))],
      isAdditive: true,
      additiveFunction: func,
      isFromPrimaryIngredient: additives.some(a => a.isFromPrimaryIngredient),
    });
  }

  return result;
}

/**
 * Format ingredient with allergen highlighting
 * - PRIMARY allergens: bold only (no uppercase)
 * - SECONDARY allergens: no formatting
 * - For wheat flour: add (**gluten**) in bold
 */
function formatWithAllergens(
  ingredient: FlatIngredient,
  format: 'markdown' | 'html'
): string {
  let text = ingredient.name;

  // Only format primary allergens with bold
  if (ingredient.isPrimaryAllergen) {
    const isWheat = containsWheat(text);
    
    if (format === 'html') {
      text = `<strong>${text}</strong>`;
      if (isWheat) {
        text += ' (<strong>gluten</strong>)';
      }
    } else {
      text = `**${text}**`;
      if (isWheat) {
        text += ' (**gluten**)';
      }
    }
  }
  // Secondary allergens: no formatting at all

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
 * Uses uppercase for allergens (internal use only)
 */
function generateTechnicalList(
  ingredients: IngredientInput[],
  allAllergens: string[]
): string {
  const sorted = [...ingredients].sort((a, b) => b.bakerPercentage - a.bakerPercentage);
  
  return sorted
    .map((ing) => {
      let text = ing.name;
      
      if (ing.composition && ing.composition.trim() !== '') {
        text += ` (${ing.composition})`;
      }
      
      // For technical list, use UPPERCASE for allergens (internal only)
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
 * - Excludes technological enzymes
 * - Removes duplicates (including name/E-code duplicates)
 * - Groups additives by function
 * - Orders by actual weight in finished product
 * - PRIMARY allergens: bold only (no uppercase)
 * - SECONDARY allergens: no formatting
 */
function generateCondensedList(
  ingredients: IngredientInput[],
  allAllergens: string[],
  format: 'markdown' | 'html' = 'markdown'
): string {
  // Step 1: Flatten all ingredients to their base components (excludes enzymes)
  const flat = flattenIngredients(ingredients, allAllergens);
  
  // Step 2: Merge duplicates (with special additive handling)
  const merged = mergeAndDeduplicate(flat);
  
  // Step 3: Group additives by function
  const grouped = groupAdditivesByFunction(merged);
  
  // Step 4: Sort by weight descending
  const sorted = grouped.sort((a, b) => b.weight - a.weight);
  
  // Step 5: Format with allergen highlighting (only primary in bold)
  const formatted = sorted.map(ing => formatWithAllergens(ing, format));
  
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
 * Utility: Convert markdown bold to plain text (remove bold markers)
 */
export function markdownToUppercase(text: string): string {
  // Just remove the markdown bold markers, don't add uppercase
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

/**
 * Utility: Convert markdown bold to HTML strong tags
 */
export function markdownToHtml(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
