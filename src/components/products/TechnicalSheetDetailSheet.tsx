import { useState } from 'react';
import { 
  FileText, 
  Scale, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  Barcode,
  Package,
  Thermometer,
  Download,
  Printer,
  Clock,
  Layers,
  Box,
  Tag,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ProductSheet } from '@/hooks/useRecipes';
import { generateTechnicalSheetPDF, printTechnicalSheet } from '@/lib/technicalSheetPdf';
import { generateIngredientLists, markdownToUppercase } from '@/lib/ingredientListGenerator';
import { OptimizedImage } from '@/components/ui/OptimizedImage';

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

  if (!sheet) return null;

  const sheetData = sheet as any;

  // Parse snapshot data
  const snapshotNutrition: SnapshotNutrition | null = sheetData.snapshot_nutrition;
  const snapshotAllergens = sheetData.snapshot_allergens as { main?: string[]; secondary?: string[] } | null;
  const snapshotIngredients = sheetData.snapshot_ingredients as Array<{
    name: string;
    composition: string | null;
    bakerPercentage: number;
    allergens: string[];
  }> | null;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateTechnicalSheetPDF(sheet);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = async () => {
    await printTechnicalSheet(sheet);
  };

  // Calculate total cartons per pallet
  const cartonsPerPallet = sheetData.cartons_per_layer && sheetData.layers_per_pallet 
    ? sheetData.cartons_per_layer * sheetData.layers_per_pallet 
    : null;

  return (
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
                  {sheetData.brand && <span>{sheetData.brand}</span>}
                  {sheetData.version && (
                    <Badge variant="outline">v{sheetData.version}</Badge>
                  )}
                  {sheetData.is_published ? (
                    <Badge className="bg-success/10 text-success border-success/30">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Validée
                    </Badge>
                  ) : (
                    <Badge variant="outline">Brouillon</Badge>
                  )}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimer
              </Button>
              <Button size="sm" onClick={handleExportPDF} disabled={isExporting}>
                <Download className="h-4 w-4 mr-1" />
                {isExporting ? 'Export...' : 'PDF'}
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Product Image - Force white background for PNG transparency */}
          {sheetData.product_image_url && (
            <div className="w-full h-48 rounded-lg overflow-hidden border bg-white-force">
              <img 
                src={sheetData.product_image_url} 
                alt={sheetData.product_name}
                className="w-full h-full object-contain bg-white-force"
                loading="lazy"
              />
            </div>
          )}

          {/* Quick info grid */}
          <div className="grid grid-cols-2 gap-3">
            {sheetData.product_reference && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Tag className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Référence</p>
                  <p className="font-medium">{sheetData.product_reference}</p>
                </div>
              </div>
            )}
            {sheetData.barcode && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Barcode className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Code-barres</p>
                  <p className="font-mono text-sm">{sheetData.barcode}</p>
                </div>
              </div>
            )}
            {sheetData.net_weight && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Poids net</p>
                  <p className="font-medium">{sheetData.net_weight} {sheetData.net_weight_unit}</p>
                </div>
              </div>
            )}
            {sheetData.dlc_ddm_days && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">{sheetData.dlc_ddm_type || 'DLC'}</p>
                  <p className="font-medium">{sheetData.dlc_ddm_days} jours</p>
                </div>
              </div>
            )}
            {sheetData.origin_country && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Origine</p>
                  <p className="font-medium">{sheetData.origin_country}</p>
                </div>
              </div>
            )}
            {sheetData.snapshot_recipe_name && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Recette source</p>
                  <p className="font-medium">{sheetData.snapshot_recipe_name}</p>
                </div>
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
                      <Badge key={allergen} variant="destructive">
                        {allergen.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                )}
                {snapshotAllergens.secondary && snapshotAllergens.secondary.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Traces:</span>
                    {snapshotAllergens.secondary.map((allergen: string) => (
                      <Badge key={allergen} variant="outline" className="bg-warning/10">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}

          {/* Ingredients declaration - Condensed INCO version */}
          {sheetData.ingredients_declaration && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Liste des ingrédients (étiquette INCO)</h4>
                <p 
                  className="text-sm text-muted-foreground whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: sheetData.ingredients_declaration }}
                />
                
                {/* Technical list - expandable */}
                {snapshotIngredients && snapshotIngredients.length > 0 && (
                  <details className="mt-3 group">
                    <summary className="cursor-pointer text-sm text-primary hover:underline">
                      Voir la liste technique complète
                    </summary>
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground whitespace-pre-wrap">
                      {(() => {
                        const allAllergens = [...new Set(
                          snapshotIngredients.flatMap((ing: any) => ing.allergens || [])
                        )];
                        const lists = generateIngredientLists(snapshotIngredients as any, allAllergens as string[]);
                        return lists.technical;
                      })()}
                    </div>
                  </details>
                )}
              </div>
            </>
          )}

          {/* Nutrition */}
          {snapshotNutrition && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Valeurs nutritionnelles (pour 100g)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 font-medium">Énergie</td>
                        <td className="py-2 text-right">
                          {snapshotNutrition.energyKcal?.toFixed(0) || '—'} kcal / {snapshotNutrition.energyKj?.toFixed(0) || '—'} kJ
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">Matières grasses</td>
                        <td className="py-2 text-right">{snapshotNutrition.fat?.toFixed(1) || '—'} g</td>
                      </tr>
                      <tr className="border-b bg-muted/30">
                        <td className="py-2 pl-4">dont acides gras saturés</td>
                        <td className="py-2 text-right">{snapshotNutrition.saturatedFat?.toFixed(1) || '—'} g</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">Glucides</td>
                        <td className="py-2 text-right">{snapshotNutrition.carbohydrates?.toFixed(1) || '—'} g</td>
                      </tr>
                      <tr className="border-b bg-muted/30">
                        <td className="py-2 pl-4">dont sucres</td>
                        <td className="py-2 text-right">{snapshotNutrition.sugars?.toFixed(1) || '—'} g</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">Fibres alimentaires</td>
                        <td className="py-2 text-right">{snapshotNutrition.fiber?.toFixed(1) || '—'} g</td>
                      </tr>
                      <tr className="border-b">
                        <td className="py-2 font-medium">Protéines</td>
                        <td className="py-2 text-right">{snapshotNutrition.protein?.toFixed(1) || '—'} g</td>
                      </tr>
                      <tr>
                        <td className="py-2 font-medium">Sel</td>
                        <td className="py-2 text-right">{snapshotNutrition.salt?.toFixed(2) || '—'} g</td>
                      </tr>
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
                      <Box className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{sheetData.pieces_per_carton} pièces/carton</span>
                    </div>
                  )}
                  {sheetData.cartons_per_layer && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{sheetData.cartons_per_layer} cartons/couche</span>
                    </div>
                  )}
                  {sheetData.layers_per_pallet && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{sheetData.layers_per_pallet} couches/palette</span>
                    </div>
                  )}
                  {cartonsPerPallet && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{cartonsPerPallet} cartons/palette</span>
                    </div>
                  )}
                  {sheetData.carton_weight && (
                    <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Carton: {sheetData.carton_weight} kg</span>
                    </div>
                  )}
                </div>
                {sheetData.carton_dimensions && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Dimensions: {sheetData.carton_dimensions}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Storage & Usage */}
          {(sheetData.storage_instructions || sheetData.thawing_instructions || sheetData.usage_instructions) && (
            <>
              <Separator />
              <div className="space-y-4">
                {sheetData.storage_instructions && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Conservation</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{sheetData.storage_instructions}</p>
                  </div>
                )}
                {sheetData.thawing_instructions && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <h4 className="font-medium">Décongélation</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{sheetData.thawing_instructions}</p>
                  </div>
                )}
                {sheetData.usage_instructions && (
                  <div>
                    <h4 className="font-medium mb-2">Mise en œuvre</h4>
                    <p className="text-sm text-muted-foreground">{sheetData.usage_instructions}</p>
                  </div>
                )}
              </div>
            </>
          )}

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
  );
}
