import { fillZplTemplate, DEFAULT_PRODUCT_LABEL_ZPL } from '@/lib/zplLabelGenerator';
import type { PrintProduct } from '@/hooks/usePrintLabels';

const PACK_COUNT_MAP: Record<string, number> = { U01: 1, C4: 4, C05: 5, C18: 18, C24: 24, PAL: 1 };

function extractTraces(statement: string | null | undefined): string {
  if (!statement) return '';
  const m = statement.match(/traces?\s*(?:de|d['']|éventuelles?\s*de)?\s*[:\-]\s*(.+)$/i);
  return m ? m[1].trim().replace(/[.\s]+$/, '') : '';
}

export interface BuildProductZplInput {
  product: PrintProduct;
  lot: string;
  ddm: string;
  quantity: number;
}

/**
 * Génère le ZPL prêt à imprimer pour un article ERP donné, à partir
 * de son lot/DDM/quantité. Réutilise exactement la logique de PrintLabels.
 */
export function buildProductZpl({ product, lot, ddm, quantity }: BuildProductZplInput): string {
  const packQty = PACK_COUNT_MAP[product.packaging] ?? 1;
  const totalNetWeight = product.net_weight != null ? product.net_weight * packQty : null;

  const tracesFromStatement = extractTraces(product.allergen_statement);
  const traces = product.traces_statement || tracesFromStatement;

  const unitW = product.net_weight ?? 0;
  const unitU = product.net_weight_unit || 'kg';
  const fmtUnit = (w: number, u: string) =>
    u === 'kg' && w < 1 ? `${Math.round(w * 1000)}g` : `${w}${u}`;
  const stripWeight = (n: string) =>
    n.replace(/\s*\d+(?:[.,]\d+)?\s*(?:g|kg|gr|grammes?)\s*$/i, '').trim();
  const baseN = stripWeight(product.product_name || product.erp_label);
  const designationFull = unitW
    ? (packQty > 1
        ? `${baseN} ${packQty}x${fmtUnit(unitW, unitU)}`
        : `${baseN} ${fmtUnit(unitW, unitU)}`)
    : baseN;

  return fillZplTemplate(DEFAULT_PRODUCT_LABEL_ZPL, {
    designation: designationFull,
    barcode: `${(product.erp_code || '').replace(/\D/g, '')}${(lot || '').replace(/\D/g, '')}`,
    netWeight: totalNetWeight,
    netWeightUnit: product.net_weight_unit,
    ingredientsHtml: product.ingredients_html,
    allergens: product.allergen_statement || '',
    traces,
    nutrition: product.nutrition,
    lotNumber: lot,
    ddm,
    quantity: Math.max(1, quantity),
    storageInstructions: product.storage_instructions,
    thawingInstructions: product.thawing_instructions,
  });
}

export function computeFinalSku(product: PrintProduct): string {
  return `${product.sku_base}-${product.temperature}-${product.slicing}-${product.packaging}`;
}
