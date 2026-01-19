import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProductSheet } from '@/hooks/useRecipes';

interface SnapshotNutrition {
  energyKcal: number | null;
  energyKj: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
}

export async function generateTechnicalSheetPDF(sheet: ProductSheet): Promise<void> {
  const doc = new jsPDF();
  const sheetData = sheet as any;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = 20;

  // Brand colors
  const primaryColor = [98, 119, 156] as [number, number, number]; // Slate blue
  const textColor = [30, 41, 59] as [number, number, number];
  const mutedColor = [100, 116, 139] as [number, number, number];

  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('FICHE TECHNIQUE PRODUIT', margin, 18);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(sheetData.product_name || 'Sans nom', margin, 30);
  
  // Version badge
  if (sheetData.version) {
    const versionText = `v${sheetData.version}`;
    const versionWidth = doc.getTextWidth(versionText) + 8;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(pageWidth - margin - versionWidth, 22, versionWidth, 12, 2, 2, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFontSize(10);
    doc.text(versionText, pageWidth - margin - versionWidth + 4, 30);
  }
  
  yPos = 50;
  
  // Product info section
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Identification produit', margin, yPos);
  yPos += 8;

  const productInfo = [
    ['Désignation commerciale', sheetData.product_name || '—'],
    ['Référence produit', sheetData.product_reference || '—'],
    ['Marque', sheetData.brand || '—'],
    ['Code-barres', sheetData.barcode || '—'],
    ['Poids net', sheetData.net_weight ? `${sheetData.net_weight} ${sheetData.net_weight_unit}` : '—'],
    ['Pays d\'origine', sheetData.origin_country || '—'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: productInfo,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60, textColor: mutedColor },
      1: { cellWidth: 'auto', textColor: textColor },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Recipe source
  if (sheetData.snapshot_recipe_name) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...mutedColor);
    doc.text(`Recette source: ${sheetData.snapshot_recipe_name}${sheetData.snapshot_recipe_code ? ` (${sheetData.snapshot_recipe_code})` : ''}`, margin, yPos);
    yPos += 10;
  }

  // Ingredients section
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Liste des ingrédients', margin, yPos);
  yPos += 6;

  if (sheetData.ingredients_declaration) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const ingredientLines = doc.splitTextToSize(sheetData.ingredients_declaration, pageWidth - 2 * margin);
    doc.text(ingredientLines, margin, yPos);
    yPos += ingredientLines.length * 5 + 5;
  }

  // Allergens
  const snapshotAllergens = sheetData.snapshot_allergens as { main?: string[]; secondary?: string[] } | null;
  if (snapshotAllergens) {
    yPos += 5;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Warning color
    doc.text('⚠ Allergènes', margin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (snapshotAllergens.main && snapshotAllergens.main.length > 0) {
      doc.text(`Contient: ${snapshotAllergens.main.map(a => a.toUpperCase()).join(', ')}`, margin, yPos);
      yPos += 5;
    }
    if (snapshotAllergens.secondary && snapshotAllergens.secondary.length > 0) {
      doc.text(`Peut contenir des traces de: ${snapshotAllergens.secondary.join(', ')}`, margin, yPos);
      yPos += 5;
    }
  }

  // Nutrition table
  const snapshotNutrition: SnapshotNutrition | null = sheetData.snapshot_nutrition;
  if (snapshotNutrition) {
    yPos += 10;
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Valeurs nutritionnelles moyennes (pour 100g)', margin, yPos);
    yPos += 5;

    const nutritionData = [
      ['Énergie', `${snapshotNutrition.energyKcal?.toFixed(0) || '—'} kcal / ${snapshotNutrition.energyKj?.toFixed(0) || '—'} kJ`],
      ['Matières grasses', `${snapshotNutrition.fat?.toFixed(1) || '—'} g`],
      ['   dont acides gras saturés', `${snapshotNutrition.saturatedFat?.toFixed(1) || '—'} g`],
      ['Glucides', `${snapshotNutrition.carbohydrates?.toFixed(1) || '—'} g`],
      ['   dont sucres', `${snapshotNutrition.sugars?.toFixed(1) || '—'} g`],
      ['Fibres alimentaires', `${snapshotNutrition.fiber?.toFixed(1) || '—'} g`],
      ['Protéines', `${snapshotNutrition.protein?.toFixed(1) || '—'} g`],
      ['Sel', `${snapshotNutrition.salt?.toFixed(2) || '—'} g`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Nutriment', 'Pour 100g']],
      body: nutritionData,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 40, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      tableWidth: 120,
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Check if we need a new page
  if (yPos > 230) {
    doc.addPage();
    yPos = 20;
  }

  // Logistics section
  doc.setTextColor(...textColor);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Conditionnement & Logistique', margin, yPos);
  yPos += 5;

  const cartonsPerPallet = sheetData.cartons_per_layer && sheetData.layers_per_pallet 
    ? sheetData.cartons_per_layer * sheetData.layers_per_pallet 
    : null;

  const logisticsData = [
    ['Pièces par carton', sheetData.pieces_per_carton?.toString() || '—'],
    ['Cartons par couche', sheetData.cartons_per_layer?.toString() || '—'],
    ['Couches par palette', sheetData.layers_per_pallet?.toString() || '—'],
    ['Cartons par palette', cartonsPerPallet?.toString() || '—'],
    ['Poids du carton', sheetData.carton_weight ? `${sheetData.carton_weight} kg` : '—'],
    ['Dimensions carton', sheetData.carton_dimensions || '—'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: logisticsData,
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60, textColor: mutedColor },
      1: { cellWidth: 'auto', textColor: textColor },
    },
    margin: { left: margin, right: margin },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Conservation section
  if (sheetData.storage_instructions || sheetData.thawing_instructions || sheetData.usage_instructions || sheetData.dlc_ddm_days) {
    doc.setTextColor(...textColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Conservation & Utilisation', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (sheetData.dlc_ddm_days) {
      doc.setFont('helvetica', 'bold');
      doc.text(`${sheetData.dlc_ddm_type || 'DLC'}: ${sheetData.dlc_ddm_days} jours`, margin, yPos);
      doc.setFont('helvetica', 'normal');
      yPos += 6;
    }

    if (sheetData.storage_instructions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Conservation:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const storageLines = doc.splitTextToSize(sheetData.storage_instructions, pageWidth - 2 * margin);
      doc.text(storageLines, margin, yPos);
      yPos += storageLines.length * 5 + 3;
    }

    if (sheetData.thawing_instructions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Décongélation:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const thawingLines = doc.splitTextToSize(sheetData.thawing_instructions, pageWidth - 2 * margin);
      doc.text(thawingLines, margin, yPos);
      yPos += thawingLines.length * 5 + 3;
    }

    if (sheetData.usage_instructions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Mise en œuvre:', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      const usageLines = doc.splitTextToSize(sheetData.usage_instructions, pageWidth - 2 * margin);
      doc.text(usageLines, margin, yPos);
      yPos += usageLines.length * 5 + 3;
    }
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(245, 245, 245);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const dateStr = new Date().toLocaleDateString('fr-FR');
  doc.text(`Document généré le ${dateStr}`, margin, pageHeight - 15);
  
  if (sheetData.snapshot_created_at) {
    doc.text(`Données figées le ${new Date(sheetData.snapshot_created_at).toLocaleDateString('fr-FR')}`, margin, pageHeight - 10);
  }
  
  doc.text(`Version ${sheetData.version || 1}`, pageWidth - margin - 20, pageHeight - 12);

  // Status
  if (sheetData.is_published) {
    doc.setTextColor(22, 163, 74); // Green
    doc.setFont('helvetica', 'bold');
    doc.text('✓ DOCUMENT VALIDÉ', pageWidth / 2, pageHeight - 12, { align: 'center' });
  } else {
    doc.setTextColor(239, 68, 68); // Red
    doc.setFont('helvetica', 'bold');
    doc.text('BROUILLON', pageWidth / 2, pageHeight - 12, { align: 'center' });
  }

  // Save the PDF
  const fileName = `FT_${(sheetData.product_reference || sheetData.product_name || 'produit').replace(/\s+/g, '_')}_v${sheetData.version || 1}.pdf`;
  doc.save(fileName);
}
