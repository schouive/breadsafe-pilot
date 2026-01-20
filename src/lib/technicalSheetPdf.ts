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
  const margin = 15;
  let yPos = 15;

  // Brand colors - matching print version
  const primaryColor = [71, 85, 105] as [number, number, number]; // Slate 600
  const textColor = [30, 41, 59] as [number, number, number]; // Slate 800
  const mutedColor = [100, 116, 139] as [number, number, number]; // Slate 500
  const lightMutedColor = [148, 163, 184] as [number, number, number]; // Slate 400

  // ========== HEADER - MATCHING PRINT VERSION ==========
  // Logo positioning (left side)
  let logoWidth = 0;
  let logoHeight = 20;
  try {
    const logoData = await loadImageAsBase64WithDimensions(logoImage);
    const aspectRatio = logoData.width / logoData.height;
    logoHeight = 18;
    logoWidth = logoHeight * aspectRatio;
    doc.addImage(logoData.base64, 'PNG', margin, yPos, logoWidth, logoHeight);
  } catch (e) {
    console.warn('Could not load logo for PDF');
  }
  
  // Calculate center position for text (accounting for logo space)
  const textAreaStart = margin + logoWidth + 10;
  const textAreaCenter = textAreaStart + (pageWidth - textAreaStart - margin) / 2;
  
  // Company name - centered
  doc.setTextColor(...mutedColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('BREADSHOP SAS', textAreaCenter, yPos + 6, { align: 'center' });
  
  // Document type label
  doc.setFontSize(7);
  doc.setTextColor(...lightMutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('FICHE TECHNIQUE PRODUIT', textAreaCenter, yPos + 11, { align: 'center' });
  
  // Product name - centered, prominent
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  const productName = sheetData.product_name || 'Sans nom';
  const maxTitleWidth = pageWidth - textAreaStart - margin - 20;
  const truncatedName = doc.getTextWidth(productName) > maxTitleWidth 
    ? productName.substring(0, 35) + '...' 
    : productName;
  doc.text(truncatedName, textAreaCenter, yPos + 22, { align: 'center' });
  
  // Version badge (top right)
  if (sheetData.version) {
    const versionText = `v${sheetData.version}`;
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setFontSize(8);
    const versionWidth = doc.getTextWidth(versionText) + 8;
    doc.roundedRect(pageWidth - margin - versionWidth, yPos, versionWidth, 12, 2, 2, 'F');
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.text(versionText, pageWidth - margin - versionWidth + 4, yPos + 8);
  }
  
  // Header separator line
  yPos += 30;
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;
  
  // Description section (if present)
  if (sheetData.description) {
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(98, 119, 156);
    const descriptionLines = doc.splitTextToSize(sheetData.description, pageWidth - 2 * margin - 10);
    const descHeight = descriptionLines.length * 5 + 8;
    doc.rect(margin, yPos - 2, pageWidth - 2 * margin, descHeight, 'F');
    doc.setLineWidth(1);
    doc.line(margin, yPos - 2, margin, yPos - 2 + descHeight);
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(descriptionLines, margin + 5, yPos + 4);
    yPos += descHeight + 8;
  }
  
  // ========== IDENTIFICATION SECTION ==========
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICATION PRODUIT', margin, yPos);
  yPos += 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, margin + 50, yPos);
  yPos += 6;

  const productInfo = [
    ['Désignation commerciale', sheetData.product_name || '—'],
    ['Référence produit', sheetData.product_reference || '—'],
    ['Marque', sheetData.brand || '—'],
    ['Code-barres', sheetData.barcode || '—'],
    ['Poids net', sheetData.net_weight ? `${sheetData.net_weight} ${sheetData.net_weight_unit}` : '—'],
    ['Pays d\'origine', sheetData.origin_country || '—'],
  ];

  // Two-column layout for product info
  const colWidth = (pageWidth - 2 * margin) / 2;
  doc.setFontSize(9);
  for (let i = 0; i < productInfo.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const xPos = margin + col * colWidth;
    const yOffset = yPos + row * 6;
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text(productInfo[i][0], xPos, yOffset);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(productInfo[i][1], xPos + 45, yOffset);
  }
  yPos += Math.ceil(productInfo.length / 2) * 6 + 8;

  // Recipe source
  if (sheetData.snapshot_recipe_name) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...mutedColor);
    doc.text(`Recette source: ${sheetData.snapshot_recipe_name}${sheetData.snapshot_recipe_code ? ` (${sheetData.snapshot_recipe_code})` : ''}`, margin, yPos);
    yPos += 10;
  }

  // ========== INGREDIENTS SECTION ==========
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('LISTE DES INGRÉDIENTS (INCO)', margin, yPos);
  yPos += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, yPos, margin + 60, yPos);
  yPos += 6;

  if (sheetData.ingredients_declaration) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const ingredientsText = sheetData.ingredients_declaration
      .replace(/<strong>([^<]+)<\/strong>/gi, (match: string, content: string) => content.toUpperCase())
      .replace(/<[^>]*>/g, '');
    const ingredientLines = doc.splitTextToSize(ingredientsText, pageWidth - 2 * margin);
    doc.text(ingredientLines, margin, yPos);
    yPos += ingredientLines.length * 4.5 + 6;
  }

  // Allergens
  const snapshotAllergens = sheetData.snapshot_allergens as { main?: string[]; secondary?: string[] } | null;
  if (snapshotAllergens && (snapshotAllergens.main?.length || snapshotAllergens.secondary?.length)) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(98, 119, 156); // Blue
    doc.text('Allergènes', margin, yPos);
    yPos += 5;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    if (snapshotAllergens.main && snapshotAllergens.main.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Contient: ', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(snapshotAllergens.main.map(a => a.toLowerCase()).join(', '), margin + doc.getTextWidth('Contient: '), yPos);
      yPos += 5;
    }
    if (snapshotAllergens.secondary && snapshotAllergens.secondary.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Peut contenir des traces de: ', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(snapshotAllergens.secondary.map(a => a.toLowerCase()).join(', '), margin + doc.getTextWidth('Peut contenir des traces de: '), yPos);
      yPos += 5;
    }
  }

  yPos += 10;

  // ========== TWO-COLUMN LAYOUT: NUTRITION + LOGISTICS ==========
  const snapshotNutrition: SnapshotNutrition | null = sheetData.snapshot_nutrition;
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 5;
  const savedYPos = yPos;

  // LEFT COLUMN: Nutrition
  if (snapshotNutrition) {
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('VALEURS NUTRITIONNELLES (100G)', leftColX, yPos);
    yPos += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(leftColX, yPos, leftColX + 70, yPos);
    yPos += 4;

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
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35, halign: 'right' },
      },
      margin: { left: leftColX },
      tableWidth: 85,
    });
  }

  // RIGHT COLUMN: Logistics
  yPos = savedYPos;
  doc.setTextColor(...textColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDITIONNEMENT & LOGISTIQUE', rightColX, yPos);
  yPos += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(rightColX, yPos, rightColX + 70, yPos);
  yPos += 6;

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

  doc.setFontSize(9);
  for (const item of logisticsData) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text(item[0], rightColX, yPos);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(item[1], rightColX + 45, yPos);
    yPos += 6;
  }

  // Determine where to continue after two-column section
  const nutritionEndY = snapshotNutrition ? (doc as any).lastAutoTable?.finalY || savedYPos : savedYPos;
  yPos = Math.max(nutritionEndY, yPos) + 12;

  // ========== CONSERVATION SECTION ==========
  if (sheetData.storage_instructions || sheetData.thawing_instructions || sheetData.usage_instructions || sheetData.dlc_ddm_days) {
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSERVATION & UTILISATION', margin, yPos);
    yPos += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos, margin + 60, yPos);
    yPos += 6;

    doc.setFontSize(9);

    if (sheetData.dlc_ddm_days) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text(`${sheetData.dlc_ddm_type || 'DLC'}: ${sheetData.dlc_ddm_days} jours`, margin, yPos);
      yPos += 6;
    }

    if (sheetData.storage_instructions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Conservation: ', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const storageLines = doc.splitTextToSize(sheetData.storage_instructions, pageWidth - 2 * margin - 25);
      doc.text(storageLines, margin + doc.getTextWidth('Conservation: '), yPos);
      yPos += storageLines.length * 4 + 4;
    }

    if (sheetData.thawing_instructions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Décongélation: ', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const thawingLines = doc.splitTextToSize(sheetData.thawing_instructions, pageWidth - 2 * margin - 30);
      doc.text(thawingLines, margin + doc.getTextWidth('Décongélation: '), yPos);
      yPos += thawingLines.length * 4 + 4;
    }

    if (sheetData.usage_instructions) {
      doc.setFont('helvetica', 'bold');
      doc.text('Mise en œuvre: ', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const usageLines = doc.splitTextToSize(sheetData.usage_instructions, pageWidth - 2 * margin - 30);
      doc.text(usageLines, margin + doc.getTextWidth('Mise en œuvre: '), yPos);
      yPos += usageLines.length * 4 + 4;
    }
  }

  // ========== FOOTER ==========
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(0, pageHeight - 22, pageWidth, 22, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(0, pageHeight - 22, pageWidth, pageHeight - 22);
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  
  const dateStr = new Date().toLocaleDateString('fr-FR');
  doc.text(`Document généré le ${dateStr}`, margin, pageHeight - 14);
  
  if (sheetData.snapshot_created_at) {
    doc.text(`Données figées le ${new Date(sheetData.snapshot_created_at).toLocaleDateString('fr-FR')}`, margin, pageHeight - 9);
  }
  
  doc.text(`Version ${sheetData.version || 1}`, pageWidth - margin - 15, pageHeight - 11);

  // Status
  if (sheetData.is_published) {
    doc.setTextColor(22, 163, 74); // Green
    doc.setFont('helvetica', 'bold');
    doc.text('✓ DOCUMENT VALIDÉ', pageWidth / 2, pageHeight - 11, { align: 'center' });
  } else {
    doc.setTextColor(239, 68, 68); // Red
    doc.setFont('helvetica', 'bold');
    doc.text('BROUILLON', pageWidth / 2, pageHeight - 11, { align: 'center' });
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
      margin: 12mm 10mm 15mm 10mm; 
    }
    body { 
      font-family: 'Inter', 'Roboto', 'Open Sans', Arial, sans-serif; 
      font-size: 11pt; 
      color: #1e293b; 
      line-height: 1.4;
      margin: 0;
      padding: 0;
    }
    @media print {
      body { 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
    }
    
    /* ========== PROFESSIONAL HEADER ========== */
    .header {
      padding: 15px 20px 18px 20px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 20px;
      position: relative;
    }
    .header-logo { 
      height: 50px; 
      width: auto; 
      object-fit: contain;
      flex-shrink: 0;
    }
    .header-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }
    .header-company {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 8px;
    }
    .company-name { 
      font-size: 13pt; 
      font-weight: 700; 
      color: #475569;
      letter-spacing: 0.02em;
    }
    .document-type { 
      font-size: 8pt; 
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .header .version { 
      background: #f1f5f9; 
      color: #64748b; 
      padding: 5px 10px; 
      border-radius: 4px; 
      font-size: 9pt;
      font-weight: 600;
      position: absolute;
      top: 10px;
      right: 20px;
    }
    /* Product name - MOST PROMINENT, CENTERED */
    .product-name { 
      font-size: 22pt; 
      font-weight: 700; 
      color: #0f172a;
      line-height: 1.2;
      margin: 0;
      text-align: center;
    }
    
    .content { padding: 0 20px; }
    .description { 
      font-style: italic; 
      color: #64748b; 
      margin-bottom: 15px; 
      padding: 10px;
      background: #f8fafc;
      border-left: 3px solid #62779c;
    }
    .section { margin-bottom: 20px; }
    .section-title { 
      font-size: 11pt; 
      font-weight: 700; 
      color: #334155; 
      margin-bottom: 10px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .info-row { display: flex; }
    .info-label { color: #64748b; width: 140px; flex-shrink: 0; font-size: 10pt; }
    .info-value { font-weight: 500; }
    .recipe-source { font-style: italic; color: #64748b; font-size: 10pt; margin-bottom: 18px; }
    .allergens-title { color: #62779c; font-weight: bold; margin-bottom: 6px; margin-top: 10px; font-size: 11pt; }
    .allergens-list { margin-bottom: 6px; }
    .ingredients { text-align: justify; margin-bottom: 12px; }
    .ingredients strong { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    table.nutrition { width: auto; min-width: 250px; }
    table th { 
      background: #475569; 
      color: white; 
      text-align: left; 
      padding: 6px 10px; 
      font-weight: 600;
    }
    table td { 
      padding: 5px 10px; 
      border-bottom: 1px solid #e2e8f0; 
    }
    table tr:nth-child(even) { background: #f8fafc; }
    table td:last-child { text-align: right; }
    .sub-row td:first-child { padding-left: 20px; color: #64748b; }
    .conservation-item { margin-bottom: 8px; }
    .conservation-item strong { display: block; margin-bottom: 2px; }
    .footer {
      margin-top: 20px;
      background: #f8fafc;
      padding: 10px 20px;
      font-size: 9pt;
      color: #64748b;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid #e2e8f0;
    }
    @media print {
      .footer {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
      }
    }
    .status-valid { color: #16a34a; font-weight: bold; }
    .status-draft { color: #ef4444; font-weight: bold; }
    .two-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  </style>
</head>
<body>
  <div class="header">
    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo" class="header-logo" />` : ''}
    <div class="header-content">
      <div class="header-company">
        <span class="company-name">BREADSHOP SAS</span>
        <span class="document-type">Fiche technique produit</span>
      </div>
      <h1 class="product-name">${sheetData.product_name || 'Sans nom'}</h1>
    </div>
    ${sheetData.version ? `<div class="version">v${sheetData.version}</div>` : ''}
  </div>

  <div class="content">
  ${sheetData.description ? `<div class="description">${sheetData.description}</div>` : ''}

  <div class="section">
    <div class="section-title">Identification produit</div>
    <div class="info-grid">
      <div class="info-row"><span class="info-label">Désignation commerciale</span><span class="info-value">${sheetData.product_name || '—'}</span></div>
      <div class="info-row"><span class="info-label">Référence produit</span><span class="info-value">${sheetData.product_reference || '—'}</span></div>
      <div class="info-row"><span class="info-label">Marque</span><span class="info-value">${sheetData.brand || '—'}</span></div>
      <div class="info-row"><span class="info-label">Code-barres</span><span class="info-value">${sheetData.barcode || '—'}</span></div>
      <div class="info-row"><span class="info-label">Poids net</span><span class="info-value">${sheetData.net_weight ? `${sheetData.net_weight} ${sheetData.net_weight_unit}` : '—'}</span></div>
      <div class="info-row"><span class="info-label">Pays d'origine</span><span class="info-value">${sheetData.origin_country || '—'}</span></div>
    </div>
  </div>

  ${sheetData.snapshot_recipe_name ? `<div class="recipe-source">Recette source: ${sheetData.snapshot_recipe_name}${sheetData.snapshot_recipe_code ? ` (${sheetData.snapshot_recipe_code})` : ''}</div>` : ''}

  <div class="section">
    <div class="section-title">Liste des ingrédients (INCO)</div>
    <div class="ingredients">${ingredientsText || '—'}</div>
    
    ${snapshotAllergens && (snapshotAllergens.main?.length || snapshotAllergens.secondary?.length) ? `
      <div class="allergens-title">Allergènes</div>
      ${snapshotAllergens.main?.length ? `<div class="allergens-list"><strong>Contient:</strong> ${snapshotAllergens.main.map(a => a.toLowerCase()).join(', ')}</div>` : ''}
      ${snapshotAllergens.secondary?.length ? `<div class="allergens-list"><strong>Peut contenir des traces de:</strong> ${snapshotAllergens.secondary.map(a => a.toLowerCase()).join(', ')}</div>` : ''}
    ` : ''}
  </div>

  <div class="two-columns">
    ${snapshotNutrition ? `
    <div class="section">
      <div class="section-title">Valeurs nutritionnelles (100g)</div>
      <table class="nutrition">
        <thead><tr><th>Nutriment</th><th>Pour 100g</th></tr></thead>
        <tbody>
          <tr><td>Énergie</td><td>${snapshotNutrition.energyKcal?.toFixed(0) || '—'} kcal / ${snapshotNutrition.energyKj?.toFixed(0) || '—'} kJ</td></tr>
          <tr><td>Matières grasses</td><td>${snapshotNutrition.fat?.toFixed(1) || '—'} g</td></tr>
          <tr class="sub-row"><td>dont acides gras saturés</td><td>${snapshotNutrition.saturatedFat?.toFixed(1) || '—'} g</td></tr>
          <tr><td>Glucides</td><td>${snapshotNutrition.carbohydrates?.toFixed(1) || '—'} g</td></tr>
          <tr class="sub-row"><td>dont sucres</td><td>${snapshotNutrition.sugars?.toFixed(1) || '—'} g</td></tr>
          <tr><td>Fibres alimentaires</td><td>${snapshotNutrition.fiber?.toFixed(1) || '—'} g</td></tr>
          <tr><td>Protéines</td><td>${snapshotNutrition.protein?.toFixed(1) || '—'} g</td></tr>
          <tr><td>Sel</td><td>${snapshotNutrition.salt?.toFixed(2) || '—'} g</td></tr>
        </tbody>
      </table>
    </div>
    ` : ''}

    <div class="section">
      <div class="section-title">Conditionnement & Logistique</div>
      <div class="info-row"><span class="info-label">Pièces par carton</span><span class="info-value">${sheetData.pieces_per_carton || '—'}</span></div>
      <div class="info-row"><span class="info-label">Cartons par couche</span><span class="info-value">${sheetData.cartons_per_layer || '—'}</span></div>
      <div class="info-row"><span class="info-label">Couches par palette</span><span class="info-value">${sheetData.layers_per_pallet || '—'}</span></div>
      <div class="info-row"><span class="info-label">Cartons par palette</span><span class="info-value">${cartonsPerPallet || '—'}</span></div>
      <div class="info-row"><span class="info-label">Poids du carton</span><span class="info-value">${sheetData.carton_weight ? `${sheetData.carton_weight} kg` : '—'}</span></div>
      <div class="info-row"><span class="info-label">Dimensions carton</span><span class="info-value">${sheetData.carton_dimensions || '—'}</span></div>
    </div>
  </div>

  ${sheetData.storage_instructions || sheetData.thawing_instructions || sheetData.usage_instructions || sheetData.dlc_ddm_days ? `
  <div class="section">
    <div class="section-title">Conservation & Utilisation</div>
    ${sheetData.dlc_ddm_days ? `<div class="conservation-item"><strong>${sheetData.dlc_ddm_type || 'DLC'}: ${sheetData.dlc_ddm_days} jours</strong></div>` : ''}
    ${sheetData.storage_instructions ? `<div class="conservation-item"><strong>Conservation:</strong> ${sheetData.storage_instructions}</div>` : ''}
    ${sheetData.thawing_instructions ? `<div class="conservation-item"><strong>Décongélation:</strong> ${sheetData.thawing_instructions}</div>` : ''}
    ${sheetData.usage_instructions ? `<div class="conservation-item"><strong>Mise en œuvre:</strong> ${sheetData.usage_instructions}</div>` : ''}
  </div>
  ` : ''}

  </div><!-- end content -->

  <div class="footer">
    <div>
      <div>Document généré le ${new Date().toLocaleDateString('fr-FR')}</div>
      ${sheetData.snapshot_created_at ? `<div>Données figées le ${new Date(sheetData.snapshot_created_at).toLocaleDateString('fr-FR')}</div>` : ''}
    </div>
    <div class="${sheetData.is_published ? 'status-valid' : 'status-draft'}">
      ${sheetData.is_published ? '✓ DOCUMENT VALIDÉ' : 'BROUILLON'}
    </div>
    <div>Version ${sheetData.version || 1}</div>
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
