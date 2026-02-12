import { useState, useEffect, useRef } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CartonLabel,
  useValidateCartonLabel,
  useRefreshCartonLabelSnapshot,
  useUpdateIncoHtml,
} from '@/hooks/useCartonLabels';
import { useIncoChangeLogs, useLogIncoChange } from '@/hooks/useIncoChangeLogs';
import { useOperatorNames } from '@/hooks/useOperatorNames';
import {
  Check, X, RefreshCw, Printer, CheckCircle, AlertTriangle,
  Recycle, Loader2, Eye, Edit3, Save, RotateCcw, History,
  ShieldAlert, Lock, Archive,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CartonLabelPreview } from './CartonLabelPreview';

// Known allergens for detection
const KNOWN_ALLERGENS = [
  'GLUTEN', 'BLÉ', 'BLE', 'SEIGLE', 'ORGE', 'AVOINE', 'ÉPEAUTRE', 'EPEAUTRE',
  'FROMENT', 'CRUSTACÉS', 'CRUSTACES', 'ŒUF', 'OEUF', 'ŒUFS', 'OEUFS',
  'POISSON', 'POISSONS', 'ARACHIDE', 'ARACHIDES', 'SOJA',
  'LAIT', 'LACTOSE', 'LACTOSÉRUM', 'LACTOSERUM', 'BEURRE', 'CRÈME', 'CREME',
  'FRUITS À COQUE', 'NOIX', 'NOISETTE', 'NOISETTES', 'AMANDE', 'AMANDES',
  'CÉLERI', 'CELERI', 'MOUTARDE', 'SÉSAME', 'SESAME',
  'SULFITES', 'LUPIN', 'LUPINS', 'MOLLUSQUES',
];

function extractAllergensFromHtml(html: string): string[] {
  // Extract text in <strong> tags (allergens are bolded)
  const matches = html.match(/<strong>([^<]+)<\/strong>/g) || [];
  return matches.map(m => m.replace(/<\/?strong>/g, '').toUpperCase());
}

function detectRemovedAllergens(originalHtml: string, editedHtml: string): string[] {
  const originalAllergens = extractAllergensFromHtml(originalHtml);
  const editedAllergens = extractAllergensFromHtml(editedHtml);
  const editedUpper = editedHtml.toUpperCase();

  return originalAllergens.filter(a => {
    // Check if the allergen text still appears in the edited version
    return !editedUpper.includes(a) && !editedAllergens.includes(a);
  });
}

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
  const updateIncoHtml = useUpdateIncoHtml();
  const logChange = useLogIncoChange();

  const { data: changeLogs } = useIncoChangeLogs(label?.id);
  const logUserIds = changeLogs?.map(l => l.user_id) || [];
  const { data: userNames } = useOperatorNames(logUserIds);

  const [isValidateDialogOpen, setIsValidateDialogOpen] = useState(false);
  const [validationComment, setValidationComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedHtml, setEditedHtml] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [allergenWarning, setAllergenWarning] = useState<string[] | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  // Reset editing state when label changes
  useEffect(() => {
    if (label) {
      setIsEditing(false);
      setEditedHtml(label.snapshot_ingredients_html || '');
    }
  }, [label?.id, label?.snapshot_ingredients_html]);

  if (!label) return null;

  const nutrition = label.snapshot_nutrition as Record<string, number> | null;
  const secondaryAllergens = label.snapshot_allergens_secondary as string[] | null;
  const isDraft = label.status === 'draft';
  const isValidated = label.status === 'validated';
  const isArchived = label.status === 'archived';

  const sheetVersion = label.product_sheets?.version;
  const snapshotVersion = label.snapshot_product_sheet_version;
  const isOutdated = sheetVersion && snapshotVersion && sheetVersion > snapshotVersion;

  const handleStartEdit = () => {
    setEditedHtml(label.snapshot_ingredients_html || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedHtml(label.snapshot_ingredients_html || '');
    setAllergenWarning(null);
  };

  const handleSaveEdit = async () => {
    const originalHtml = label.snapshot_ingredients_html || '';
    
    // Detect removed allergens
    const removed = detectRemovedAllergens(originalHtml, editedHtml);
    if (removed.length > 0 && !allergenWarning) {
      setAllergenWarning(removed);
      return; // Show warning first
    }

    await updateIncoHtml.mutateAsync({ id: label.id, html: editedHtml });
    await logChange.mutateAsync({
      carton_label_id: label.id,
      action: 'manual_edit',
      html_before: originalHtml,
      html_after: editedHtml,
      allergens_removed: removed,
    });

    setIsEditing(false);
    setAllergenWarning(null);
  };

  const handleConfirmAllergenRemoval = async () => {
    const originalHtml = label.snapshot_ingredients_html || '';
    const removed = detectRemovedAllergens(originalHtml, editedHtml);

    await updateIncoHtml.mutateAsync({ id: label.id, html: editedHtml });
    await logChange.mutateAsync({
      carton_label_id: label.id,
      action: 'manual_edit',
      html_before: originalHtml,
      html_after: editedHtml,
      allergens_removed: removed,
    });

    setIsEditing(false);
    setAllergenWarning(null);
  };

  const handleValidate = async () => {
    await validateLabel.mutateAsync({
      id: label.id,
      comment: validationComment || undefined,
    });

    await logChange.mutateAsync({
      carton_label_id: label.id,
      action: 'validation',
      html_before: null,
      html_after: label.snapshot_ingredients_html,
    });

    setIsValidateDialogOpen(false);
    setValidationComment('');
  };

  const handleRefresh = async () => {
    const oldHtml = label.snapshot_ingredients_html;
    await refreshSnapshot.mutateAsync(label.id);
    await logChange.mutateAsync({
      carton_label_id: label.id,
      action: 'regeneration',
      html_before: oldHtml,
      html_after: null,
    });
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-2 flex-wrap">
              <SheetTitle className="text-xl">{label.label_title}</SheetTitle>
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
                  Recette modifiée. Validation INCO requise.
                </p>
                <p className="text-xs text-muted-foreground">
                  La fiche technique a été mise à jour (v{sheetVersion}). Actualisez les données avant validation.
                </p>
                <Button size="sm" variant="outline" onClick={handleRefresh} disabled={refreshSnapshot.isPending}>
                  {refreshSnapshot.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Actualiser les données
                </Button>
              </div>
            </div>
          )}

          {/* Validated = read-only message */}
          {isValidated && (
            <div className="mt-4 p-3 rounded-lg bg-muted border flex items-center gap-3">
              <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Les versions INCO validées ne peuvent pas être modifiées.
              </p>
            </div>
          )}

          {/* Archived message */}
          {isArchived && (
            <div className="mt-4 p-3 rounded-lg bg-muted border flex items-center gap-3">
              <Archive className="h-5 w-5 text-muted-foreground shrink-0" />
              <p className="text-sm text-muted-foreground">
                Version archivée. Une nouvelle version brouillon a été créée suite à une modification de recette.
              </p>
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
            {/* INCO Ingredient List with Editor */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Liste des ingrédients INCO</h3>
                {isDraft && !isEditing && (
                  <Button size="sm" variant="outline" onClick={handleStartEdit}>
                    <Edit3 className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div
                    ref={editorRef}
                    contentEditable
                    className="text-sm p-3 bg-background rounded-lg border-2 border-primary/50 focus:outline-none focus:border-primary min-h-[100px]"
                    dangerouslySetInnerHTML={{ __html: editedHtml }}
                    onInput={(e) => setEditedHtml(e.currentTarget.innerHTML)}
                  />
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Les allergènes doivent rester en <strong>gras</strong>. Utilisez la barre d'outils du navigateur ou les balises &lt;strong&gt; pour le gras.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveEdit} disabled={updateIncoHtml.isPending}>
                      {updateIncoHtml.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  className="text-sm p-3 bg-muted/50 rounded-lg"
                  dangerouslySetInnerHTML={{
                    __html: label.snapshot_ingredients_html || '<em>Non disponible</em>',
                  }}
                />
              )}

              {/* Show if manually edited */}
              {label.snapshot_ingredients_html_original && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  ✏️ Liste modifiée manuellement (version originale auto-générée préservée)
                </p>
              )}
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

            {/* Net weight */}
            <section>
              <h3 className="font-semibold mb-2">Poids net</h3>
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-2xl font-bold">
                  {label.snapshot_net_weight} {label.snapshot_net_weight_unit}
                </span>
              </div>
            </section>

            <Separator />

            {/* Storage */}
            {label.snapshot_storage_instructions && (
              <>
                <section>
                  <h3 className="font-semibold mb-2">Mode de conservation</h3>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg">{label.snapshot_storage_instructions}</p>
                </section>
                <Separator />
              </>
            )}

            {/* Thawing */}
            {label.snapshot_thawing_instructions && (
              <>
                <section>
                  <h3 className="font-semibold mb-2">Mode de décongélation</h3>
                  <p className="text-sm p-3 bg-muted/50 rounded-lg">{label.snapshot_thawing_instructions}</p>
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

            {/* Change History */}
            <Separator />
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Historique des modifications
                </h3>
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
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap gap-2">
            {isDraft && !isOutdated && (
              <Button onClick={() => setIsValidateDialogOpen(true)}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Valider la version INCO
              </Button>
            )}
            {isValidated && (
              <Button onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
            )}
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
              <Textarea
                value={validationComment}
                onChange={(e) => setValidationComment(e.target.value)}
                placeholder="Remarques sur cette validation..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsValidateDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleValidate} disabled={validateLabel.isPending}>
              {validateLabel.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Valider
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allergen Removal Warning */}
      <AlertDialog open={!!allergenWarning} onOpenChange={(o) => !o && setAllergenWarning(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" />
              Allergènes supprimés
            </AlertDialogTitle>
            <AlertDialogDescription>
              Les allergènes suivants ont été retirés de la liste INCO :<br />
              <strong className="text-destructive">{allergenWarning?.join(', ')}</strong>
              <br /><br />
              Êtes-vous sûr de vouloir enregistrer cette modification ? Le retrait d'allergènes peut avoir des implications réglementaires graves.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAllergenWarning(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAllergenRemoval}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
