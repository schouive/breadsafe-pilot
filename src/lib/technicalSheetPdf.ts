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
  // For external URLs (like Supabase Storage), fetch the image as blob first to avoid CORS issues
  if (src.startsWith('http')) {
    try {
      const response = await fetch(src);
      if (!response.ok) throw new Error('Failed to fetch image');
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            resolve({
              base64: reader.result as string,
              width: img.naturalWidth,
              height: img.naturalHeight
            });
          };
          img.onerror = reject;
          img.src = reader.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('Fetch failed, trying direct load:', e);
      // Fall through to direct image loading
    }
  }

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
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = 15;

  // Brand colors - matching print version exactly
  const primaryColor = [71, 85, 105] as [number, number, number]; // Slate 600
  const textColor = [30, 41, 59] as [number, number, number]; // Slate 800
  const mutedColor = [100, 116, 139] as [number, number, number]; // Slate 500
  const lightMutedColor = [148, 163, 184] as [number, number, number]; // Slate 400
  const accentColor = [98, 119, 156] as [number, number, number]; // Blue accent

  // ========== HEADER - MATCHING PRINT VERSION EXACTLY ==========
  // Logo positioning (left side)
  let logoHeight = 18;
  try {
    const logoData = await loadImageAsBase64WithDimensions(logoImage);
    const aspectRatio = logoData.width / logoData.height;
    const logoWidth = logoHeight * aspectRatio;
    doc.addImage(logoData.base64, 'PNG', margin, yPos, logoWidth, logoHeight);
  } catch (e) {
    console.warn('Could not load logo for PDF');
  }
  
  // Center position for text - CENTERED ON THE FULL PAGE
  const pageCenter = pageWidth / 2;
  
  // Company name - centered on page
  doc.setTextColor(...mutedColor);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('BREADSHOP SAS', pageCenter, yPos + 6, { align: 'center' });
  
  // Document type label
  doc.setFontSize(8);
  doc.setTextColor(...lightMutedColor);
  doc.setFont('helvetica', 'normal');
  doc.text('FICHE TECHNIQUE PRODUIT', pageCenter, yPos + 12, { align: 'center' });
  
  // Product name - centered on page, prominent (22pt like print)
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  const productName = sheetData.product_name || 'Sans nom';
  doc.text(productName, pageCenter, yPos + 24, { align: 'center' });
  
  // Version badge (top right)
  if (sheetData.version) {
    const versionText = `v${sheetData.version}`;
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.setFontSize(9);
    const versionWidth = doc.getTextWidth(versionText) + 10;
    doc.roundedRect(pageWidth - margin - versionWidth, yPos, versionWidth, 14, 2, 2, 'F');
    doc.setTextColor(...mutedColor);
    doc.setFont('helvetica', 'bold');
    doc.text(versionText, pageWidth - margin - versionWidth + 5, yPos + 9);
  }
  
  // Header separator line
  yPos += 32;
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.setLineWidth(0.5);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 10;

  // Description section (if present) - matching print style with left border
  if (sheetData.description) {
    doc.setFillColor(248, 250, 252); // Slate 50
    const descriptionLines = doc.splitTextToSize(sheetData.description, pageWidth - 2 * margin - 12);
    const descHeight = descriptionLines.length * 5 + 10;
    doc.rect(margin, yPos - 2, pageWidth - 2 * margin, descHeight, 'F');
    
    // Left accent border
    doc.setDrawColor(...accentColor);
    doc.setLineWidth(1.5);
    doc.line(margin, yPos - 2, margin, yPos - 2 + descHeight);
    
    doc.setTextColor(...mutedColor);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(descriptionLines, margin + 6, yPos + 5);
    yPos += descHeight + 8;
  }
  
  // ========== IDENTIFICATION SECTION - MATCHING PRINT LAYOUT ==========
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTIFICATION PRODUIT', margin, yPos);
  yPos += 2;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, margin + 55, yPos);
  yPos += 8;

  // Try to load product image
  let productImageData: { base64: string; width: number; height: number } | null = null;
  if (sheetData.product_image_url) {
    try {
      productImageData = await loadImageAsBase64WithDimensions(sheetData.product_image_url);
    } catch (e) {
      console.warn('Could not load product image for PDF');
    }
  }

  const productInfo = [
    ['Désignation commerciale', sheetData.product_name || '—'],
    ['Référence produit', sheetData.product_reference || '—'],
    ['Marque', sheetData.brand || '—'],
    ['Code-barres', sheetData.barcode || '—'],
    ['Poids net', sheetData.net_weight ? `${sheetData.net_weight} ${sheetData.net_weight_unit}` : '—'],
    ['Pays d\'origine', sheetData.origin_country || '—'],
  ];

  const sectionStartY = yPos;
  const infoColumnWidth = productImageData ? 100 : pageWidth - 2 * margin;

  // Left column: Product info
  doc.setFontSize(10);
  for (let i = 0; i < productInfo.length; i++) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text(productInfo[i][0], margin, yPos);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(productInfo[i][1], margin + 48, yPos);
    yPos += 7;
  }

  // Right column: Product image (matching print: 280x200 max, white background)
  let imageEndY = yPos;
  if (productImageData) {
    const imgMaxHeight = 50; // ~200px in PDF scale
    const imgMaxWidth = 70;  // ~280px in PDF scale
    const aspectRatio = productImageData.width / productImageData.height;
    let imgWidth = imgMaxWidth;
    let imgHeight = imgWidth / aspectRatio;
    if (imgHeight > imgMaxHeight) {
      imgHeight = imgMaxHeight;
      imgWidth = imgHeight * aspectRatio;
    }
    
    const imgX = pageWidth - margin - imgWidth - 5;
    
    // Draw white background with border (like print)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(imgX - 3, sectionStartY - 3, imgWidth + 6, imgHeight + 6, 3, 3, 'FD');
    
    doc.addImage(productImageData.base64, 'PNG', imgX, sectionStartY, imgWidth, imgHeight);
    imageEndY = sectionStartY + imgHeight + 8;
  }

  yPos = Math.max(yPos, imageEndY) + 4;

  // Recipe source
  if (sheetData.snapshot_recipe_name) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...mutedColor);
    doc.text(`Recette source: ${sheetData.snapshot_recipe_name}${sheetData.snapshot_recipe_code ? ` (${sheetData.snapshot_recipe_code})` : ''}`, margin, yPos);
    yPos += 10;
  }

  // ========== INGREDIENTS SECTION ==========
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('LISTE DES INGRÉDIENTS (INCO)', margin, yPos);
  yPos += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, yPos, margin + 65, yPos);
  yPos += 8;

  if (sheetData.ingredients_declaration) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    const ingredientsText = sheetData.ingredients_declaration
      .replace(/<strong>([^<]+)<\/strong>/gi, (match: string, content: string) => content.toUpperCase())
      .replace(/<[^>]*>/g, '');
    const ingredientLines = doc.splitTextToSize(ingredientsText, pageWidth - 2 * margin);
    doc.text(ingredientLines, margin, yPos);
    yPos += ingredientLines.length * 5 + 6;
  }

  // Allergens - matching print style with blue title
  const snapshotAllergens = sheetData.snapshot_allergens as { main?: string[]; secondary?: string[] } | null;
  if (snapshotAllergens && (snapshotAllergens.main?.length || snapshotAllergens.secondary?.length)) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accentColor);
    doc.text('Allergènes', margin, yPos);
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setTextColor(...textColor);
    if (snapshotAllergens.main && snapshotAllergens.main.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Contient: ', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(snapshotAllergens.main.map(a => a.toLowerCase()).join(', '), margin + doc.getTextWidth('Contient: '), yPos);
      yPos += 6;
    }
    if (snapshotAllergens.secondary && snapshotAllergens.secondary.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.text('Peut contenir des traces de: ', margin, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(snapshotAllergens.secondary.map(a => a.toLowerCase()).join(', '), margin + doc.getTextWidth('Peut contenir des traces de: '), yPos);
      yPos += 6;
    }
  }

  yPos += 8;

  // ========== TWO-COLUMN LAYOUT: NUTRITION + LOGISTICS (matching print) ==========
  const snapshotNutrition: SnapshotNutrition | null = sheetData.snapshot_nutrition;
  const leftColX = margin;
  const rightColX = pageWidth / 2 + 5;
  const savedYPos = yPos;

  // LEFT COLUMN: Nutrition table
  if (snapshotNutrition) {
    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('VALEURS NUTRITIONNELLES (100G)', leftColX, yPos);
    yPos += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(leftColX, yPos, leftColX + 72, yPos);
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
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontStyle: 'bold' },
      bodyStyles: { textColor: textColor },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 38, halign: 'right' },
      },
      margin: { left: leftColX },
      tableWidth: 88,
    });
  }

  // RIGHT COLUMN: Logistics
  yPos = savedYPos;
  doc.setTextColor(...textColor);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDITIONNEMENT & LOGISTIQUE', rightColX, yPos);
  yPos += 2;
  doc.setDrawColor(226, 232, 240);
  doc.line(rightColX, yPos, rightColX + 72, yPos);
  yPos += 8;

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

  doc.setFontSize(10);
  for (const item of logisticsData) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mutedColor);
    doc.text(item[0], rightColX, yPos);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(item[1], rightColX + 48, yPos);
    yPos += 7;
  }

  // Determine where to continue after two-column section
  const nutritionEndY = snapshotNutrition ? (doc as any).lastAutoTable?.finalY || savedYPos : savedYPos;
  yPos = Math.max(nutritionEndY, yPos) + 12;

  // ========== CONSERVATION SECTION (matching print exactly) ==========
  const hasConservation = sheetData.storage_instructions || sheetData.thawing_instructions || sheetData.usage_instructions || sheetData.dlc_ddm_days;
  if (hasConservation) {
    // Check if we need a new page
    if (yPos > pageHeight - 70) {
      doc.addPage();
      yPos = 20;
    }

    doc.setTextColor(...textColor);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('CONSERVATION & UTILISATION', margin, yPos);
    yPos += 2;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, margin + 62, yPos);
    yPos += 8;

    doc.setFontSize(10);
    const contentWidth = pageWidth - 2 * margin;

    // DLC/DDM
    if (sheetData.dlc_ddm_days) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text(`${sheetData.dlc_ddm_type || 'DLC'}: ${sheetData.dlc_ddm_days} jours`, margin, yPos);
      yPos += 8;
    }

    // Conservation
    if (sheetData.storage_instructions) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('Conservation:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const storageLines = doc.splitTextToSize(sheetData.storage_instructions, contentWidth - 32);
      doc.text(storageLines, margin + 30, yPos);
      yPos += storageLines.length * 5 + 6;
    }

    // Décongélation
    if (sheetData.thawing_instructions) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('Décongélation:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const thawingLines = doc.splitTextToSize(sheetData.thawing_instructions, contentWidth - 36);
      doc.text(thawingLines, margin + 34, yPos);
      yPos += thawingLines.length * 5 + 6;
    }

    // Mise en œuvre
    if (sheetData.usage_instructions) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('Mise en œuvre:', margin, yPos);
      doc.setFont('helvetica', 'normal');
      const usageLines = doc.splitTextToSize(sheetData.usage_instructions, contentWidth - 36);
      doc.text(usageLines, margin + 34, yPos);
      yPos += usageLines.length * 5 + 6;
    }
  }

  // ========== FOOTER (matching print exactly) ==========
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.line(0, pageHeight - 20, pageWidth, pageHeight - 20);
  
  doc.setTextColor(...mutedColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const dateStr = new Date().toLocaleDateString('fr-FR');
  doc.text(`Document généré le ${dateStr}`, margin, pageHeight - 12);
  
  if (sheetData.snapshot_created_at) {
    doc.text(`Données figées le ${new Date(sheetData.snapshot_created_at).toLocaleDateString('fr-FR')}`, margin, pageHeight - 7);
  }
  
  doc.text(`Version ${sheetData.version || 1}`, pageWidth - margin - 18, pageHeight - 10);

  // Status - centered
  if (sheetData.is_published) {
    doc.setTextColor(22, 163, 74); // Green
    doc.setFont('helvetica', 'bold');
    doc.text('✓ DOCUMENT VALIDÉ', pageWidth / 2, pageHeight - 10, { align: 'center' });
  } else {
    doc.setTextColor(239, 68, 68); // Red
    doc.setFont('helvetica', 'bold');
    doc.text('BROUILLON', pageWidth / 2, pageHeight - 10, { align: 'center' });
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
    
    /* ========== PROFESSIONAL HEADER - CENTERED ON PAGE ========== */
    .header {
      padding: 15px 20px 18px 20px;
      border-bottom: 2px solid #e2e8f0;
      margin-bottom: 20px;
      position: relative;
    }
    .header-logo { 
      height: 50px; 
      width: auto; 
      object-fit: contain;
      position: absolute;
      left: 20px;
      top: 50%;
      transform: translateY(-50%);
    }
    .header-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      width: 100%;
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
    /* Product name - MOST PROMINENT, CENTERED ON PAGE */
    .product-name { 
      font-size: 22pt; 
      font-weight: 700; 
      color: #0f172a;
      line-height: 1.2;
      margin: 0;
      text-align: center;
    }
    /* Product image styling - in identification section */
    .product-image {
      max-width: 280px;
      max-height: 200px;
      object-fit: contain;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      background-color: #ffffff;
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
    /* Identification section with image */
    .identification-layout {
      display: flex;
      gap: 20px;
      align-items: flex-start;
    }
    .identification-info {
      flex: 1;
    }
    .identification-image {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .info-list { display: flex; flex-direction: column; gap: 6px; }
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
    <div class="identification-layout">
      <div class="identification-info">
        <div class="info-list">
          <div class="info-row"><span class="info-label">Désignation commerciale</span><span class="info-value">${sheetData.product_name || '—'}</span></div>
          <div class="info-row"><span class="info-label">Référence produit</span><span class="info-value">${sheetData.product_reference || '—'}</span></div>
          <div class="info-row"><span class="info-label">Marque</span><span class="info-value">${sheetData.brand || '—'}</span></div>
          <div class="info-row"><span class="info-label">Code-barres</span><span class="info-value">${sheetData.barcode || '—'}</span></div>
          <div class="info-row"><span class="info-label">Poids net</span><span class="info-value">${sheetData.net_weight ? `${sheetData.net_weight} ${sheetData.net_weight_unit}` : '—'}</span></div>
          <div class="info-row"><span class="info-label">Pays d'origine</span><span class="info-value">${sheetData.origin_country || '—'}</span></div>
        </div>
      </div>
      ${sheetData.product_image_url ? `
      <div class="identification-image">
        <img src="${sheetData.product_image_url}" alt="${sheetData.product_name || 'Produit'}" class="product-image" />
      </div>
      ` : ''}
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
