import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CartonLabel, useValidateCartonLabel, useRefreshCartonLabelSnapshot } from '@/hooks/useCartonLabels';
import { Check, X, RefreshCw, Printer, CheckCircle, AlertTriangle, Recycle, Loader2, Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CartonLabelPreview } from './CartonLabelPreview';
import { toast } from 'sonner';

interface CartonLabelDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: CartonLabel | null;
}

export function CartonLabelDetailSheet({
  open,
  onOpenChange,
  label,
}: CartonLabelDetailSheetProps) {
  const validateLabel = useValidateCartonLabel();
  const refreshSnapshot = useRefreshCartonLabelSnapshot();
  
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [validationComment, setValidationComment] = useState('');

  if (!label) return null;

  const nutrition = label.snapshot_nutrition as Record<string, number> | null;
  const secondaryAllergens = label.snapshot_allergens_secondary as string[] | null;
  
  // Check if product sheet version has changed
  const sheetVersion = label.product_sheets?.version;
  const snapshotVersion = label.snapshot_product_sheet_version;
  const isOutdated = sheetVersion && snapshotVersion && sheetVersion > snapshotVersion;

  const handleValidate = async () => {
    await validateLabel.mutateAsync({
      id: label.id,
      comment: validationComment || undefined,
    });
    setIsValidateDialogOpen(false);
    setValidationComment('');
  };

  const handleRefresh = async () => {
    await refreshSnapshot.mutateAsync(label.id);
  };

  const handlePrint = () => {
    // Create print window with label content
    const printContent = generatePrintContent(label);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleExportJSON = () => {
    const zebraData = generateZebraJSON(label);
    const blob = new Blob([JSON.stringify(zebraData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `etiquette-${label.label_title.replace(/\s+/g, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Export JSON généré', {
      description: 'Fichier téléchargé pour imprimante Zebra (64x102mm)'
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle className="text-xl">{label.label_title}</SheetTitle>
              <Badge
                variant="outline"
                className={label.status === 'validated' 
                  ? 'bg-success/10 text-success border-success/30' 
                  : 'bg-muted'}
              >
                {label.status === 'validated' ? (
                  <><Check className="h-3 w-3 mr-1" /> Validée</>
                ) : (
                  <><X className="h-3 w-3 mr-1" /> Brouillon</>
                )}
              </Badge>
              <Badge variant="outline">v{label.version}</Badge>
            </div>
            <SheetDescription>
              FT: {label.product_sheets?.product_name} (v{label.snapshot_product_sheet_version})
            </SheetDescription>
          </SheetHeader>

          {/* Outdated warning */}
          {isOutdated && (
            <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-warning">
                  Version obsolète
                </p>
                <p className="text-xs text-muted-foreground">
                  La fiche technique a été mise à jour (v{sheetVersion}). Actualisez les données avant validation.
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleRefresh}
                  disabled={refreshSnapshot.isPending}
                >
                  {refreshSnapshot.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Actualiser les données
                </Button>
              </div>
            </div>
          )}

          {/* Label Preview */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Aperçu de l'étiquette (120 x 64 mm)</h3>
            </div>
            <div className="overflow-x-auto -mx-6 px-6 pb-2">
              <CartonLabelPreview label={label} />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="space-y-6">
            {/* Liste des ingrédients */}
            <section>
              <h3 className="font-semibold mb-2">Liste des ingrédients</h3>
              <div 
                className="text-sm p-3 bg-muted/50 rounded-lg"
                dangerouslySetInnerHTML={{ 
                  __html: label.snapshot_ingredients_html || '<em>Non disponible</em>' 
                }}
              />
            </section>

            <Separator />

            {/* Traces d'allergènes */}
            {secondaryAllergens && secondaryAllergens.length > 0 && (
              <>
                <section>
                  <h3 className="font-semibold mb-2">Peut contenir des traces de</h3>
                  <p className="text-sm p-3 bg-warning/10 rounded-lg border border-warning/30">
                    {secondaryAllergens.join(', ')}
                  </p>
                </section>
                <Separator />
              </>
            )}

            {/* Valeurs nutritionnelles */}
            <section>
              <h3 className="font-semibold mb-2">Valeurs nutritionnelles (pour 100g)</h3>
              {nutrition ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Énergie:</span>{' '}
                    <span className="font-medium">{nutrition.per_100g_energy_kj?.toFixed(0)} kJ / {nutrition.per_100g_energy_kcal?.toFixed(0)} kcal</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Matières grasses:</span>{' '}
                    <span className="font-medium">{nutrition.per_100g_fat?.toFixed(1)} g</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">dont AG saturés:</span>{' '}
                    <span className="font-medium">{nutrition.per_100g_saturated_fat?.toFixed(1)} g</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Glucides:</span>{' '}
                    <span className="font-medium">{nutrition.per_100g_carbohydrates?.toFixed(1)} g</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">dont sucres:</span>{' '}
                    <span className="font-medium">{nutrition.per_100g_sugars?.toFixed(1)} g</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Fibres:</span>{' '}
                    <span className="font-medium">{nutrition.per_100g_fiber?.toFixed(1)} g</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Protéines:</span>{' '}
                    <span className="font-medium">{nutrition.per_100g_protein?.toFixed(1)} g</span>
                  </div>
                  <div className="p-2 bg-muted/50 rounded">
                    <span className="text-muted-foreground">Sel:</span>{' '}
                    <span className="font-medium">{nutrition.per_100g_salt?.toFixed(2)} g</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Non disponible</p>
              )}
            </section>

            <Separator />

            {/* Poids net */}
            <section>
              <h3 className="font-semibold mb-2">Poids net</h3>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-2xl font-bold">
                  {label.snapshot_net_weight} {label.snapshot_net_weight_unit}
                </span>
                <p className="text-xs text-muted-foreground mt-1">
                  Hauteur minimale du texte: 6mm
                </p>
              </div>
            </section>

            <Separator />

            {/* Conservation */}
            {label.snapshot_storage_instructions && (
              <>
                <section>
                  <h3 className="font-semibold mb-2">Mode de conservation</h3>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg">
                    {label.snapshot_storage_instructions}
                  </p>
                </section>
                <Separator />
              </>
            )}

            {/* Décongélation */}
            {label.snapshot_thawing_instructions && (
              <>
                <section>
                  <h3 className="font-semibold mb-2">Mode de décongélation</h3>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg">
                    {label.snapshot_thawing_instructions}
                  </p>
                </section>
                <Separator />
              </>
            )}

            {/* Éléments fixes */}
            <section>
              <h3 className="font-semibold mb-2">Éléments obligatoires</h3>
              <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Recycle className="h-8 w-8 text-primary" />
                  <span className="text-xs">Logo Triman</span>
                </div>
                <span className="text-sm">Sac et carton recyclables</span>
              </div>
            </section>

            {/* Validation info */}
            {label.status === 'validated' && label.validated_at && (
              <>
                <Separator />
                <section>
                  <h3 className="font-semibold mb-2">Validation</h3>
                  <div className="p-3 bg-success/10 rounded-lg border border-success/30 space-y-1">
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Validée le {format(new Date(label.validated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}</span>
                    </div>
                    {label.validation_comment && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {label.validation_comment}
                      </p>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            {label.status === 'draft' && !isOutdated && (
              <Button onClick={() => setIsValidateDialogOpen(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Valider l'étiquette
              </Button>
            )}
            {label.status === 'validated' && (
              <>
                <Button onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimer
                </Button>
                <Button variant="outline" onClick={handleExportJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Zebra JSON
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Validation Dialog */}
      <Dialog open={isValidateDialogOpen} onOpenChange={setIsValidateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider l'étiquette carton</DialogTitle>
            <DialogDescription>
              Une fois validée, l'étiquette sera imprimable. Ajoutez un commentaire optionnel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Commentaire (optionnel)</Label>
              <Textarea
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
                placeholder="Remarques sur cette validation..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValidateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleValidate} disabled={validateLabel.isPending}>
              {validateLabel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function generatePrintContent(label: CartonLabel): string {
  const nutrition = label.snapshot_nutrition as Record<string, number> | null;
  const secondaryAllergens = label.snapshot_allergens_secondary as string[] | null;

  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Étiquette - ${label.label_title}</title>
      <style>
        @page {
          size: 100mm 150mm;
          margin: 5mm;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: Arial, sans-serif;
          font-size: 9pt;
          line-height: 1.3;
          padding: 3mm;
        }
        .title {
          font-size: 14pt;
          font-weight: bold;
          text-align: center;
          margin-bottom: 4mm;
          border-bottom: 1px solid #000;
          padding-bottom: 2mm;
        }
        .section {
          margin-bottom: 3mm;
        }
        .section-title {
          font-weight: bold;
          font-size: 8pt;
          margin-bottom: 1mm;
        }
        .ingredients {
          font-size: 8pt;
          text-align: justify;
        }
        .allergens-warning {
          font-size: 8pt;
          font-style: italic;
          margin-top: 2mm;
        }
        .nutrition-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7pt;
          margin-top: 1mm;
        }
        .nutrition-table td {
          border: 0.5pt solid #000;
          padding: 1mm 2mm;
        }
        .nutrition-table .label {
          width: 60%;
        }
        .nutrition-table .value {
          text-align: right;
        }
        .net-weight {
          font-size: 18pt;
          font-weight: bold;
          text-align: center;
          padding: 3mm 0;
          border: 1px solid #000;
          margin: 2mm 0;
        }
        .storage {
          font-size: 8pt;
        }
        .footer {
          margin-top: 4mm;
          display: flex;
          align-items: center;
          gap: 3mm;
          font-size: 7pt;
        }
        .triman {
          width: 15mm;
          height: 15mm;
          border: 1px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 6pt;
        }
        strong {
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="title">${label.label_title}</div>
      
      <div class="section">
        <div class="section-title">Ingrédients:</div>
        <div class="ingredients">${label.snapshot_ingredients_html || 'N/A'}</div>
      </div>
      
      ${secondaryAllergens && secondaryAllergens.length > 0 ? `
        <div class="allergens-warning">
          Peut contenir des traces de: ${secondaryAllergens.join(', ')}
        </div>
      ` : ''}
      
      <div class="section">
        <div class="section-title">Valeurs nutritionnelles moyennes pour 100g:</div>
        ${nutrition ? `
          <table class="nutrition-table">
            <tr><td class="label">Énergie</td><td class="value">${nutrition.per_100g_energy_kj?.toFixed(0) || '-'} kJ / ${nutrition.per_100g_energy_kcal?.toFixed(0) || '-'} kcal</td></tr>
            <tr><td class="label">Matières grasses</td><td class="value">${nutrition.per_100g_fat?.toFixed(1) || '-'} g</td></tr>
            <tr><td class="label">&nbsp;&nbsp;dont acides gras saturés</td><td class="value">${nutrition.per_100g_saturated_fat?.toFixed(1) || '-'} g</td></tr>
            <tr><td class="label">Glucides</td><td class="value">${nutrition.per_100g_carbohydrates?.toFixed(1) || '-'} g</td></tr>
            <tr><td class="label">&nbsp;&nbsp;dont sucres</td><td class="value">${nutrition.per_100g_sugars?.toFixed(1) || '-'} g</td></tr>
            <tr><td class="label">Fibres alimentaires</td><td class="value">${nutrition.per_100g_fiber?.toFixed(1) || '-'} g</td></tr>
            <tr><td class="label">Protéines</td><td class="value">${nutrition.per_100g_protein?.toFixed(1) || '-'} g</td></tr>
            <tr><td class="label">Sel</td><td class="value">${nutrition.per_100g_salt?.toFixed(2) || '-'} g</td></tr>
          </table>
        ` : '<p>N/A</p>'}
      </div>
      
      <div class="net-weight">
        Poids net: ${label.snapshot_net_weight || '-'} ${label.snapshot_net_weight_unit || 'g'}
      </div>
      
      ${label.snapshot_storage_instructions ? `
        <div class="section storage">
          <strong>Conservation:</strong> ${label.snapshot_storage_instructions}
        </div>
      ` : ''}
      
      ${label.snapshot_thawing_instructions ? `
        <div class="section storage">
          <strong>Décongélation:</strong> ${label.snapshot_thawing_instructions}
        </div>
      ` : ''}
      
      <div class="footer">
        <div class="triman">♻️ TRIMAN</div>
        <span>Sac et carton recyclables</span>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate JSON data for Zebra label printer
 * Format: 64x102mm (width x height)
 */
function generateZebraJSON(label: CartonLabel) {
  const nutrition = label.snapshot_nutrition as Record<string, number> | null;
  const secondaryAllergens = label.snapshot_allergens_secondary as string[] | null;

  // Clean HTML from ingredients to plain text with allergens in uppercase
  const ingredientsText = label.snapshot_ingredients_html
    ? label.snapshot_ingredients_html
        .replace(/<strong>/g, '')
        .replace(/<\/strong>/g, '')
        .replace(/<[^>]*>/g, '')
        .trim()
    : '';

  return {
    // Label metadata
    metadata: {
      version: '1.0',
      format: '64x102mm',
      exportDate: new Date().toISOString(),
      labelId: label.id,
      labelVersion: label.version,
      productSheetVersion: label.snapshot_product_sheet_version,
    },
    
    // Header information
    header: {
      company: 'BREADSHOP SAS',
      productName: label.label_title,
    },
    
    // Ingredients section
    ingredients: {
      text: ingredientsText,
      mayContain: secondaryAllergens || [],
    },
    
    // Nutritional values per 100g
    nutrition: nutrition ? {
      energyKj: Math.round(nutrition.per_100g_energy_kj || 0),
      energyKcal: Math.round(nutrition.per_100g_energy_kcal || 0),
      fat: Number((nutrition.per_100g_fat || 0).toFixed(1)),
      saturatedFat: Number((nutrition.per_100g_saturated_fat || 0).toFixed(1)),
      carbohydrates: Number((nutrition.per_100g_carbohydrates || 0).toFixed(1)),
      sugars: Number((nutrition.per_100g_sugars || 0).toFixed(1)),
      fiber: Number((nutrition.per_100g_fiber || 0).toFixed(1)),
      protein: Number((nutrition.per_100g_protein || 0).toFixed(1)),
      salt: Number((nutrition.per_100g_salt || 0).toFixed(2)),
    } : null,
    
    // Weight information
    weight: {
      netWeight: label.snapshot_net_weight,
      unit: label.snapshot_net_weight_unit || 'kg',
    },
    
    // Storage instructions
    storage: {
      conservation: label.snapshot_storage_instructions || null,
      thawing: label.snapshot_thawing_instructions || null,
    },
    
    // Required elements
    regulatory: {
      triman: true,
      recyclable: 'Sac et carton recyclables',
    },
    
    // Variable fields (to be filled at print time)
    variableFields: {
      barcode: null, // To be set by printing software
      bestBefore: null, // DDM - to be set by printing software
      lotNumber: null, // To be set by printing software
    },
  };
}
