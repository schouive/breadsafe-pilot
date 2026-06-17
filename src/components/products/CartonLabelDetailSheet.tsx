import { useEffect, useState } from 'react';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label as UILabel } from '@/components/ui/label';
import {
  CartonLabel,
  useRefreshCartonLabelSnapshot,
  useUpdateCartonLabelTexts,
} from '@/hooks/useCartonLabels';
import { useOperatorNames } from '@/hooks/useOperatorNames';
import {
  Check, RefreshCw, Printer, CheckCircle, AlertTriangle,
  Recycle, Loader2, Eye, Edit3, Lock, Archive, Save, Languages,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CartonLabelPreview } from './CartonLabelPreview';
import { getLabelDict, getLanguageBadge } from '@/lib/cartonLabelI18n';

interface CartonLabelDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  label: CartonLabel | null;
}

export function CartonLabelDetailSheet({ open, onOpenChange, label }: CartonLabelDetailSheetProps) {
  const refreshSnapshot = useRefreshCartonLabelSnapshot();
  const updateTexts = useUpdateCartonLabelTexts();

  const [storage, setStorage] = useState('');
  const [thawing, setThawing] = useState('');

  useEffect(() => {
    if (label) {
      setStorage(label.snapshot_storage_instructions || '');
      setThawing(label.snapshot_thawing_instructions || '');
    }
  }, [label]);

  if (!label) return null;

  const nutrition = label.snapshot_nutrition as Record<string, number> | null;
  const secondaryAllergens = label.snapshot_allergens_secondary as string[] | null;
  const isDraft = label.status === 'draft';
  const isValidated = label.status === 'validated';
  const isArchived = label.status === 'archived';
  const t = getLabelDict(label.language);
  const langBadge = getLanguageBadge(label.language);

  const sheetVersion = label.product_sheets?.version;
  const snapshotVersion = label.snapshot_product_sheet_version;
  const isOutdated = sheetVersion && snapshotVersion && sheetVersion > snapshotVersion;

  const textsDirty =
    (storage || '') !== (label.snapshot_storage_instructions || '') ||
    (thawing || '') !== (label.snapshot_thawing_instructions || '');

  const handleSaveTexts = async () => {
    await updateTexts.mutateAsync({
      id: label.id,
      storage: storage.trim() ? storage : null,
      thawing: thawing.trim() ? thawing : null,
    });
  };

  const handleRefresh = async () => {
    await refreshSnapshot.mutateAsync(label.id);
  };


  const handlePrint = () => {
    const printContent = generatePrintContent(label);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const statusBadge = () => {
    if (isArchived) return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">
        <Archive className="h-3 w-3 mr-1" /> Archivée
      </Badge>
    );
    if (isValidated) return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30">
        <Check className="h-3 w-3 mr-1" /> Validée
      </Badge>
    );
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
        <Edit3 className="h-3 w-3 mr-1" /> Brouillon
      </Badge>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <SheetTitle className="text-xl">{label.label_title}</SheetTitle>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
              <Languages className="h-3 w-3 mr-1" /> {langBadge}
            </Badge>
            {statusBadge()}
            <Badge variant="outline">v{label.version}</Badge>
          </div>
          <SheetDescription>
            FT: {label.product_sheets?.product_name} (v{label.snapshot_product_sheet_version})
            {label.validated_at && (
              <> • Validée le {format(new Date(label.validated_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</>
            )}
          </SheetDescription>
        </SheetHeader>

        {/* Recipe modified warning */}
        {isOutdated && isDraft && (
          <div className="mt-4 p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm font-medium text-warning">
                Fiche technique mise à jour. Actualisez les données.
              </p>
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshSnapshot.isPending}>
                {refreshSnapshot.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
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
          {/* INCO Ingredient List - READ ONLY (editing happens at FT level) */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Liste des ingrédients INCO</h3>
            </div>
            <div
              className="text-sm p-3 bg-muted/50 rounded-lg"
              dangerouslySetInnerHTML={{
                __html: label.snapshot_ingredients_html || '<em>Non disponible</em>',
              }}
            />
            <p className="text-xs text-muted-foreground mt-1 italic">
              💡 La modification et validation INCO se font au niveau de la Fiche Technique.
            </p>
          </section>

          <Separator />

          {/* Secondary allergens */}
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

          {/* Nutrition */}
          <section>
            <h3 className="font-semibold mb-2">Valeurs nutritionnelles (pour 100g)</h3>
            {nutrition ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Énergie:</span> <span className="font-medium">{nutrition.per_100g_energy_kj?.toFixed(0)} kJ / {nutrition.per_100g_energy_kcal?.toFixed(0)} kcal</span></div>
                <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Matières grasses:</span> <span className="font-medium">{nutrition.per_100g_fat?.toFixed(1)} g</span></div>
                <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">dont AG saturés:</span> <span className="font-medium">{nutrition.per_100g_saturated_fat?.toFixed(1)} g</span></div>
                <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Glucides:</span> <span className="font-medium">{nutrition.per_100g_carbohydrates?.toFixed(1)} g</span></div>
                <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">dont sucres:</span> <span className="font-medium">{nutrition.per_100g_sugars?.toFixed(1)} g</span></div>
                <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Fibres:</span> <span className="font-medium">{nutrition.per_100g_fiber?.toFixed(1)} g</span></div>
                <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Protéines:</span> <span className="font-medium">{nutrition.per_100g_protein?.toFixed(1)} g</span></div>
                <div className="p-2 bg-muted/50 rounded"><span className="text-muted-foreground">Sel:</span> <span className="font-medium">{nutrition.per_100g_salt?.toFixed(2)} g</span></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Non disponible</p>
            )}
          </section>

          <Separator />

          {/* Net weight */}
          <section>
            <h3 className="font-semibold mb-2">Poids net</h3>
            <div className="p-3 bg-muted/50 rounded-lg">
              <span className="text-2xl font-bold">{label.snapshot_net_weight} {label.snapshot_net_weight_unit}</span>
            </div>
          </section>

          <Separator />

          {/* Storage + Thawing (editable in draft) */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Consignes (conservation / décongélation)</h3>
              {isDraft && textsDirty && (
                <Button size="sm" onClick={handleSaveTexts} disabled={updateTexts.isPending}>
                  {updateTexts.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Enregistrer
                </Button>
              )}
            </div>
            {isDraft ? (
              <div className="space-y-3">
                <div>
                  <UILabel htmlFor="storage" className="text-xs">{t.storage}</UILabel>
                  <Textarea
                    id="storage"
                    value={storage}
                    onChange={(e) => setStorage(e.target.value)}
                    rows={2}
                    placeholder={t.storage}
                  />
                </div>
                <div>
                  <UILabel htmlFor="thawing" className="text-xs">{t.thawing}</UILabel>
                  <Textarea
                    id="thawing"
                    value={thawing}
                    onChange={(e) => setThawing(e.target.value)}
                    rows={2}
                    placeholder={t.thawing}
                  />
                </div>
                <p className="text-xs text-muted-foreground italic">
                  💡 Traduisez ces consignes dans la langue de l'étiquette puis enregistrez.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {label.snapshot_storage_instructions && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t.storage}</p>
                    <p className="text-sm p-3 bg-muted/50 rounded-lg">{label.snapshot_storage_instructions}</p>
                  </div>
                )}
                {label.snapshot_thawing_instructions && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t.thawing}</p>
                    <p className="text-sm p-3 bg-muted/50 rounded-lg">{label.snapshot_thawing_instructions}</p>
                  </div>
                )}
              </div>
            )}
          </section>
          <Separator />

            </>
          )}

          {/* Mandatory elements */}
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
          {isValidated && label.validated_at && (
            <>
              <Separator />
              <section>
                <h3 className="font-semibold mb-2">Validation</h3>
                <div className="p-3 bg-success/10 rounded-lg border border-success/30 space-y-1">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">
                      Validée le {format(new Date(label.validated_at), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  {label.validation_comment && (
                    <p className="text-sm text-muted-foreground mt-2">{label.validation_comment}</p>
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-2">
          {isValidated && (
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" /> Imprimer
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
        @page { size: 100mm 150mm; margin: 5mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 9pt; line-height: 1.3; padding: 3mm; }
        .title { font-size: 14pt; font-weight: bold; text-align: center; margin-bottom: 4mm; border-bottom: 1px solid #000; padding-bottom: 2mm; }
        .section { margin-bottom: 3mm; }
        .section-title { font-weight: bold; font-size: 8pt; margin-bottom: 1mm; }
        .ingredients { font-size: 8pt; text-align: justify; }
        .allergens-warning { font-size: 8pt; font-style: italic; margin-top: 2mm; }
        .nutrition-table { width: 100%; border-collapse: collapse; font-size: 7pt; margin-top: 1mm; }
        .nutrition-table td { border: 0.5pt solid #000; padding: 1mm 2mm; }
        .nutrition-table .label { width: 60%; }
        .nutrition-table .value { text-align: right; }
        .net-weight { font-size: 18pt; font-weight: bold; text-align: center; padding: 3mm 0; border: 1px solid #000; margin: 2mm 0; }
        .storage { font-size: 8pt; }
        .footer { margin-top: 4mm; display: flex; align-items: center; gap: 3mm; font-size: 7pt; }
        strong { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="title">${label.label_title}</div>
      <div class="section">
        <div class="section-title">Ingrédients:</div>
        <div class="ingredients">${label.snapshot_ingredients_html || 'N/A'}</div>
      </div>
      ${secondaryAllergens && secondaryAllergens.length > 0 ? `
        <div class="allergens-warning">Peut contenir des traces de: ${secondaryAllergens.join(', ')}</div>
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
      <div class="net-weight">${label.snapshot_net_weight || '-'} ${label.snapshot_net_weight_unit || 'kg'}</div>
      ${label.snapshot_storage_instructions ? `<div class="section"><div class="section-title">Conservation:</div><div class="storage">${label.snapshot_storage_instructions}</div></div>` : ''}
      ${label.snapshot_thawing_instructions ? `<div class="section"><div class="section-title">Décongélation:</div><div class="storage">${label.snapshot_thawing_instructions}</div></div>` : ''}
      <div class="footer">
        <div>BREADSHOP SAS - Fabriqué en France</div>
      </div>
    </body>
    </html>
  `;
}
