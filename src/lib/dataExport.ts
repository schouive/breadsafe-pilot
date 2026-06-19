import * as XLSX from 'xlsx';

// Types pour les exports
export interface ExportableTable {
  id: string;
  name: string;
  description: string;
  tableName: string;
  relations?: string[];
}

export interface ExportConfig {
  format: 'csv' | 'json' | 'excel';
  includeHeaders: boolean;
  includeRelations: boolean;
  includeFormulas: boolean;
}

// Liste des tables exportables avec leurs relations
export const EXPORTABLE_TABLES: ExportableTable[] = [
  {
    id: 'suppliers',
    name: 'Fournisseurs',
    description: 'Liste des fournisseurs de matières premières',
    tableName: 'suppliers',
  },
  {
    id: 'raw_materials',
    name: 'Matières premières',
    description: 'Ingrédients avec données nutritionnelles, allergènes et prix',
    tableName: 'raw_materials',
    relations: ['suppliers'],
  },
  {
    id: 'recipes',
    name: 'Recettes',
    description: 'Recettes avec paramètres de calcul (ratios, pertes)',
    tableName: 'recipes',
  },
  {
    id: 'recipe_ingredients',
    name: 'Ingrédients des recettes',
    description: 'Association recettes ↔ matières premières avec pourcentages',
    tableName: 'recipe_ingredients',
    relations: ['recipes', 'raw_materials'],
  },
  {
    id: 'product_sheets',
    name: 'Fiches produits',
    description: 'Fiches techniques avec données INCO',
    tableName: 'product_sheets',
    relations: ['recipes'],
  },
  {
    id: 'label_data',
    name: 'Données étiquettes',
    description: 'Données logistiques pour étiquetage',
    tableName: 'label_data',
    relations: ['recipes'],
  },
  {
    id: 'cold_rooms',
    name: 'Chambres froides',
    description: 'Équipements de stockage avec plages de température',
    tableName: 'cold_rooms',
  },
  {
    id: 'control_records',
    name: 'Enregistrements HACCP',
    description: 'Historique des contrôles avec statuts et mesures',
    tableName: 'control_records',
    relations: ['raw_materials'],
  },
  {
    id: 'storage_temperature_records',
    name: 'Relevés de température',
    description: 'Historique des températures des chambres froides',
    tableName: 'storage_temperature_records',
    relations: ['cold_rooms'],
  },
  {
    id: 'non_conformities',
    name: 'Non-conformités',
    description: 'NC avec actions correctives et préventives',
    tableName: 'non_conformities',
    relations: ['control_records'],
  },
  {
    id: 'audit_logs',
    name: 'Journal d\'audit',
    description: 'Traçabilité des modifications',
    tableName: 'audit_logs',
  },
];

// Documentation des formules de calcul
export const CALCULATION_FORMULAS = {
  baker_percentage: {
    name: 'Pourcentage boulanger',
    formula: '(poids_ingredient / poids_total_farine) × 100',
    description: 'Le pourcentage boulanger exprime le poids de chaque ingrédient par rapport au poids total de farine (100%).',
    example: 'Si 10kg de farine et 6kg d\'eau → % boulanger eau = (6/10) × 100 = 60%',
  },
  quantity_from_percentage: {
    name: 'Quantité depuis pourcentage',
    formula: 'quantite_kg = (pourcentage_boulanger / 100) × poids_farine_kg',
    description: 'Calcul de la quantité d\'un ingrédient à partir de son pourcentage boulanger.',
    example: 'Pour 50kg de farine avec eau à 60% → quantité eau = (60/100) × 50 = 30kg',
  },
  raw_dough_weight: {
    name: 'Poids pâte crue',
    formula: 'poids_pate_crue = poids_farine × (total_pourcentage_boulanger / 100)',
    description: 'Poids total de la pâte avant cuisson.',
    example: 'Pour 10kg farine et total 165% → pâte crue = 10 × (165/100) = 16.5kg',
  },
  cooked_weight: {
    name: 'Poids cuit',
    formula: 'poids_cuit = poids_pate_crue × ratio_cuisson × (1 - pertes_process)',
    description: 'Poids après cuisson, appliquant le ratio de cuisson (perte d\'eau) et les pertes de process.',
    example: 'Pâte 16.5kg, ratio 0.9, pertes 2% → cuit = 16.5 × 0.9 × 0.98 = 14.55kg',
  },
  number_of_pieces: {
    name: 'Nombre de pièces',
    formula: 'nb_pieces = poids_cuit_kg × 1000 / poids_unitaire_g',
    description: 'Nombre de pièces obtenues à partir du poids cuit.',
    example: 'Cuit 14.55kg, pièce 250g → pièces = 14550 / 250 = 58 pièces',
  },
  cost_per_piece: {
    name: 'Coût par pièce',
    formula: 'cout_piece = cout_total_ingredients / nombre_pieces',
    description: 'Coût matière d\'une pièce.',
    example: 'Coût total 45€, 58 pièces → coût/pièce = 45 / 58 = 0.78€',
  },
  nutrition_per_100g: {
    name: 'Nutrition pour 100g produit fini',
    formula: 'valeur_100g = (somme_valeurs_ingredients × 100) / poids_cuit_total_g',
    description: 'Valeurs nutritionnelles rapportées à 100g de produit fini (après cuisson).',
    example: 'Total protéines 1500g pour 14550g cuit → protéines/100g = (1500 × 100) / 14550 = 10.3g',
  },
  price_per_kg: {
    name: 'Prix au kg',
    formula: 'prix_kg = prix_achat / (quantite_achat × facteur_conversion)',
    description: 'Prix de référence en €/kg pour les calculs de coût.',
    conversions: {
      'kg': 1,
      'g': 0.001,
      'L': 'densité kg/L',
      'unité': 'poids_unitaire_kg',
    },
  },
};

// Schéma des relations entre tables
export const TABLE_RELATIONS = {
  description: 'Relations entre les tables de la base de données',
  relations: [
    {
      from: 'raw_materials',
      to: 'suppliers',
      type: 'many-to-one',
      foreignKey: 'supplier_id',
      description: 'Chaque matière première peut avoir un fournisseur',
    },
    {
      from: 'recipe_ingredients',
      to: 'recipes',
      type: 'many-to-one',
      foreignKey: 'recipe_id',
      description: 'Les ingrédients appartiennent à une recette',
    },
    {
      from: 'recipe_ingredients',
      to: 'raw_materials',
      type: 'many-to-one',
      foreignKey: 'raw_material_id',
      description: 'Un ingrédient de recette référence une matière première',
    },
    {
      from: 'recipe_ingredients',
      to: 'recipes',
      type: 'many-to-one',
      foreignKey: 'ingredient_recipe_id',
      description: 'Un ingrédient peut être un produit intermédiaire (autre recette)',
    },
    {
      from: 'product_sheets',
      to: 'recipes',
      type: 'many-to-one',
      foreignKey: 'recipe_id',
      description: 'Une fiche produit est liée à une recette',
    },
    {
      from: 'carton_labels',
      to: 'product_sheets',
      type: 'many-to-one',
      foreignKey: 'product_sheet_id',
      description: 'Une étiquette est liée à une fiche produit',
    },
    {
      from: 'label_data',
      to: 'recipes',
      type: 'one-to-one',
      foreignKey: 'recipe_id',
      description: 'Données d\'étiquetage liées à une recette',
    },
    {
      from: 'storage_temperature_records',
      to: 'cold_rooms',
      type: 'many-to-one',
      foreignKey: 'cold_room_id',
      description: 'Les relevés de température sont liés à une chambre froide',
    },
    {
      from: 'control_records',
      to: 'raw_materials',
      type: 'many-to-one',
      foreignKey: 'raw_material_id',
      description: 'Un contrôle peut concerner une matière première',
    },
    {
      from: 'non_conformities',
      to: 'control_records',
      type: 'many-to-one',
      foreignKey: 'control_record_id',
      description: 'Une NC est liée à un enregistrement de contrôle',
    },
  ],
};

// Fonction pour convertir les données en CSV
export function convertToCSV(data: Record<string, unknown>[], includeHeaders = true): string {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const rows: string[] = [];
  
  if (includeHeaders) {
    rows.push(headers.join(';'));
  }
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
      if (typeof value === 'string' && (value.includes(';') || value.includes('\n') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return String(value);
    });
    rows.push(values.join(';'));
  }
  
  return rows.join('\n');
}

// Fonction pour convertir les données en JSON formaté
export function convertToJSON(data: Record<string, unknown>[], tableName: string): string {
  const exportData = {
    tableName,
    exportDate: new Date().toISOString(),
    recordCount: data.length,
    data,
  };
  return JSON.stringify(exportData, null, 2);
}

// Fonction pour créer un fichier Excel
export function createExcelWorkbook(
  tables: { name: string; data: Record<string, unknown>[] }[]
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  
  for (const table of tables) {
    if (table.data.length > 0) {
      const worksheet = XLSX.utils.json_to_sheet(table.data);
      XLSX.utils.book_append_sheet(workbook, worksheet, table.name.substring(0, 31));
    }
  }
  
  // Ajouter une feuille de documentation
  const docData = [
    { Section: 'DOCUMENTATION DES FORMULES DE CALCUL', Description: '' },
    { Section: '', Description: '' },
    ...Object.values(CALCULATION_FORMULAS).map(f => ({
      Section: f.name,
      Description: `${f.formula} - ${f.description}`,
    })),
    { Section: '', Description: '' },
    { Section: 'RELATIONS ENTRE TABLES', Description: '' },
    ...TABLE_RELATIONS.relations.map(r => ({
      Section: `${r.from} → ${r.to}`,
      Description: `${r.type} via ${r.foreignKey}: ${r.description}`,
    })),
  ];
  const docSheet = XLSX.utils.json_to_sheet(docData);
  XLSX.utils.book_append_sheet(workbook, docSheet, 'Documentation');
  
  return workbook;
}

// Fonction pour télécharger un fichier
export function downloadFile(content: string | ArrayBuffer, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Fonction pour télécharger un Excel
export function downloadExcel(workbook: XLSX.WorkBook, filename: string): void {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  downloadFile(excelBuffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

// Générer la documentation des formules en format texte
export function generateFormulasDocumentation(): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════════',
    '              DOCUMENTATION DES FORMULES DE CALCUL',
    '                        Application BreadSafe',
    '═══════════════════════════════════════════════════════════════════',
    '',
    `Date d'export: ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`,
    '',
    '───────────────────────────────────────────────────────────────────',
    '                         FORMULES DE CALCUL',
    '───────────────────────────────────────────────────────────────────',
    '',
  ];

  for (const [key, formula] of Object.entries(CALCULATION_FORMULAS)) {
    lines.push(`■ ${formula.name.toUpperCase()}`);
    lines.push(`  Formule: ${formula.formula}`);
    lines.push(`  Description: ${formula.description}`);
    if ('example' in formula && formula.example) {
      lines.push(`  Exemple: ${formula.example}`);
    }
    if ('conversions' in formula && formula.conversions) {
      lines.push(`  Conversions: ${JSON.stringify(formula.conversions, null, 2).replace(/\n/g, '\n  ')}`);
    }
    lines.push('');
  }

  lines.push('───────────────────────────────────────────────────────────────────');
  lines.push('                      RELATIONS ENTRE TABLES');
  lines.push('───────────────────────────────────────────────────────────────────');
  lines.push('');

  for (const relation of TABLE_RELATIONS.relations) {
    lines.push(`● ${relation.from} → ${relation.to}`);
    lines.push(`  Type: ${relation.type}`);
    lines.push(`  Clé étrangère: ${relation.foreignKey}`);
    lines.push(`  Description: ${relation.description}`);
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════════════');
  lines.push('                        FIN DE DOCUMENTATION');
  lines.push('═══════════════════════════════════════════════════════════════════');

  return lines.join('\n');
}
