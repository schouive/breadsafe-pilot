import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ProductSheet } from '@/hooks/useRecipes';
import logoImage from '@/assets/logo-breadshop.png';

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

// Helper function to load image as base64 and get its natural dimensions
async function loadImageAsBase64WithDimensions(src: string): Promise<{ base64: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve({
          base64: canvas.toDataURL('image/png'),
          width: img.naturalWidth,
          height: img.naturalHeight
        });
      } else {
        reject(new Error('Could not get canvas context'));
      }
    };
    img.onerror = reject;
    img.src = src;
  });
}

// Get logo as base64 for print (needed because new window can't access bundled imports)
let cachedLogoBase64: string | null = null;
async function getLogoBase64(): Promise<string> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const result = await loadImageAsBase64WithDimensions(logoImage);
    cachedLogoBase64 = result.base64;
    return cachedLogoBase64;
  } catch (e) {
    console.warn('Could not load logo');
    return '';
  }
}

export async function generateTechnicalSheetPDF(sheet: ProductSheet): Promise<void> {
  const doc = new jsPDF();
  const sheetData = sheet as any;
  
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12; // Reduced margins for A4 fit
  let yPos = 8;

  // Brand colors
  const primaryColor = [71, 85, 105] as [number, number, number]; // Slate-600
  const textColor = [30, 41, 59] as [number, number, number];
  const mutedColor = [100, 116, 139] as [number, number, number];

  // ========== COMPACT PROFESSIONAL HEADER ==========
  // Logo positioning (top left, proportional)
  let logoEndX = margin;
  try {
    const logoData = await loadImageAsBase64WithDimensions(logoImage);
    const aspectRatio = logoData.width / logoData.height;
    const logoHeight = 10;
    const logoWidth = logoHeight * aspectRatio;
    doc.addImage(logoData.base64, 'PNG', margin, yPos, logoWidth, logoHeight);
    logoEndX = margin + logoWidth + 4;
  } catch (e) {
    console.warn('Could not load logo for PDF');
  }
  
  // Company name - aligned with logo
  doc.setTextColor(...mutedColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('BREADSHOP SAS', logoEndX, yPos + 5);
  
  // Document type label
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('FICHE TECHNIQUE PRODUIT', logoEndX, yPos + 9);
  
  // Version badge (top right)
  if (sheetData.version) {
    const versionText = `v${sheetData.version}`;
    doc.setFillColor(241, 245, 249);
    doc.setFontSize(8);
    const versionWidth = doc.getTextWidth(versionText) + 8;
    doc.roundedRect(pageWidth - margin - versionWidth, yPos, versionWidth, 10, 1, 1, 'F');
    doc.setTextColor(...mutedColor);
    doc.text(versionText, pageWidth - margin - versionWidth + 4, yPos + 7);
  }
  
  yPos += 14;
  
  // Product name - MOST PROMINENT ELEMENT
  doc.setTextColor(...textColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const productName = sheetData.product_name || 'Sans nom';
  const maxTitleWidth = pageWidth - 2 * margin;
  const truncatedName = doc.getTextWidth(productName) > maxTitleWidth 
    ? productName.substring(0, 45) + '...' 
    : productName;
  doc.text(truncatedName, margin, yPos);
  
  // Separator line
  yPos += 3;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  
  yPos += 6;
  
  // Description section (if present) - compact
  if (sheetData.description) {
    doc.setTextColor(...mutedColor);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    const descriptionLines = doc.splitTextToSize(sheetData.description, pageWidth - 2 * margin);
    const maxDescLines = descriptionLines.slice(0, 2); // Limit to 2 lines
    doc.text(maxDescLines, margin, yPos);
    yPos += maxDescLines.length * 3.5 + 3;
  }
  
  // ========== TWO COLUMN LAYOUT FOR COMPACT FIT ==========
  const colWidth = (pageWidth - 2 * margin - 8) / 2;
  const leftColX = margin;
  const rightColX = margin + colWidth + 8;
  let leftY = yPos;
  let rightY = yPos;

  // LEFT COLUMN: Product Info
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICATION', leftColX, leftY);
  leftY += 4;

  const productInfo = [
    ['Référence', sheetData.product_reference || '—'],
    ['Marque', sheetData.brand || '—'],
    ['Code-barres', sheetData.barcode || '—'],
    ['Poids net', sheetData.net_weight ? `${sheetData.net_weight} ${sheetData.net_weight_unit}` : '—'],
    ['Origine', sheetData.origin_country || '—'],
  ];

  autoTable(doc, {
    startY: leftY,
    head: [],
    body: productInfo,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 28, textColor: mutedColor },
      1: { cellWidth: colWidth - 30, textColor: textColor },
    },
    margin: { left: leftColX, right: pageWidth - leftColX - colWidth },
    tableWidth: colWidth,
  });
  leftY = (doc as any).lastAutoTable.finalY + 3;

  // Recipe source (compact)
  if (sheetData.snapshot_recipe_name) {
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...mutedColor);
    doc.text(`Recette: ${sheetData.snapshot_recipe_name}`, leftColX, leftY);
    leftY += 4;
  }

  // RIGHT COLUMN: Logistics
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('LOGISTIQUE', rightColX, rightY);
  rightY += 4;

  const cartonsPerPallet = sheetData.cartons_per_layer && sheetData.layers_per_pallet 
    ? sheetData.cartons_per_layer * sheetData.layers_per_pallet 
    : null;

  const logisticsData = [
    ['Pièces/carton', sheetData.pieces_per_carton?.toString() || '—'],
    ['Cartons/couche', sheetData.cartons_per_layer?.toString() || '—'],
    ['Couches/palette', sheetData.layers_per_pallet?.toString() || '—'],
    ['Cartons/palette', cartonsPerPallet?.toString() || '—'],
    ['Poids carton', sheetData.carton_weight ? `${sheetData.carton_weight} kg` : '—'],
    ['Dimensions', sheetData.carton_dimensions || '—'],
  ];

  autoTable(doc, {
    startY: rightY,
    head: [],
    body: logisticsData,
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32, textColor: mutedColor },
      1: { cellWidth: colWidth - 34, textColor: textColor },
    },
    margin: { left: rightColX, right: margin },
    tableWidth: colWidth,
  });
  rightY = (doc as any).lastAutoTable.finalY + 3;

  // DLC in logistics column
  if (sheetData.dlc_ddm_days) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(`${sheetData.dlc_ddm_type || 'DLC'}: ${sheetData.dlc_ddm_days} jours`, rightColX, rightY);
    rightY += 4;
  }

  yPos = Math.max(leftY, rightY) + 4;

  // ========== INGREDIENTS SECTION (FULL WIDTH) ==========
  doc.setTextColor(...textColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('INGRÉDIENTS', margin, yPos);
  yPos += 4;

  if (sheetData.ingredients_declaration) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const ingredientsText = sheetData.ingredients_declaration
      .replace(/<strong>([^<]+)<\/strong>/gi, (_: string, content: string) => content.toUpperCase())
      .replace(/<[^>]*>/g, '');
    const ingredientLines = doc.splitTextToSize(ingredientsText, pageWidth - 2 * margin);
    const maxIngLines = ingredientLines.slice(0, 4); // Limit lines
    doc.text(maxIngLines, margin, yPos);
    yPos += maxIngLines.length * 3.5 + 2;
  }

  // Allergens (inline, compact)
  const snapshotAllergens = sheetData.snapshot_allergens as { main?: string[]; secondary?: string[] } | null;
  if (snapshotAllergens && (snapshotAllergens.main?.length || snapshotAllergens.secondary?.length)) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    let allergenText = '⚠ ';
    if (snapshotAllergens.main?.length) {
      allergenText += `Contient: ${snapshotAllergens.main.map(a => a.toUpperCase()).join(', ')}`;
    }
    if (snapshotAllergens.secondary?.length) {
      allergenText += ` | Traces: ${snapshotAllergens.secondary.join(', ')}`;
    }
    const allergenLines = doc.splitTextToSize(allergenText, pageWidth - 2 * margin);
    doc.text(allergenLines.slice(0, 2), margin, yPos);
    yPos += allergenLines.slice(0, 2).length * 3.5 + 3;
  }

  // ========== NUTRITION TABLE (COMPACT) ==========
  const snapshotNutrition: SnapshotNutrition | null = sheetData.snapshot_nutrition;
  if (snapshotNutrition) {
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('VALEURS NUTRITIONNELLES (100g)', margin, yPos);
    yPos += 3;

    const nutritionData = [
      ['Énergie', `${snapshotNutrition.energyKcal?.toFixed(0) || '—'} kcal / ${snapshotNutrition.energyKj?.toFixed(0) || '—'} kJ`],
      ['Matières grasses', `${snapshotNutrition.fat?.toFixed(1) || '—'} g`],
      ['  dont saturés', `${snapshotNutrition.saturatedFat?.toFixed(1) || '—'} g`],
      ['Glucides', `${snapshotNutrition.carbohydrates?.toFixed(1) || '—'} g`],
      ['  dont sucres', `${snapshotNutrition.sugars?.toFixed(1) || '—'} g`],
      ['Fibres', `${snapshotNutrition.fiber?.toFixed(1) || '—'} g`],
      ['Protéines', `${snapshotNutrition.protein?.toFixed(1) || '—'} g`],
      ['Sel', `${snapshotNutrition.salt?.toFixed(2) || '—'} g`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [['Nutriment', 'Pour 100g']],
      body: nutritionData,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 45, halign: 'right' },
      },
      margin: { left: margin, right: margin },
      tableWidth: 95,
    });

    yPos = (doc as any).lastAutoTable.finalY + 4;
  }

  // ========== CONSERVATION SECTION (COMPACT) ==========
  if (sheetData.storage_instructions || sheetData.thawing_instructions || sheetData.usage_instructions) {
    doc.setTextColor(...textColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSERVATION & UTILISATION', margin, yPos);
    yPos += 4;

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');

    const conservationItems: string[] = [];
    if (sheetData.storage_instructions) {
      conservationItems.push(`Conservation: ${sheetData.storage_instructions}`);
    }
    if (sheetData.thawing_instructions) {
      conservationItems.push(`Décongélation: ${sheetData.thawing_instructions}`);
    }
    if (sheetData.usage_instructions) {
      conservationItems.push(`Mise en œuvre: ${sheetData.usage_instructions}`);
    }

    conservationItems.forEach(item => {
      const lines = doc.splitTextToSize(item, pageWidth - 2 * margin);
      doc.text(lines.slice(0, 2), margin, yPos); // Limit to 2 lines per item
      yPos += lines.slice(0, 2).length * 3 + 2;
    });
  }

  // ========== COMPACT FOOTER ==========
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  
  const dateStr = new Date().toLocaleDateString('fr-FR');
  const snapshotDate = sheetData.snapshot_created_at 
    ? new Date(sheetData.snapshot_created_at).toLocaleDateString('fr-FR') 
    : dateStr;
  doc.text(`Généré: ${dateStr} | Données: ${snapshotDate}`, margin, pageHeight - 7);
  
  doc.text(`v${sheetData.version || 1}`, pageWidth - margin - 10, pageHeight - 7);

  // Status
  if (sheetData.is_published) {
    doc.setTextColor(22, 163, 74);
    doc.setFont('helvetica', 'bold');
    doc.text('✓ VALIDÉ', pageWidth / 2, pageHeight - 7, { align: 'center' });
  } else {
    doc.setTextColor(239, 68, 68);
    doc.setFont('helvetica', 'bold');
    doc.text('BROUILLON', pageWidth / 2, pageHeight - 7, { align: 'center' });
  }

  // Save the PDF
  const fileName = `FT_${(sheetData.product_reference || sheetData.product_name || 'produit').replace(/\s+/g, '_')}_v${sheetData.version || 1}.pdf`;
  doc.save(fileName);
}

/**
 * Generate a printable HTML version of the technical sheet
 */
export async function printTechnicalSheet(sheet: any): Promise<void> {
  const sheetData = sheet as any;
  
  // Get logo as base64 for the print window (important: bundled paths don't work in new windows)
  const logoBase64 = await getLogoBase64();
  
  const snapshotAllergens = sheetData.snapshot_allergens as { main?: string[]; secondary?: string[] } | null;
  const snapshotNutrition = sheetData.snapshot_nutrition as SnapshotNutrition | null;
  
  const cartonsPerPallet = sheetData.cartons_per_layer && sheetData.layers_per_pallet 
    ? sheetData.cartons_per_layer * sheetData.layers_per_pallet 
    : null;

  // Convert HTML ingredients to uppercase allergens for print
  const ingredientsText = sheetData.ingredients_declaration
    ? sheetData.ingredients_declaration
        .replace(/<strong>([^<]+)<\/strong>/gi, (_: string, content: string) => `<strong>${content.toUpperCase()}</strong>`)
    : '';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Fiche Technique - ${sheetData.product_name || 'Produit'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { 
      size: A4; 
      margin: 8mm 8mm 10mm 8mm; 
    }
    body { 
      font-family: 'Inter', 'Roboto', 'Open Sans', Arial, sans-serif; 
      font-size: 9pt; 
      color: #1e293b; 
      line-height: 1.3;
      margin: 0;
      padding: 0;
    }
    @media print {
      body { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
    }
    
    /* ========== COMPACT HEADER ========== */
    .header {
      padding: 8px 12px 10px 12px;
      border-bottom: 1.5px solid #e2e8f0;
      margin-bottom: 10px;
    }
    .header-top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .header-identity {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .header-logo { 
      height: 18px; 
      width: auto; 
      object-fit: contain; 
    }
    .header-company {
      display: flex;
      flex-direction: column;
    }
    .company-name { 
      font-size: 10pt; 
      font-weight: 700; 
      color: #475569;
    }
    .document-type { 
      font-size: 7pt; 
      color: #94a3b8;
      text-transform: uppercase;
    }
    .header .version { 
      background: #f1f5f9; 
      color: #64748b; 
      padding: 3px 8px; 
      border-radius: 3px; 
      font-size: 8pt;
      font-weight: 600;
    }
    .product-name { 
      font-size: 18pt; 
      font-weight: 700; 
      color: #0f172a;
      line-height: 1.1;
      margin: 0;
    }
    
    .content { padding: 0 12px; }
    .description { 
      font-style: italic; 
      color: #64748b; 
      margin-bottom: 8px; 
      padding: 6px 8px;
      background: #f8fafc;
      border-left: 2px solid #62779c;
      font-size: 8pt;
    }
    .section { margin-bottom: 8px; }
    .section-title { 
      font-size: 9pt; 
      font-weight: 700; 
      color: #334155; 
      margin-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 2px;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .three-columns { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .info-row { display: flex; font-size: 8pt; line-height: 1.4; }
    .info-label { color: #64748b; width: 90px; flex-shrink: 0; }
    .info-value { font-weight: 500; }
    .recipe-source { font-style: italic; color: #64748b; font-size: 7pt; margin-bottom: 8px; }
    .allergens-box { 
      background: #fef3c7; 
      border: 1px solid #f59e0b; 
      border-radius: 4px; 
      padding: 6px 8px; 
      margin-top: 6px;
      font-size: 8pt;
    }
    .allergens-box strong { color: #b45309; }
    .ingredients { text-align: justify; font-size: 8pt; line-height: 1.4; }
    .ingredients strong { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    table.nutrition { width: 100%; }
    table th { 
      background: #475569; 
      color: white; 
      text-align: left; 
      padding: 4px 6px; 
      font-weight: 600;
      font-size: 7pt;
    }
    table td { 
      padding: 3px 6px; 
      border-bottom: 1px solid #e2e8f0; 
    }
    table tr:nth-child(even) { background: #f8fafc; }
    table td:last-child { text-align: right; }
    .sub-row td:first-child { padding-left: 12px; color: #64748b; font-size: 7pt; }
    .conservation-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 8pt; }
    .conservation-item { line-height: 1.3; }
    .conservation-item strong { font-weight: 600; }
    .footer {
      margin-top: 8px;
      padding: 6px 12px;
      font-size: 7pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
    }
    .status-valid { color: #16a34a; font-weight: bold; }
    .status-draft { color: #ef4444; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top-row">
      <div class="header-identity">
        ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="header-logo" />` : ''}
        <div class="header-company">
          <span class="company-name">BREADSHOP SAS</span>
          <span class="document-type">Fiche technique produit</span>
        </div>
      </div>
      ${sheetData.version ? `<div class="version">v${sheetData.version}</div>` : ''}
    </div>
    <h1 class="product-name">${sheetData.product_name || 'Sans nom'}</h1>
  </div>

  <div class="content">
  ${sheetData.description ? `<div class="description">${sheetData.description}</div>` : ''}

  <div class="three-columns">
    <!-- Column 1: Product Info -->
    <div class="section">
      <div class="section-title">Identification</div>
      <div class="info-row"><span class="info-label">Référence</span><span class="info-value">${sheetData.product_reference || '—'}</span></div>
      <div class="info-row"><span class="info-label">Marque</span><span class="info-value">${sheetData.brand || '—'}</span></div>
      <div class="info-row"><span class="info-label">Code-barres</span><span class="info-value">${sheetData.barcode || '—'}</span></div>
      <div class="info-row"><span class="info-label">Poids net</span><span class="info-value">${sheetData.net_weight ? `${sheetData.net_weight} ${sheetData.net_weight_unit}` : '—'}</span></div>
      <div class="info-row"><span class="info-label">Origine</span><span class="info-value">${sheetData.origin_country || '—'}</span></div>
      ${sheetData.dlc_ddm_days ? `<div class="info-row"><span class="info-label">${sheetData.dlc_ddm_type || 'DLC'}</span><span class="info-value">${sheetData.dlc_ddm_days} jours</span></div>` : ''}
      ${sheetData.snapshot_recipe_name ? `<div class="recipe-source">Recette: ${sheetData.snapshot_recipe_name}</div>` : ''}
    </div>

    <!-- Column 2: Logistics -->
    <div class="section">
      <div class="section-title">Logistique</div>
      <div class="info-row"><span class="info-label">Pièces/carton</span><span class="info-value">${sheetData.pieces_per_carton || '—'}</span></div>
      <div class="info-row"><span class="info-label">Cartons/couche</span><span class="info-value">${sheetData.cartons_per_layer || '—'}</span></div>
      <div class="info-row"><span class="info-label">Couches/palette</span><span class="info-value">${sheetData.layers_per_pallet || '—'}</span></div>
      <div class="info-row"><span class="info-label">Cartons/palette</span><span class="info-value">${cartonsPerPallet || '—'}</span></div>
      <div class="info-row"><span class="info-label">Poids carton</span><span class="info-value">${sheetData.carton_weight ? `${sheetData.carton_weight} kg` : '—'}</span></div>
      <div class="info-row"><span class="info-label">Dimensions</span><span class="info-value">${sheetData.carton_dimensions || '—'}</span></div>
    </div>

    <!-- Column 3: Nutrition -->
    ${snapshotNutrition ? `
    <div class="section">
      <div class="section-title">Nutrition (100g)</div>
      <table class="nutrition">
        <tbody>
          <tr><td>Énergie</td><td>${snapshotNutrition.energyKcal?.toFixed(0) || '—'} kcal</td></tr>
          <tr><td>Matières grasses</td><td>${snapshotNutrition.fat?.toFixed(1) || '—'} g</td></tr>
          <tr class="sub-row"><td>dont saturés</td><td>${snapshotNutrition.saturatedFat?.toFixed(1) || '—'} g</td></tr>
          <tr><td>Glucides</td><td>${snapshotNutrition.carbohydrates?.toFixed(1) || '—'} g</td></tr>
          <tr class="sub-row"><td>dont sucres</td><td>${snapshotNutrition.sugars?.toFixed(1) || '—'} g</td></tr>
          <tr><td>Fibres</td><td>${snapshotNutrition.fiber?.toFixed(1) || '—'} g</td></tr>
          <tr><td>Protéines</td><td>${snapshotNutrition.protein?.toFixed(1) || '—'} g</td></tr>
          <tr><td>Sel</td><td>${snapshotNutrition.salt?.toFixed(2) || '—'} g</td></tr>
        </tbody>
      </table>
    </div>
    ` : '<div></div>'}
  </div>

  <!-- Ingredients Section (Full Width) -->
  <div class="section">
    <div class="section-title">Liste des ingrédients (INCO)</div>
    <div class="ingredients">${ingredientsText || '—'}</div>
    
    ${snapshotAllergens && (snapshotAllergens.main?.length || snapshotAllergens.secondary?.length) ? `
      <div class="allergens-box">
        <strong>⚠ Allergènes:</strong> 
        ${snapshotAllergens.main?.length ? `Contient: ${snapshotAllergens.main.map(a => a.toUpperCase()).join(', ')}` : ''}
        ${snapshotAllergens.secondary?.length ? ` | Traces: ${snapshotAllergens.secondary.join(', ')}` : ''}
      </div>
    ` : ''}
  </div>

  ${sheetData.storage_instructions || sheetData.thawing_instructions || sheetData.usage_instructions ? `
  <div class="section">
    <div class="section-title">Conservation & Utilisation</div>
    <div class="conservation-grid">
      ${sheetData.storage_instructions ? `<div class="conservation-item"><strong>Conservation:</strong> ${sheetData.storage_instructions}</div>` : ''}
      ${sheetData.thawing_instructions ? `<div class="conservation-item"><strong>Décongélation:</strong> ${sheetData.thawing_instructions}</div>` : ''}
      ${sheetData.usage_instructions ? `<div class="conservation-item"><strong>Mise en œuvre:</strong> ${sheetData.usage_instructions}</div>` : ''}
    </div>
  </div>
  ` : ''}

  </div><!-- end content -->

  <div class="footer">
    <span>Généré: ${new Date().toLocaleDateString('fr-FR')}${sheetData.snapshot_created_at ? ` | Données: ${new Date(sheetData.snapshot_created_at).toLocaleDateString('fr-FR')}` : ''}</span>
    <span class="${sheetData.is_published ? 'status-valid' : 'status-draft'}">
      ${sheetData.is_published ? '✓ VALIDÉ' : 'BROUILLON'}
    </span>
    <span>v${sheetData.version || 1}</span>
  </div>
</body>
</html>`;

  // Open print window
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}
