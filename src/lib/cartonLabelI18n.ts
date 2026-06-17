export type CartonLabelLanguage = 'fr' | 'en' | 'de' | 'es' | 'it';

export const CARTON_LABEL_LANGUAGES: { code: CartonLabelLanguage; label: string; badge: string }[] = [
  { code: 'fr', label: 'Français', badge: 'FR' },
  { code: 'en', label: 'English', badge: 'EN' },
  { code: 'de', label: 'Deutsch', badge: 'DE' },
  { code: 'es', label: 'Español', badge: 'ES' },
  { code: 'it', label: 'Italiano', badge: 'IT' },
];

type Dict = {
  ingredients: string;
  ingredientsCaps: string;
  mayContain: string;
  nutrition100g: string;
  nutritionCaps: string;
  energy: string;
  fat: string;
  saturated: string;
  carbs: string;
  sugars: string;
  fiber: string;
  protein: string;
  salt: string;
  netWeight: string;
  netWeightCaps: string;
  storage: string;
  storageCaps: string;
  thawing: string;
  thawingCaps: string;
  bestBefore: string;
  bestBeforeShort: string;
  barcodeNote: string;
  recyclable: string;
  madeIn: string;
  toComplete: string;
  barcodeToPrint: string;
};

const DICTS: Record<CartonLabelLanguage, Dict> = {
  fr: {
    ingredients: 'Ingrédients',
    ingredientsCaps: 'INGRÉDIENTS',
    mayContain: 'Peut contenir des traces de',
    nutrition100g: 'Valeurs nutritionnelles moyennes pour 100g',
    nutritionCaps: 'VALEURS NUTRITIONNELLES / 100g',
    energy: 'Énergie',
    fat: 'Matières grasses',
    saturated: 'dont acides gras saturés',
    carbs: 'Glucides',
    sugars: 'dont sucres',
    fiber: 'Fibres alimentaires',
    protein: 'Protéines',
    salt: 'Sel',
    netWeight: 'Poids net',
    netWeightCaps: 'POIDS NET',
    storage: 'Conservation',
    storageCaps: 'CONSERVATION',
    thawing: 'Décongélation',
    thawingCaps: 'DÉCONGÉLATION',
    bestBefore: 'À consommer de préférence avant',
    bestBeforeShort: 'DDM',
    barcodeNote: 'Code-barres (à imprimer)',
    recyclable: 'Sac et carton recyclables',
    madeIn: 'BREADSHOP SAS - Fabriqué en France',
    toComplete: '(à compléter)',
    barcodeToPrint: 'Code-barres (à imprimer)',
  },
  en: {
    ingredients: 'Ingredients',
    ingredientsCaps: 'INGREDIENTS',
    mayContain: 'May contain traces of',
    nutrition100g: 'Average nutritional values per 100g',
    nutritionCaps: 'NUTRITION FACTS / 100g',
    energy: 'Energy',
    fat: 'Fat',
    saturated: 'of which saturates',
    carbs: 'Carbohydrate',
    sugars: 'of which sugars',
    fiber: 'Fibre',
    protein: 'Protein',
    salt: 'Salt',
    netWeight: 'Net weight',
    netWeightCaps: 'NET WEIGHT',
    storage: 'Storage',
    storageCaps: 'STORAGE',
    thawing: 'Thawing',
    thawingCaps: 'THAWING',
    bestBefore: 'Best before',
    bestBeforeShort: 'BBD',
    barcodeNote: 'Barcode (to be printed)',
    recyclable: 'Recyclable bag and box',
    madeIn: 'BREADSHOP SAS - Made in France',
    toComplete: '(to be filled)',
    barcodeToPrint: 'Barcode (to be printed)',
  },
  de: {
    ingredients: 'Zutaten',
    ingredientsCaps: 'ZUTATEN',
    mayContain: 'Kann Spuren enthalten von',
    nutrition100g: 'Durchschnittliche Nährwerte pro 100g',
    nutritionCaps: 'NÄHRWERTE / 100g',
    energy: 'Energie',
    fat: 'Fett',
    saturated: 'davon gesättigte Fettsäuren',
    carbs: 'Kohlenhydrate',
    sugars: 'davon Zucker',
    fiber: 'Ballaststoffe',
    protein: 'Eiweiß',
    salt: 'Salz',
    netWeight: 'Nettogewicht',
    netWeightCaps: 'NETTOGEWICHT',
    storage: 'Aufbewahrung',
    storageCaps: 'AUFBEWAHRUNG',
    thawing: 'Auftauen',
    thawingCaps: 'AUFTAUEN',
    bestBefore: 'Mindestens haltbar bis',
    bestBeforeShort: 'MHD',
    barcodeNote: 'Barcode (zu drucken)',
    recyclable: 'Recycelbarer Beutel und Karton',
    madeIn: 'BREADSHOP SAS - Hergestellt in Frankreich',
    toComplete: '(auszufüllen)',
    barcodeToPrint: 'Barcode (zu drucken)',
  },
  es: {
    ingredients: 'Ingredientes',
    ingredientsCaps: 'INGREDIENTES',
    mayContain: 'Puede contener trazas de',
    nutrition100g: 'Valores nutricionales medios por 100g',
    nutritionCaps: 'VALORES NUTRICIONALES / 100g',
    energy: 'Energía',
    fat: 'Grasas',
    saturated: 'de las cuales saturadas',
    carbs: 'Hidratos de carbono',
    sugars: 'de los cuales azúcares',
    fiber: 'Fibra alimentaria',
    protein: 'Proteínas',
    salt: 'Sal',
    netWeight: 'Peso neto',
    netWeightCaps: 'PESO NETO',
    storage: 'Conservación',
    storageCaps: 'CONSERVACIÓN',
    thawing: 'Descongelación',
    thawingCaps: 'DESCONGELACIÓN',
    bestBefore: 'Consumir preferentemente antes de',
    bestBeforeShort: 'CDP',
    barcodeNote: 'Código de barras (a imprimir)',
    recyclable: 'Bolsa y caja reciclables',
    madeIn: 'BREADSHOP SAS - Fabricado en Francia',
    toComplete: '(a completar)',
    barcodeToPrint: 'Código de barras (a imprimir)',
  },
  it: {
    ingredients: 'Ingredienti',
    ingredientsCaps: 'INGREDIENTI',
    mayContain: 'Può contenere tracce di',
    nutrition100g: 'Valori nutrizionali medi per 100g',
    nutritionCaps: 'VALORI NUTRIZIONALI / 100g',
    energy: 'Energia',
    fat: 'Grassi',
    saturated: 'di cui acidi grassi saturi',
    carbs: 'Carboidrati',
    sugars: 'di cui zuccheri',
    fiber: 'Fibre',
    protein: 'Proteine',
    salt: 'Sale',
    netWeight: 'Peso netto',
    netWeightCaps: 'PESO NETTO',
    storage: 'Conservazione',
    storageCaps: 'CONSERVAZIONE',
    thawing: 'Scongelamento',
    thawingCaps: 'SCONGELAMENTO',
    bestBefore: 'Da consumarsi preferibilmente entro',
    bestBeforeShort: 'TMC',
    barcodeNote: 'Codice a barre (da stampare)',
    recyclable: 'Sacchetto e cartone riciclabili',
    madeIn: 'BREADSHOP SAS - Prodotto in Francia',
    toComplete: '(da completare)',
    barcodeToPrint: 'Codice a barre (da stampare)',
  },
};

export function getLabelDict(lang: string | null | undefined): Dict {
  const code = (lang || 'fr') as CartonLabelLanguage;
  return DICTS[code] ?? DICTS.fr;
}

export function getLanguageBadge(lang: string | null | undefined): string {
  const code = (lang || 'fr') as CartonLabelLanguage;
  return CARTON_LABEL_LANGUAGES.find((l) => l.code === code)?.badge ?? code.toUpperCase();
}
