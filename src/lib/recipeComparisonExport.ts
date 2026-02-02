import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ComparisonResult {
  recipeId: string;
  recipeName: string;
  recipeCode?: string;
  materialQuantityKg: number;
  referenceQuantityKg: number;
  ratio: number;
  percentage: number;
}

interface ExportOptions {
  results: ComparisonResult[];
  materialName: string;
  referenceLabel: string;
  displayMode: 'percentage' | 'decimal';
}

export function exportComparisonToPdf({
  results,
  materialName,
  referenceLabel,
  displayMode,
}: ExportOptions) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // En-tête
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('BREADSHOP SAS', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('ANALYSE COMPARATIVE DES RECETTES', pageWidth / 2, 25, { align: 'center' });

  // Sous-titre
  doc.setFontSize(12);
  doc.setTextColor(60);
  doc.text(`${materialName} / ${referenceLabel}`, pageWidth / 2, 35, { align: 'center' });

  // Date
  doc.setFontSize(9);
  doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, 42, {
    align: 'center',
  });

  // Statistiques
  const values = results.map((r) => r.percentage);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text('Statistiques :', 14, 55);
  doc.setFontSize(9);
  doc.setTextColor(60);
  doc.text(`• Nombre de recettes : ${results.length}`, 20, 62);
  doc.text(`• Moyenne : ${avg.toFixed(2)}%`, 20, 68);
  doc.text(`• Min : ${min.toFixed(2)}% | Max : ${max.toFixed(2)}%`, 20, 74);
  doc.text(`• Écart : ${(max - min).toFixed(2)}%`, 20, 80);

  // Tableau
  const tableData = results.map((result) => {
    const isMax = result.percentage === max;
    const isMin = result.percentage === min;
    return [
      result.recipeName,
      result.recipeCode || '-',
      result.materialQuantityKg.toFixed(2),
      result.referenceQuantityKg.toFixed(2),
      displayMode === 'percentage'
        ? `${result.percentage.toFixed(2)}%`
        : result.ratio.toFixed(4),
      isMax ? 'MAX' : isMin ? 'MIN' : '',
    ];
  });

  autoTable(doc, {
    startY: 88,
    head: [['Recette', 'Code', 'Qté MP (kg)', 'Réf. (kg)', 'Ratio', 'Note']],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [71, 85, 105], // Slate
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 25 },
      2: { halign: 'right', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 20 },
    },
  });

  // Pied de page
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} / ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Téléchargement
  const filename = `Comparaison_${materialName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

export function printComparison({
  results,
  materialName,
  referenceLabel,
  displayMode,
}: ExportOptions) {
  const values = results.map((r) => r.percentage);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Analyse comparative - ${materialName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #1e293b; }
        .header { text-align: center; margin-bottom: 30px; }
        .company { color: #64748b; font-size: 12px; margin-bottom: 8px; }
        h1 { font-size: 20px; margin-bottom: 8px; }
        .subtitle { color: #475569; font-size: 14px; }
        .date { color: #94a3b8; font-size: 11px; margin-top: 8px; }
        .stats { background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px; }
        .stats h3 { font-size: 12px; color: #475569; margin-bottom: 10px; }
        .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
        .stat-item { text-align: center; }
        .stat-value { font-size: 18px; font-weight: 700; color: #0f172a; }
        .stat-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #475569; color: white; padding: 10px 8px; text-align: left; font-weight: 600; }
        th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: right; }
        td { padding: 10px 8px; border-bottom: 1px solid #e2e8f0; }
        td:nth-child(3), td:nth-child(4), td:nth-child(5) { text-align: right; font-family: monospace; }
        tr:nth-child(even) { background: #f8fafc; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
        .badge-max { background: #fee2e2; color: #dc2626; }
        .badge-min { background: #dbeafe; color: #2563eb; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company">BREADSHOP SAS</div>
        <h1>ANALYSE COMPARATIVE DES RECETTES</h1>
        <div class="subtitle">${materialName} / ${referenceLabel}</div>
        <div class="date">Généré le ${new Date().toLocaleDateString('fr-FR')}</div>
      </div>
      
      <div class="stats">
        <h3>Statistiques</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value">${results.length}</div>
            <div class="stat-label">Recettes</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${avg.toFixed(2)}%</div>
            <div class="stat-label">Moyenne</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${min.toFixed(2)}%</div>
            <div class="stat-label">Minimum</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${max.toFixed(2)}%</div>
            <div class="stat-label">Maximum</div>
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>Recette</th>
            <th>Code</th>
            <th>Qté MP (kg)</th>
            <th>Réf. (kg)</th>
            <th>Ratio</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          ${results
            .map((r) => {
              const isMax = r.percentage === max;
              const isMin = r.percentage === min;
              return `
              <tr>
                <td>${r.recipeName}</td>
                <td>${r.recipeCode || '-'}</td>
                <td>${r.materialQuantityKg.toFixed(2)}</td>
                <td>${r.referenceQuantityKg.toFixed(2)}</td>
                <td><strong>${displayMode === 'percentage' ? `${r.percentage.toFixed(2)}%` : r.ratio.toFixed(4)}</strong></td>
                <td>
                  ${isMax ? '<span class="badge badge-max">MAX</span>' : ''}
                  ${isMin ? '<span class="badge badge-min">MIN</span>' : ''}
                </td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
      
      <script>window.onload = () => { window.print(); }</script>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
