/**
 * Génération du ZPL final pour étiquette produit Zebra (PRODUCT_LABEL).
 *
 * On part d'un template ZPL contenant des placeholders `{{KEY}}` et on les
 * remplace par les vraies données issues de la fiche technique + saisie opérateur.
 *
 * Champs variables :
 *  - {{DESIGNATION}}        : libellé carton (erp_label / product_name + format)
 *  - {{BARCODE}}            : EAN/code-barre (chiffres uniquement)
 *  - {{POIDS_NET}}          : ex "2.46 kg"
 *  - {{INGR_L1..L4}}        : ingrédients INCO (4 lignes max ~42 car.)
 *  - {{ALLERGENES}}         : allergènes présents
 *  - {{TRACES}}              : traces
 *  - {{NUTRI_L1..L4}}       : 4 lignes nutrition / 100g
 *  - {{LOT}}                : numéro de lot (sans le "L" de préfixe — le L est dessiné séparément)
 *  - {{DDM_J}}              : jour de l'année de la DDM (3 chiffres)
 *  - {{DDM_YY}}             : 2 derniers chiffres de l'année de la DDM
 *  - {{QTY}}                : quantité (^PQ)
 */

import { removeAccents, splitIntoLines } from './zebraLabelExport';

export interface ZplLabelData {
  designation: string;
  barcode: string | null;
  netWeight: number | null;
  netWeightUnit: string | null;
  ingredientsHtml: string | null;
  allergens: string | null;        // allergènes présents (texte)
  traces: string | null;           // traces (texte)
  nutrition: {
    energyKj?: number; energyKcal?: number;
    fat?: number; saturatedFat?: number;
    carbohydrates?: number; sugars?: number;
    fiber?: number; protein?: number; salt?: number;
  } | null;
  lotNumber: string;               // ex "L00326" (le préfixe L est inclus)
  ddm: string;                     // ISO yyyy-mm-dd
  quantity: number;
  storageInstructions?: string | null;
  thawingInstructions?: string | null;
}

function cleanHtml(html: string | null): string {
  if (!html) return '';
  return html
    // Met les allergènes en MAJUSCULES (équivalent du gras, conforme INCO 1169/2011 pour impression thermique)
    .replace(/<(?:strong|b)\b[^>]*>([\s\S]*?)<\/(?:strong|b)>/gi, (_, inner) => String(inner).toUpperCase())
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeJulianDay(iso: string): { j: string; yy: string } {
  const d = new Date(iso + 'T00:00:00');
  if (isNaN(d.getTime())) return { j: '', yy: '' };
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return {
    j: String(dayOfYear).padStart(3, '0'),
    yy: String(d.getFullYear()).slice(-2),
  };
}

function formatNetWeight(w: number | null, unit: string | null): string {
  if (!w) return '';
  return `${w} ${unit || 'kg'}`;
}

function formatNutrition(n: ZplLabelData['nutrition']): [string, string, string, string] {
  if (!n) return ['', '', '', ''];
  return [
    `Energie ${Math.round(n.energyKj ?? 0)} kJ / ${Math.round(n.energyKcal ?? 0)} kcal`,
    `Lipides ${(n.fat ?? 0).toFixed(1)} g dont satures ${(n.saturatedFat ?? 0).toFixed(1)} g`,
    `Glucides ${(n.carbohydrates ?? 0).toFixed(1)} g dont sucres ${(n.sugars ?? 0).toFixed(1)} g`,
    `Fibres ${(n.fiber ?? 0).toFixed(1)} g - Proteines ${(n.protein ?? 0).toFixed(1)} g - Sel ${(n.salt ?? 0).toFixed(2)} g`,
  ].map(removeAccents) as [string, string, string, string];
}

/**
 * Rotation 90° horaire de la mise en page (coordonnées, rectangles,
 * code-barres) PLUS rotation 180° supplémentaire sur le texte.
 *
 * Demande utilisateur : « les éléments graphiques (lignes, code-barres)
 * tournés 90° sens horaire, et les textes à 180° de plus ».
 *
 * Transformations ZPL (template original 791 x 1205) :
 *  - PW791  ↔ LL1205        (canvas pivote)
 *  - ^FOx,y / ^FTx,y → (H−y, x)   où H = 1205
 *  - ^GBw,h,t → ^GBh,w,t          (rectangles : on échange largeur/hauteur)
 *  - Orientation texte ^A0  : N→B, R→N, I→R, B→I  (90°CW + 180° = 270°CW)
 *  - Orientation code-barres ^BC : N→R, R→I, I→B, B→N (90°CW pur)
 */
function rotateLayout90CwTextFlipped(zpl: string): string {
  const H = 1205;
  const textMap: Record<string, string> = { N: 'B', R: 'N', I: 'R', B: 'I' };
  const graphicMap: Record<string, string> = { N: 'R', R: 'I', I: 'B', B: 'N' };
  let out = zpl;

  // Swap canvas dimensions
  out = out.replace(/\^PW791\b/g, '^PW1205').replace(/\^LL1205\b/g, '^LL791');

  // Rotate field origins / text positions: (x, y) → (H − y, x)
  out = out.replace(/\^FO(\d+),(\d+)/g, (_, x, y) => `^FO${H - parseInt(y, 10)},${x}`);
  out = out.replace(/\^FT(\d+),(\d+)/g, (_, x, y) => `^FT${H - parseInt(y, 10)},${x}`);

  // Rotate rectangles: swap width/height (thickness preserved)
  out = out.replace(/\^GB(\d+),(\d+),(\d+)/g, (_, w, h, t) => `^GB${h},${w},${t}`);

  // Text orientation (90° CW + 180°)
  out = out.replace(/\^A0([NRIB]),/g, (_, o) => `^A0${textMap[o]},`);
  // Barcode orientation (pure 90° CW, follows canvas)
  out = out.replace(/\^BC([NRIB])(,|\^)/g, (_, o, sep) => `^BC${graphicMap[o]}${sep}`);

  return out;
}

/**
 * Remplit le template ZPL avec les données et retourne le ZPL prêt à imprimer.
 * Le template doit utiliser des placeholders au format {{KEY}}.
 */
export function fillZplTemplate(template: string, data: ZplLabelData): string {
  const ingrLines = splitIntoLines(cleanHtml(data.ingredientsHtml), 42, 6);
  const nutri = formatNutrition(data.nutrition);
  const { j, yy } = computeJulianDay(data.ddm);

  const storageText = [data.storageInstructions, data.thawingInstructions]
    .filter(Boolean)
    .join(' — ') || 'A conserver dans le sachet a temperature ambiante de preference inferieure a 30 C';
  const storageLines = splitIntoLines(removeAccents(storageText), 42, 2);

  // Le lot peut être saisi avec ou sans préfixe "L" — on retire le L pour ne pas le doubler
  // (le template dessine déjà un "L" séparé en gros caractères)
  const lotValue = data.lotNumber.replace(/^L/i, '');

  const tracesValue = data.traces
    ? `Traces eventuelles de : ${removeAccents(data.traces)}`
    : '';

  const replacements: Record<string, string> = {
    DESIGNATION: removeAccents(data.designation || ''),
    BARCODE: (data.barcode || '').replace(/\D/g, ''),
    POIDS_NET: removeAccents(formatNetWeight(data.netWeight, data.netWeightUnit)),
    INGR_L1: ingrLines[0] || '',
    INGR_L2: ingrLines[1] || '',
    INGR_L3: ingrLines[2] || '',
    INGR_L4: ingrLines[3] || '',
    INGR_L5: ingrLines[4] || '',
    INGR_L6: ingrLines[5] || '',
    ALLERGENES: '',
    TRACES: tracesValue,
    NUTRI_L1: nutri[0],
    NUTRI_L2: nutri[1],
    NUTRI_L3: nutri[2],
    NUTRI_L4: nutri[3],
    LOT: lotValue,
    DDM_J: j,
    DDM_YY: yy,
    QTY: String(Math.max(1, data.quantity)),
    STORAGE_L1: storageLines[0] || '',
    STORAGE_L2: storageLines[1] || '',
  };

  const filled = template.replace(/\{\{(\w+)\}\}/g, (_, k) => replacements[k] ?? '');
  return rotateTextCcw90(filled);
}

/**
 * Template ZPL par défaut (fallback si la BDD n'en contient pas).
 * Issu du fichier Etiquette2.prn fourni par le client.
 */
export const DEFAULT_PRODUCT_LABEL_ZPL = `CT~~CD,~CC^~CT~
^XA~TA000~JSN^LT0^MNW^MTD^PON^PMN^LH0,0^JMA^PR4,4~SD15^JUS^LRN^CI0^XZ
^XA
^MMT
^PW791
^LL1205
^LS0
^FT84,867^A0B,67,64^FH\\^FD{{DESIGNATION}}^FS
^FO117,27^GB0,1143,12^FS
^FO148,28^GB173,409,12^FS
^FT197,319^A0B,25,24^FH\\^FDPOIDS NET^FS
^BY4,3,134^FT748,399^BCB,,Y,N
^FD>;{{BARCODE}}^FS
^FT210,1193^A0B,38,36^FH\\^FD{{INGR_L1}}^FS
^FT256,1193^A0B,38,38^FH\\^FD{{INGR_L2}}^FS
^FT296,1193^A0B,38,38^FH\\^FD{{INGR_L3}}^FS
^FT342,1193^A0B,38,38^FH\\^FD{{INGR_L4}}^FS
^FT388,1193^A0B,38,38^FH\\^FD{{INGR_L5}}^FS
^FT434,1193^A0B,38,38^FH\\^FD{{INGR_L6}}^FS
^FT480,1193^A0B,38,38^FH\\^FD{{TRACES}}^FS
^FT626,1193^A0B,38,38^FH\\^FD{{NUTRI_L1}}^FS
^FT672,1193^A0B,38,38^FH\\^FD{{NUTRI_L2}}^FS
^FT714,1193^A0B,38,38^FH\\^FD{{NUTRI_L3}}^FS
^FT760,1193^A0B,38,38^FH\\^FD{{NUTRI_L4}}^FS
^FT282,367^A0B,92,84^FH\\^FD{{POIDS_NET}}^FS
^FT501,281^A0B,50,45^FH\\^FD{{DDM_J}}^FS
^FT501,210^A0B,50,50^FH\\^FD{{DDM_YY}}^FS
^FT501,312^A0B,50,50^FH\\^FDL{{LOT}}^FS
^FT166,1193^A0B,38,36^FH\\^FDIngredients :^FS
^FT588,1193^A0B,38,38^FH\\^FDValeurs nutritionnelles pour 100g :^FS
^FT391,408^A0B,38,26^FH\\^FDA consommer de preference^FS
^FT438,408^A0B,38,26^FH\\^FDavant le :^FS
^FT503,408^A0B,46,43^FH\\^FDLot :^FS
^FO338,28^GB195,409,12^FS
^FT562,347^A0B,29,28^FB192,1,0,C^FH\\^FDCarton et sachet^FS
^FT598,347^A0B,29,28^FB192,1,0,C^FH\\^FDrecyclables^FS
^FT488,1193^A0B,38,36^FH\\^FD{{STORAGE_L1}}^FS
^FT534,1193^A0B,38,36^FH\\^FD{{STORAGE_L2}}^FS
^PQ{{QTY}},0,1,Y^XZ`;
