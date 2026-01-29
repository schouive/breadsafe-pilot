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
 * - Raw materials: use their inco_name if available, otherwise name
 * - Intermediate products (PI):
 *   - If mode is 'simple': show the PI's inco_name (generic name)
 *   - If mode is 'detailed': decompose into component raw materials
 * - Deduplicate ingredients across direct ingredients and PI components
 * - Aggregate quantities for duplicate ingredients
 * - Order by descending final quantity (after aggregation)
 * - PRIMARY allergens: bold only, no uppercase
 * - For wheat flour: add (**gluten**) in bold
 * - Never show internal technical names of PIs
 * - Never show technological enzymes
 * - Never show both additive name AND E-code for same additive
 */

export interface IngredientInput {
  name: string;
  incoName?: string | null;
  composition: string | null;
  bakerPercentage: number;
  allergens: string[];       // Primary allergens
  allergensSecondary?: string[]; // Secondary allergens (from composition)
  type?: string; // 'farine' or 'ingredient'
  // For intermediate products
  isIntermediateProduct?: boolean;
  incoDeclarationMode?: 'simple' | 'detailed';
  piIncoName?: string | null; // The inco_name of the PI (for simple mode)
  piIngredients?: IngredientInput[]; // The ingredients of the PI (for detailed mode)
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
  canonicalKey?: string;         // Canonical key for deduplication
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
  'rhéol', 'rheol',
  'liquishort',
  'proson',
  'soft r',
  'chrono',
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
const ADDITIVE_FUNCTIONS: { pattern: RegExp; function: string }[] = [
  { pattern: /émulsifiant|emulsifiant/i, function: 'émulsifiant' },
  { pattern: /conservateur/i, function: 'conservateur' },
  { pattern: /antioxydant/i, function: 'antioxydant' },
  { pattern: /colorant/i, function: 'colorant' },
  { pattern: /épaississant|epaississant/i, function: 'épaississant' },
  { pattern: /stabilisant/i, function: 'stabilisant' },
  { pattern: /acidifiant/i, function: 'acidifiant' },
  { pattern: /agent de traitement de la farine/i, function: 'agent de traitement de la farine' },
  { pattern: /anti-agglomérant|antiagglomerant|anti-mottant/i, function: 'anti-agglomérant' },
  { pattern: /arôme|arome/i, function: 'arôme' },
  { pattern: /exhausteur de goût|exhausteur/i, function: 'exhausteur de goût' },
  { pattern: /poudre à lever|poudre levante|levure chimique/i, function: 'poudre à lever' },
];

// Canonical additive names mapping (all forms -> single canonical name)
const ADDITIVE_CANONICAL_NAMES: Record<string, { canonical: string; function: string }> = {
  // E471 variants
  'e471': { canonical: 'mono et diglycérides d\'acides gras', function: 'émulsifiant' },
  'mono et diglycéride d\'acides gras': { canonical: 'mono et diglycérides d\'acides gras', function: 'émulsifiant' },
  'mono et diglycérides d\'acides gras': { canonical: 'mono et diglycérides d\'acides gras', function: 'émulsifiant' },
  'mono- et diglycérides d\'acides gras': { canonical: 'mono et diglycérides d\'acides gras', function: 'émulsifiant' },
  // E472e
  'e472e': { canonical: 'esters mono- et diacétyltartriques', function: 'émulsifiant' },
  // E322
  'e322': { canonical: 'lécithine', function: 'émulsifiant' },
  'lécithine': { canonical: 'lécithine', function: 'émulsifiant' },
  'lecithine': { canonical: 'lécithine', function: 'émulsifiant' },
  'lécithine de soja': { canonical: 'lécithine de soja', function: 'émulsifiant' },
  // E300
  'e300': { canonical: 'acide ascorbique', function: 'agent de traitement de la farine' },
  'acide ascorbique': { canonical: 'acide ascorbique', function: 'agent de traitement de la farine' },
  // E282
  'e282': { canonical: 'propionate de calcium', function: 'conservateur' },
  'propionate de calcium': { canonical: 'propionate de calcium', function: 'conservateur' },
  // E200
  'e200': { canonical: 'acide sorbique', function: 'conservateur' },
  // E202
  'e202': { canonical: 'sorbate de potassium', function: 'conservateur' },
  // E270
  'e270': { canonical: 'acide lactique', function: 'acidifiant' },
  // E330
  'e330': { canonical: 'acide citrique', function: 'acidifiant' },
  'acide citrique': { canonical: 'acide citrique', function: 'acidifiant' },
  // E100/Curcuma
  'e100': { canonical: 'curcumine', function: 'colorant' },
  'curcumine': { canonical: 'curcumine', function: 'colorant' },
  'curcuma': { canonical: 'curcuma', function: 'colorant' },
  // E160a
  'e160a': { canonical: 'carotènes', function: 'colorant' },
  // E551
  'e551': { canonical: 'dioxyde de silicium', function: 'anti-agglomérant' },
  // E412
  'e412': { canonical: 'gomme de guar', function: 'épaississant' },
  // E415
  'e415': { canonical: 'gomme xanthane', function: 'épaississant' },
};

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
 * Normalize text for comparison
 */
function normalizeText(text: string): string {
  return text
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
}

/**
 * Get canonical additive info if this is a known additive
 */
function getCanonicalAdditive(name: string): { canonical: string; function: string } | null {
  const normalized = normalizeText(name);
  
  // Check for E-code first
  const eCode = extractECode(name);
  if (eCode && ADDITIVE_CANONICAL_NAMES[eCode]) {
    return ADDITIVE_CANONICAL_NAMES[eCode];
  }
  
  // Check against known additive names
  for (const [key, value] of Object.entries(ADDITIVE_CANONICAL_NAMES)) {
    if (normalized.includes(normalizeText(key))) {
      return value;
    }
  }
  
  return null;
}

/**
 * Parse additive from text like "émulsifiant (E471)" or "émulsifiant : mono et diglycéride"
 */
function parseAdditiveText(text: string): { isAdditive: boolean; function?: string; canonicalName?: string; canonicalKey?: string } {
  const lowerText = text.toLowerCase().trim();
  
  // Check if it's a known additive
  const canonical = getCanonicalAdditive(text);
  if (canonical) {
    return {
      isAdditive: true,
      function: canonical.function,
      canonicalName: canonical.canonical,
      canonicalKey: normalizeText(canonical.canonical),
    };
  }
  
  // Check for additive function patterns like "émulsifiant (E471)" or "émulsifiant : name"
  for (const { pattern, function: func } of ADDITIVE_FUNCTIONS) {
    if (pattern.test(text)) {
      // Extract what comes after the function
      let cleanName = text
        .replace(pattern, '')
        .replace(/^[\s:,()]+|[\s:,()]+$/g, '')
        .trim();
      
      // Remove E-code parentheses like "(E471)" or "(E471 (colza))"
      cleanName = cleanName.replace(/^\(E\d{3,4}[a-z]?(\s*\([^)]*\))?\)$/i, '').trim();
      
      // If we have an E-code, look it up
      const eCode = extractECode(text);
      if (eCode && ADDITIVE_CANONICAL_NAMES[eCode]) {
        const canonicalInfo = ADDITIVE_CANONICAL_NAMES[eCode];
        return {
          isAdditive: true,
          function: canonicalInfo.function,
          canonicalName: canonicalInfo.canonical,
          canonicalKey: normalizeText(canonicalInfo.canonical),
        };
      }
      
      // Check if the clean name is a known additive
      const cleanCanonical = getCanonicalAdditive(cleanName);
      if (cleanCanonical) {
        return {
          isAdditive: true,
          function: cleanCanonical.function,
          canonicalName: cleanCanonical.canonical,
          canonicalKey: normalizeText(cleanCanonical.canonical),
        };
      }
      
      // Use the function and whatever name we extracted
      if (cleanName) {
        return {
          isAdditive: true,
          function: func,
          canonicalName: cleanName,
          canonicalKey: normalizeText(cleanName),
        };
      }
    }
  }
  
  // Not an additive
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
      const [, mainName, nestedContent] = nestedMatch;
      
      // Check if this is an additive with E-code in parentheses
      const additiveInfo = parseAdditiveText(part);
      if (additiveInfo.isAdditive) {
        results.push({
          name: additiveInfo.canonicalName || mainName,
          weight,
          isPrimaryAllergen: false,
          isSecondaryAllergen: false,
          allergenNames: [],
          isAdditive: true,
          additiveFunction: additiveInfo.function,
          additiveName: additiveInfo.canonicalName,
          canonicalKey: additiveInfo.canonicalKey,
          isFromPrimaryIngredient: false,
        });
        continue;
      }
      
      // If the main name is an intermediate material, decompose
      if (isIntermediateMaterial(mainName)) {
        const subIngredients = parseComposition(nestedContent, weight, parentAllergens);
        results.push(...subIngredients);
      } else if (nestedContent.includes(',')) {
        // Multiple sub-ingredients, decompose
        const subIngredients = parseComposition(nestedContent, weight, parentAllergens);
        results.push(...subIngredients);
      } else {
        // Single item in parentheses - just use the main name
        const { isAllergen, foundAllergens } = containsAllergen(part, parentAllergens);
        results.push({
          name: cleanIngredientName(mainName),
          weight,
          isPrimaryAllergen: false,
          isSecondaryAllergen: isAllergen,
          allergenNames: foundAllergens,
          isAdditive: false,
          canonicalKey: normalizeText(mainName),
          isFromPrimaryIngredient: false,
        });
      }
    } else {
      // Simple ingredient or additive
      const additiveInfo = parseAdditiveText(part);
      
      if (additiveInfo.isAdditive) {
        results.push({
          name: additiveInfo.canonicalName || part,
          weight,
          isPrimaryAllergen: false,
          isSecondaryAllergen: false,
          allergenNames: [],
          isAdditive: true,
          additiveFunction: additiveInfo.function,
          additiveName: additiveInfo.canonicalName,
          canonicalKey: additiveInfo.canonicalKey,
          isFromPrimaryIngredient: false,
        });
      } else {
        const { isAllergen, foundAllergens } = containsAllergen(part, parentAllergens);
        const cleanedName = cleanIngredientName(part);
        
        results.push({
          name: cleanedName,
          weight,
          isPrimaryAllergen: false,
          isSecondaryAllergen: isAllergen,
          allergenNames: foundAllergens,
          isAdditive: false,
          canonicalKey: normalizeText(cleanedName),
          isFromPrimaryIngredient: false,
        });
      }
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
  // Remove E-code parentheses
  cleaned = cleaned.replace(/\s*\(E\s*\d{3,4}[a-z]?(\s*\([^)]*\))?\)/gi, '');
  return cleaned;
}

/**
 * Get the display name for an ingredient (use incoName if available)
 */
function getDisplayName(ing: IngredientInput): string {
  // For intermediate products in simple mode, use the PI's inco_name
  if (ing.isIntermediateProduct && ing.incoDeclarationMode === 'simple' && ing.piIncoName) {
    return ing.piIncoName;
  }
  // Use inco_name if available, otherwise use the regular name
  return ing.incoName || ing.name;
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
    
    // Handle intermediate products (PI)
    if (ing.isIntermediateProduct) {
      if (ing.incoDeclarationMode === 'simple' && ing.piIncoName) {
        // Simple mode: use the PI's INCO name as a single ingredient
        const { isAllergen, foundAllergens } = containsAllergen(ing.piIncoName, allAllergens);
        flatIngredients.push({
          name: ing.piIncoName,
          weight: ing.bakerPercentage,
          isPrimaryAllergen: false,
          isSecondaryAllergen: isAllergen,
          allergenNames: foundAllergens,
          isAdditive: false,
          canonicalKey: normalizeText(ing.piIncoName),
          isFromPrimaryIngredient: true,
        });
      } else if (ing.incoDeclarationMode === 'detailed' && ing.piIngredients) {
        // Detailed mode: decompose into PI's component ingredients
        for (const piIng of ing.piIngredients) {
          const piWeight = ing.bakerPercentage * (piIng.bakerPercentage / 100);
          const displayName = getDisplayName(piIng);
          
          // Skip enzymes
          if (isEnzymeToExclude(displayName)) {
            continue;
          }
          
          const hasComposition = piIng.composition && piIng.composition.trim() !== '';
          const shouldDecompose = hasComposition && (
            isIntermediateMaterial(piIng.name) || 
            piIng.composition!.includes(',')
          );
          
          if (shouldDecompose) {
            const subIngredients = parseComposition(
              piIng.composition!,
              piWeight,
              [...piIng.allergens, ...allAllergens]
            );
            flatIngredients.push(...subIngredients);
          } else {
            const { isAllergen, foundAllergens } = containsAllergen(displayName, allAllergens);
            const cleanedName = cleanIngredientName(displayName);
            
            flatIngredients.push({
              name: cleanedName,
              weight: piWeight,
              isPrimaryAllergen: piIng.allergens && piIng.allergens.length > 0,
              isSecondaryAllergen: isAllergen && !(piIng.allergens && piIng.allergens.length > 0),
              allergenNames: [...foundAllergens, ...piIng.allergens],
              isAdditive: false,
              canonicalKey: normalizeText(cleanedName),
              isFromPrimaryIngredient: false,
            });
          }
        }
      } else {
        // Fallback: just skip PIs without proper configuration
        console.warn(`PI "${ing.name}" missing incoDeclarationMode or required data`);
      }
      continue;
    }
    
    // Handle regular raw materials
    const displayName = getDisplayName(ing);
    const hasComposition = ing.composition && ing.composition.trim() !== '';
    const shouldDecompose = hasComposition && (
      isIntermediateMaterial(ing.name) || 
      ing.composition!.includes(',')
    );

    // Check if this is a primary allergen (direct ingredient in recipe with allergens)
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
      
      // Simple ingredient with single composition - use composition as name
      const { isAllergen, foundAllergens } = containsAllergen(ing.composition!, allAllergens);
      const cleanedName = cleanIngredientName(ing.composition!);
      
      flatIngredients.push({
        name: cleanedName,
        weight: ing.bakerPercentage,
        isPrimaryAllergen: isPrimaryAllergen,
        isSecondaryAllergen: isAllergen && !isPrimaryAllergen,
        allergenNames: [...foundAllergens, ...ing.allergens],
        isAdditive: false,
        canonicalKey: normalizeText(cleanedName),
        isFromPrimaryIngredient: true,
      });
    } else {
      // Simple ingredient without composition
      const { isAllergen, foundAllergens } = containsAllergen(displayName, allAllergens);
      const cleanedName = cleanIngredientName(displayName);
      
      flatIngredients.push({
        name: cleanedName,
        weight: ing.bakerPercentage,
        isPrimaryAllergen: isPrimaryAllergen,
        isSecondaryAllergen: isAllergen && !isPrimaryAllergen && ing.allergens.length === 0,
        allergenNames: [...foundAllergens, ...ing.allergens],
        isAdditive: false,
        canonicalKey: normalizeText(cleanedName),
        isFromPrimaryIngredient: true,
      });
    }
  }

  return flatIngredients;
}

/**
 * Merge duplicates by canonical key
 */
function mergeAndDeduplicate(ingredients: FlatIngredient[]): FlatIngredient[] {
  const merged = new Map<string, FlatIngredient>();

  for (const ing of ingredients) {
    const key = ing.canonicalKey || normalizeText(ing.name);
    const existing = merged.get(key);

    if (existing) {
      existing.weight += ing.weight;
      // Preserve primary allergen status
      if (ing.isPrimaryAllergen) existing.isPrimaryAllergen = true;
      if (ing.isSecondaryAllergen && !existing.isPrimaryAllergen) existing.isSecondaryAllergen = true;
      existing.allergenNames = [...new Set([...existing.allergenNames, ...ing.allergenNames])];
      if (ing.isFromPrimaryIngredient) existing.isFromPrimaryIngredient = true;
      // Keep the better additive info
      if (ing.isAdditive && !existing.isAdditive) {
        existing.isAdditive = true;
        existing.additiveFunction = ing.additiveFunction;
        existing.additiveName = ing.additiveName;
      }
    } else {
      merged.set(key, { ...ing });
    }
  }

  return Array.from(merged.values());
}

/**
 * Group additives by function for INCO compliance
 * Format: "function : additive1, additive2"
 */
function groupAdditivesByFunction(ingredients: FlatIngredient[]): FlatIngredient[] {
  const result: FlatIngredient[] = [];
  const additiveGroups = new Map<string, FlatIngredient[]>();

  for (const ing of ingredients) {
    if (ing.isAdditive && ing.additiveFunction) {
      const group = additiveGroups.get(ing.additiveFunction) || [];
      group.push(ing);
      additiveGroups.set(ing.additiveFunction, group);
    } else {
      result.push(ing);
    }
  }

  // Create grouped additive entries
  for (const [func, additives] of additiveGroups.entries()) {
    // Deduplicate additive names within the group by canonical key
    const uniqueNames = new Map<string, string>();
    for (const a of additives) {
      const key = a.canonicalKey || normalizeText(a.additiveName || a.name);
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
 * Convert ingredient name to lowercase (INCO standard: no capitals after commas)
 */
function toLowerCaseIngredient(name: string): string {
  return name.toLowerCase();
}

/**
 * Format ingredient with allergen highlighting
 * - PRIMARY allergens: bold only (no uppercase)
 * - SECONDARY allergens: no formatting
 * - For wheat flour: add (**gluten**) in bold
 * - All text in lowercase (INCO standard)
 */
function formatWithAllergens(
  ingredient: FlatIngredient,
  format: 'markdown' | 'html'
): string {
  // Convert to lowercase for INCO compliance
  let text = toLowerCaseIngredient(ingredient.name);

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
  
  // Step 2: Merge duplicates by canonical key
  const merged = mergeAndDeduplicate(flat);
  
  // Step 3: Group additives by function
  const grouped = groupAdditivesByFunction(merged);
  
  // Step 4: Sort by weight descending
  const sorted = grouped.sort((a, b) => b.weight - a.weight);
  
  // Step 5: Format with allergen highlighting (only primary in bold, all lowercase)
  const formatted = sorted.map(ing => formatWithAllergens(ing, format));
  
  // Step 6: Join and capitalize first letter of the list
  let result = formatted.join(', ') + '.';
  
  // Capitalize the first letter (after any HTML/markdown tags)
  if (format === 'html') {
    // Handle <strong> at the start
    result = result.replace(/^(<strong>)?([a-zàâäéèêëïîôùûüç])/i, (match, tag, letter) => 
      (tag || '') + letter.toUpperCase()
    );
  } else {
    // Handle ** at the start for markdown
    result = result.replace(/^(\*\*)?([a-zàâäéèêëïîôùûüç])/i, (match, tag, letter) => 
      (tag || '') + letter.toUpperCase()
    );
  }
  
  return result;
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
 * Utility: Remove markdown bold markers (for plain text contexts)
 * NOTE: This removes bold formatting, use condensedHtml for rich text display
 */
export function markdownToPlainText(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1');
}

/**
 * Utility: Alias for backward compatibility
 * @deprecated Use markdownToPlainText instead
 */
export function markdownToUppercase(text: string): string {
  return markdownToPlainText(text);
}

/**
 * Utility: Convert markdown bold to HTML strong tags
 */
export function markdownToHtml(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
