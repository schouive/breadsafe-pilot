/**
 * Zebra Label CSV Export Utility
 * 
 * Generates a CSV file compatible with Zebra thermal printers
 * Format: 64x102mm portrait, 3mm margins, ~58x96mm usable area
 * 
 * Features:
 * - Single CSV file for all validated products
 * - UTF-8 encoding without BOM
 * - ASCII only (accents removed)
 * - Smart line wrapping for ingredients and nutrition
 */

import { CartonLabel } from '@/hooks/useCartonLabels';

// Maximum characters per line (optimized for 58mm usable width)
const MAX_LINE_LENGTH = 45;

/**
 * Remove all accents and special characters, keeping ASCII only
 */
export function removeAccents(str: string): string {
  if (!str) return '';
  
  // Normalize to decomposed form and remove diacritical marks
  const normalized = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace specific characters that normalize() doesn't handle
  const replacements: Record<string, string> = {
    '\u0153': 'oe', // œ
    '\u0152': 'OE', // Œ
    '\u00e6': 'ae', // æ
    '\u00c6': 'AE', // Æ
    '\u00df': 'ss', // ß
    '\u20ac': 'EUR', // €
    '\u00b0': ' ', // °
    '\u2013': '-', // –
    '\u2014': '-', // —
    '\u2018': "'", // '
    '\u2019': "'", // '
    '\u201c': '"', // "
    '\u201d': '"', // "
    '\u2026': '...', // …
  };
  
  let result = normalized;
  for (const [char, replacement] of Object.entries(replacements)) {
    result = result.replace(new RegExp(char, 'g'), replacement);
  }
  
  // Remove any remaining non-ASCII characters
  return result.replace(/[^\x00-\x7F]/g, '');
}

/**
 * Split text into balanced lines at natural break points
 * Breaks on commas or spaces, never mid-word
 */
export function splitIntoLines(text: string, maxLength: number = MAX_LINE_LENGTH, maxLines: number = 4): string[] {
  if (!text) return Array(maxLines).fill('');
  
  const cleanText = removeAccents(text.trim());
  const lines: string[] = [];
  let remaining = cleanText;
  
  while (remaining.length > 0 && lines.length < maxLines) {
    if (remaining.length <= maxLength) {
      lines.push(remaining);
      remaining = '';
      break;
    }
    
    // Find the best break point within maxLength
    let breakPoint = -1;
    
    // First, try to break on a comma
    for (let i = maxLength; i >= Math.floor(maxLength * 0.6); i--) {
      if (remaining[i] === ',') {
        breakPoint = i + 1; // Include the comma
        break;
      }
    }
    
    // If no comma found, break on a space
    if (breakPoint === -1) {
      for (let i = maxLength; i >= Math.floor(maxLength * 0.5); i--) {
        if (remaining[i] === ' ') {
          breakPoint = i;
          break;
        }
      }
    }
    
    // If still no break point, force break at maxLength
    if (breakPoint === -1) {
      breakPoint = maxLength;
    }
    
    const line = remaining.substring(0, breakPoint).trim();
    lines.push(line);
    remaining = remaining.substring(breakPoint).trim();
  }
  
  // Pad to maxLines
  while (lines.length < maxLines) {
    lines.push('');
  }
  
  return lines;
}

/**
 * Clean HTML from ingredients text
 */
function cleanHtmlFromIngredients(html: string | null): string {
  if (!html) return '';
  
  return html
    .replace(/<strong>/g, '')
    .replace(/<\/strong>/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Format nutrition data into condensed lines
 */
function formatNutritionLines(nutrition: Record<string, number> | null): string[] {
  if (!nutrition) return ['', '', '', ''];
  
  const energyKj = Math.round(nutrition.per_100g_energy_kj || 0);
  const energyKcal = Math.round(nutrition.per_100g_energy_kcal || 0);
  const fat = (nutrition.per_100g_fat || 0).toFixed(1);
  const saturatedFat = (nutrition.per_100g_saturated_fat || 0).toFixed(1);
  const carbs = (nutrition.per_100g_carbohydrates || 0).toFixed(1);
  const sugars = (nutrition.per_100g_sugars || 0).toFixed(1);
  const fiber = (nutrition.per_100g_fiber || 0).toFixed(1);
  const protein = (nutrition.per_100g_protein || 0).toFixed(1);
  const salt = (nutrition.per_100g_salt || 0).toFixed(2);
  
  // Pre-formatted lines for optimal readability on 64x102mm labels
  const lines = [
    `Energie ${energyKj} kJ / ${energyKcal} kcal`,
    `Lipides ${fat} g dont satures ${saturatedFat} g`,
    `Glucides ${carbs} g dont sucres ${sugars} g`,
    `Fibres ${fiber} g - Proteines ${protein} g - Sel ${salt} g`,
  ];
  
  return lines.map(removeAccents);
}

/**
 * Format net weight as text
 */
function formatNetWeight(weight: number | null, unit: string | null): string {
  if (!weight) return '';
  const formattedUnit = unit || 'kg';
  return `${weight} ${formattedUnit}`;
}

/**
 * Format storage instructions
 */
function formatConservation(storage: string | null, thawing: string | null): string {
  const parts: string[] = [];
  
  if (storage) {
    parts.push(storage);
  }
  
  if (thawing) {
    parts.push(`Decongelation: ${thawing}`);
  }
  
  return removeAccents(parts.join(' | '));
}

/**
 * Escape CSV value (semicolon delimiter)
 */
function escapeCSV(value: string): string {
  if (value.includes(';') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generate a product reference code from the label
 */
function getProductCode(label: CartonLabel): string {
  // Try to get product_reference from product_sheets
  const productSheet = label.product_sheets as { product_reference?: string } | undefined;
  if (productSheet?.product_reference) {
    return removeAccents(productSheet.product_reference);
  }
  
  // Fallback: generate from label title
  return removeAccents(
    label.label_title
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .substring(0, 20)
  );
}

/**
 * Generate CSV row for a single label
 */
function generateLabelRow(label: CartonLabel): string[] {
  const ingredients = cleanHtmlFromIngredients(label.snapshot_ingredients_html);
  const ingredientLines = splitIntoLines(ingredients, MAX_LINE_LENGTH, 4);
  const nutritionLines = formatNutritionLines(label.snapshot_nutrition as Record<string, number> | null);
  
  return [
    getProductCode(label),
    removeAccents(label.label_title),
    ingredientLines[0],
    ingredientLines[1],
    ingredientLines[2],
    ingredientLines[3],
    nutritionLines[0],
    nutritionLines[1],
    nutritionLines[2],
    nutritionLines[3],
    formatNetWeight(label.snapshot_net_weight, label.snapshot_net_weight_unit),
    formatConservation(label.snapshot_storage_instructions, label.snapshot_thawing_instructions),
    'Logo Triman - Sac et carton recyclables',
  ];
}

/**
 * Generate complete CSV content for all validated labels
 */
export function generateZebraCSV(labels: CartonLabel[]): string {
  // Filter only validated labels
  const validatedLabels = labels.filter(label => label.status === 'validated');
  
  if (validatedLabels.length === 0) {
    return '';
  }
  
  // CSV headers
  const headers = [
    'code_produit',
    'nom_produit',
    'ingredients_l1',
    'ingredients_l2',
    'ingredients_l3',
    'ingredients_l4',
    'nutrition_l1',
    'nutrition_l2',
    'nutrition_l3',
    'nutrition_l4',
    'poids_net',
    'mode_conservation',
    'mentions_triman',
  ];
  
  // Generate rows
  const rows = validatedLabels.map(label => generateLabelRow(label).map(escapeCSV).join(';'));
  
  // Combine headers and rows
  return [headers.join(';'), ...rows].join('\n');
}

/**
 * Download the CSV file
 */
export function downloadZebraCSV(labels: CartonLabel[]): { success: boolean; count: number; message: string } {
  const validatedLabels = labels.filter(label => label.status === 'validated');
  
  if (validatedLabels.length === 0) {
    return {
      success: false,
      count: 0,
      message: 'Aucune étiquette validée à exporter',
    };
  }
  
  const csvContent = generateZebraCSV(labels);
  
  // Create blob with UTF-8 encoding (no BOM)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  // Fixed filename as per requirements
  const link = document.createElement('a');
  link.href = url;
  link.download = 'etiquettes_carton.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  return {
    success: true,
    count: validatedLabels.length,
    message: `${validatedLabels.length} étiquette(s) exportée(s)`,
  };
}
