import { useState, useEffect } from 'react';
import { 
  FileText, Scale, Calendar, MapPin, AlertTriangle, Barcode,
  Package, Thermometer, Download, Printer, Clock, Layers,
  Box, Tag, CheckCircle, FileCheck,
  History, ShieldAlert, Lock, Archive, Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { ProductSheet } from '@/hooks/useRecipes';
import { generateTechnicalSheetPDF, printTechnicalSheet } from '@/lib/technicalSheetPdf';
import { generateIngredientLists } from '@/lib/ingredientListGenerator';
import {
  useValidateProductSheetInco,
  useLogProductSheetIncoChange,
} from '@/hooks/useProductSheetInco';
import { useProductSheetIncoLogs } from '@/hooks/useProductSheetIncoLogs';
import { useOperatorNames } from '@/hooks/useOperatorNames';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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

interface TechnicalSheetDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: ProductSheet | null;
}

export function TechnicalSheetDetailSheet({ open, onOpenChange, sheet }: TechnicalSheetDetailSheetProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const validateInco = useValidateProductSheetInco();
  const logChange = useLogProductSheetIncoChange();

  const { data: changeLogs } = useProductSheetIncoLogs(sheet?.id);
  const logUserIds = changeLogs?.map(l => l.user_id) || [];
  const { data: userNames } = useOperatorNames(logUserIds);

  useEffect(() => {
    if (sheet) {
      // Reset state when sheet changes
    }
  }, [sheet?.id]);

  if (!sheet) return null;

  const sheetData = sheet as any;
  const snapshotNutrition: SnapshotNutrition | null = sheetData.snapshot_nutrition;
  const rawSnapshotAllergens = sheetData.snapshot_allergens as { main?: string[]; secondary?: string[] } | null;
  // Deduplicate allergens (handles Œufs/Oeufs variants)
  const normalizeAllergen = (a: string) => {
    let n = a.toLowerCase().replace('œ', 'oe').replace('à', 'a').trim();
    if (n.endsWith('s') && n.length > 2) n = n.slice(0, -1);
    return n;
  };
  const dedupAllergens = (list: string[]) => {
    const seen = new Set<string>();
    return list.filter(a => {
      const norm = normalizeAllergen(a);
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  };
  const snapshotAllergens = rawSnapshotAllergens ? {
    main: rawSnapshotAllergens.main ? dedupAllergens(rawSnapshotAllergens.main) : undefined,
    secondary: rawSnapshotAllergens.secondary ? dedupAllergens(rawSnapshotAllergens.secondary) : undefined,
  } : null;
  const snapshotIngredients = sheetData.snapshot_ingredients as Array<{
    name: string; composition: string | null; bakerPercentage: number; allergens: string[];
  }> | null;

  const incoStatus = sheetData.inco_status || 'draft';
  // Fallback: use ingredients_declaration if inco_html was never set (legacy FTs)
  const incoHtml = sheetData.inco_html || sheetData.ingredients_declaration || '';
  const incoHtmlOriginal = sheetData.inco_html_original;
  const incoValidatedAt = sheetData.inco_validated_at;
  const incoVersion = sheetData.inco_version || 0;
  const isDraft = incoStatus === 'draft';
  const isValidated = incoStatus === 'validated';

  const handleExportPDF = async () => {
    setIsExporting(true);
    try { await generateTechnicalSheetPDF(sheet); } finally { setIsExporting(false); }
  };

  const handlePrint = async () => { await printTechnicalSheet(sheet); };

  const handleValidate = async () => {
    await validateInco.mutateAsync({ id: sheet.id, comment: validationComment || undefined });
    await logChange.mutateAsync({
      product_sheet_id: sheet.id,
      action: 'validation',
      html_before: null,
      html_after: incoHtml,
    });
    setIsValidateDialogOpen(false);
    setValidationComment('');
  };

  const cartonsPerPallet = sheetData.cartons_per_layer && sheetData.layers_per_pallet 
    ? sheetData.cartons_per_layer * sheetData.layers_per_pallet : null;

  const incoStatusBadge = () => {
    if (incoStatus === 'archived') return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-muted-foreground/30">
        <Archive className="h-3 w-3 mr-1" /> Archivée
      </Badge>
    );
    if (isValidated) return (
      <Badge variant="outline" className="bg-success/10 text-success border-success/30">
        <CheckCircle className="h-3 w-3 mr-1" /> Validée
      </Badge>
    );
    return (
      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
        Brouillon
      </Badge>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-left">{sheetData.product_name}</SheetTitle>
                  <SheetDescription className="text-left flex items-center gap-2">
                    
                    {sheetData.version && <Badge variant="outline">v{sheetData.version}</Badge>}
                    {sheetData.is_published ? (
                      <Badge className="bg-success/10 text-success border-success/30">
                        <CheckCircle className="h-3 w-3 mr-1" /> Validée
                      </Badge>
                    ) : (
                      <Badge variant="outline">Brouillon</Badge>
                    )}
                  </SheetDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-1" /> Imprimer
                </Button>
                <Button size="sm" onClick={handleExportPDF} disabled={isExporting}>
                  <Download className="h-4 w-4 mr-1" /> {isExporting ? 'Export...' : 'PDF'}
                </Button>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Product Image */}
            {sheetData.product_image_url && (
              <div className="w-full h-48 rounded-lg overflow-hidden border" style={{ backgroundColor: '#ffffff' }}>
                <img src={sheetData.product_image_url} alt={sheetData.product_name}
                  className="w-full h-full object-contain" style={{ backgroundColor: '#ffffff' }} loading="lazy" />
              </div>
            )}

            {/* Quick info grid */}
            <div className="grid grid-cols-2 gap-3">
              {sheetData.product_reference && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Tag className="h-5 w-5 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Référence</p><p className="font-medium">{sheetData.product_reference}</p></div>
                </div>
              )}
              {sheetData.net_weight && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Poids net</p><p className="font-medium">{sheetData.net_weight} {sheetData.net_weight_unit}</p></div>
                </div>
              )}
              {sheetData.dlc_ddm_days && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">{sheetData.dlc_ddm_type || 'DLC'}</p><p className="font-medium">{sheetData.dlc_ddm_days} jours</p></div>
                </div>
              )}
              {sheetData.snapshot_recipe_name && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div><p className="text-xs text-muted-foreground">Recette source</p><p className="font-medium">{sheetData.snapshot_recipe_name}</p></div>
                </div>
              )}
            </div>

            {/* Allergens */}
            {snapshotAllergens && (snapshotAllergens.main?.length || snapshotAllergens.secondary?.length) ? (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <h4 className="font-medium">Allergènes</h4>
                  </div>
                  {snapshotAllergens.main && snapshotAllergens.main.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {snapshotAllergens.main.map((allergen: string) => (
                        <Badge key={allergen} variant="destructive">{allergen.toUpperCase()}</Badge>
                      ))}
                    </div>
                  )}
                  {snapshotAllergens.secondary && snapshotAllergens.secondary.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      <span className="text-sm text-muted-foreground">Traces:</span>
                      {snapshotAllergens.secondary.map((allergen: string) => (
                        <Badge key={allergen} variant="outline" className="bg-warning/10">{allergen}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {/* ========== INCO SECTION (read-only) ========== */}
            <Separator />
            <section>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Liste des ingrédients INCO</h4>
                  {incoStatusBadge()}
                  {incoVersion > 0 && <Badge variant="outline" className="text-xs">v{incoVersion}</Badge>}
                </div>
              </div>

              {/* Validated = read-only message */}
              {isValidated && (
                <div className="mb-3 p-3 rounded-lg bg-muted border flex items-center gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Version INCO verrouillée. Utilisez le bouton modifier (crayon) pour éditer.
                  </p>
                </div>
              )}

              <div
                className="text-sm p-3 bg-muted/50 rounded-lg"
                dangerouslySetInnerHTML={{ __html: incoHtml || '<em>Non disponible</em>' }}
              />

              {incoHtmlOriginal && incoHtmlOriginal !== incoHtml && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  ✏️ Liste modifiée manuellement (version originale auto-générée préservée)
                </p>
              )}

              {/* Validation info */}
              {isValidated && incoValidatedAt && (
                <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/30 space-y-1">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      Validée le {format(new Date(incoValidatedAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                  {sheetData.inco_validation_comment && (
                    <p className="text-sm text-muted-foreground mt-1">{sheetData.inco_validation_comment}</p>
                  )}
                </div>
              )}

              {/* Validate action */}
              {isDraft && (
                <div className="mt-3">
                  <Button onClick={() => setIsValidateDialogOpen(true)}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Valider la version INCO
                  </Button>
                </div>
              )}

              {/* Technical list - expandable */}
              {snapshotIngredients && snapshotIngredients.length > 0 && (
                <details className="mt-3 group">
                  <summary className="cursor-pointer text-sm text-primary hover:underline">
                    Voir la liste technique complète
                  </summary>
                  <div className="mt-2 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap">
                    {(() => {
                      const allAllergens = [...new Set(snapshotIngredients.flatMap((ing: any) => ing.allergens || []))];
                      const lists = generateIngredientLists(snapshotIngredients as any, allAllergens as string[]);
                      return lists.technical;
                    })()}
                  </div>
                </details>
              )}
            </section>

            {/* INCO Change History */}
            <Separator />
            <section>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium flex items-center gap-2">
                  <History className="h-4 w-4" /> Historique INCO
                </h4>
                {changeLogs && changeLogs.length > 3 && (
                  <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)}>
                    {showHistory ? 'Réduire' : `Voir tout (${changeLogs.length})`}
                  </Button>
                )}
              </div>
              {!changeLogs || changeLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Aucune modification enregistrée</p>
              ) : (
                <div className="space-y-2">
                  {(showHistory ? changeLogs : changeLogs.slice(0, 3)).map(log => (
                    <div key={log.id} className="text-xs p-2 bg-muted/30 rounded border space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {log.action === 'manual_edit' && '✏️ Modification manuelle'}
                          {log.action === 'validation' && '✅ Validation'}
                          {log.action === 'archive' && '📦 Archivage'}
                          {log.action === 'regeneration' && '🔄 Régénération'}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Par: {userNames?.[log.user_id] || log.user_id.substring(0, 8)}
                      </div>
                      {log.allergens_removed && log.allergens_removed.length > 0 && (
                        <div className="flex items-center gap-1 text-destructive">
                          <ShieldAlert className="h-3 w-3" />
                          Allergènes retirés: {log.allergens_removed.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Nutrition */}
            {snapshotNutrition && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-3">Valeurs nutritionnelles (pour 100g)</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody>
                        <tr className="border-b"><td className="py-2 font-medium">Énergie</td><td className="py-2 text-right">{snapshotNutrition.energyKcal?.toFixed(0) || '—'} kcal / {snapshotNutrition.energyKj?.toFixed(0) || '—'} kJ</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium">Matières grasses</td><td className="py-2 text-right">{snapshotNutrition.fat?.toFixed(1) || '—'} g</td></tr>
                        <tr className="border-b bg-muted/30"><td className="py-2 pl-4">dont acides gras saturés</td><td className="py-2 text-right">{snapshotNutrition.saturatedFat?.toFixed(1) || '—'} g</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium">Glucides</td><td className="py-2 text-right">{snapshotNutrition.carbohydrates?.toFixed(1) || '—'} g</td></tr>
                        <tr className="border-b bg-muted/30"><td className="py-2 pl-4">dont sucres</td><td className="py-2 text-right">{snapshotNutrition.sugars?.toFixed(1) || '—'} g</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium">Fibres alimentaires</td><td className="py-2 text-right">{snapshotNutrition.fiber?.toFixed(1) || '—'} g</td></tr>
                        <tr className="border-b"><td className="py-2 font-medium">Protéines</td><td className="py-2 text-right">{snapshotNutrition.protein?.toFixed(1) || '—'} g</td></tr>
                        <tr><td className="py-2 font-medium">Sel</td><td className="py-2 text-right">{snapshotNutrition.salt?.toFixed(2) || '—'} g</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* Logistics */}
            {(sheetData.pieces_per_carton || sheetData.cartons_per_layer || sheetData.carton_dimensions || sheetData.carton_weight) && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Conditionnement</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {sheetData.pieces_per_carton && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <Box className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{sheetData.pieces_per_carton} pièces/carton</span>
                      </div>
                    )}
                    {sheetData.cartons_per_layer && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <Layers className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{sheetData.cartons_per_layer} cartons/couche</span>
                      </div>
                    )}
                    {sheetData.layers_per_pallet && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <Layers className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{sheetData.layers_per_pallet} couches/palette</span>
                      </div>
                    )}
                    {cartonsPerPallet && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <Package className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{cartonsPerPallet} cartons/palette</span>
                      </div>
                    )}
                    {sheetData.carton_weight && (
                      <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                        <Scale className="h-4 w-4 text-muted-foreground" /><span className="text-sm">Carton: {sheetData.carton_weight} kg</span>
                      </div>
                    )}
                  </div>
                  {sheetData.carton_dimensions && (
                    <p className="text-sm text-muted-foreground mt-2">Dimensions: {sheetData.carton_dimensions}</p>
                  )}
                </div>
              </>
            )}

            {/* Storage & Usage - Always visible */}
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Conservation & Mise en œuvre</h4>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Conditions de conservation</p>
                  <p className="text-sm font-medium">{sheetData.storage_instructions || (<span className="text-muted-foreground italic">Non renseigné</span>)}</p>
                </div>
                {sheetData.dlc_ddm_days && (
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">{sheetData.dlc_ddm_type || 'DLC'}</p>
                    <p className="text-sm font-medium">{sheetData.dlc_ddm_days} jours</p>
                  </div>
                )}
              </div>
              {sheetData.thawing_instructions && (
                <div>
                  <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-muted-foreground" /><h4 className="font-medium text-sm">Décongélation</h4></div>
                  <p className="text-sm text-muted-foreground">{sheetData.thawing_instructions}</p>
                </div>
              )}
              {sheetData.usage_instructions && (
                <div>
                  <h4 className="font-medium text-sm mb-2">Conseils de mise en œuvre</h4>
                  <p className="text-sm text-muted-foreground">{sheetData.usage_instructions}</p>
                </div>
              )}
            </div>

            {/* Quality comment */}
            {sheetData.quality_comment && (
              <>
                <Separator />
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h4 className="font-medium mb-2">Note qualité</h4>
                  <p className="text-sm text-muted-foreground">{sheetData.quality_comment}</p>
                </div>
              </>
            )}

            {/* Metadata */}
            <Separator />
            <div className="text-xs text-muted-foreground space-y-1">
              {sheetData.snapshot_created_at && (
                <p>Données figées le: {new Date(sheetData.snapshot_created_at).toLocaleDateString('fr-FR')}</p>
              )}
              <p>Créée le: {new Date(sheetData.created_at).toLocaleDateString('fr-FR')}</p>
              <p>Modifiée le: {new Date(sheetData.updated_at).toLocaleDateString('fr-FR')}</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Validation Dialog */}
      <Dialog open={isValidateDialogOpen} onOpenChange={setIsValidateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valider la version INCO</DialogTitle>
            <DialogDescription>
              Cette action verrouille la liste INCO. Elle ne pourra plus être modifiée. Un nouveau brouillon sera créé en cas de modification de la recette.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Commentaire (optionnel)</Label>
              <Textarea value={validationComment} onChange={(e) => setValidationComment(e.target.value)} placeholder="Remarques sur cette validation..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValidateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleValidate} disabled={validateInco.isPending}>
              {validateInco.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
