import { FileText, Scale, Calendar, MapPin, AlertTriangle, Barcode, Download, Printer } from 'lucide-react';
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
import { useRecipeNutrition, useRecipeIngredients } from '@/hooks/useRecipes';
import { NutritionTable } from './NutritionTable';
import { generateTechnicalSheetPDF } from '@/lib/technicalSheetPdf';

interface ProductSheetDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: any;
}

export function ProductSheetDetailSheet({ open, onOpenChange, sheet }: ProductSheetDetailSheetProps) {
  const { data: nutrition } = useRecipeNutrition(sheet?.recipe_id);
  const { data: ingredients } = useRecipeIngredients(sheet?.recipe_id);

  if (!sheet) return null;

  // Collect allergens from recipe ingredients
  const allAllergens = ingredients?.reduce((acc, ing) => {
    const allergens = ing.raw_materials?.allergens || [];
    allergens.forEach(a => {
      if (!acc.includes(a)) acc.push(a);
    });
    return acc;
  }, [] as string[]) || [];

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    await generateTechnicalSheetPDF(sheet);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left">{sheet.product_name}</SheetTitle>
                <SheetDescription className="text-left">
                  
                  {sheet.recipes?.name && (
                    <Badge variant="outline">Recette: {sheet.recipes.name}</Badge>
                  )}
                </SheetDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimer
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPdf}>
                <Download className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Quick info */}
          <div className="grid grid-cols-2 gap-4">
            {sheet.net_weight && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Scale className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Poids net</p>
                  <p className="font-medium">{sheet.net_weight} {sheet.net_weight_unit}</p>
                </div>
              </div>
            )}
            {sheet.shelf_life_days && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Durée de vie</p>
                  <p className="font-medium">{sheet.shelf_life_days} jours</p>
                </div>
              </div>
            )}
          </div>

          {/* Allergens */}
          {(allAllergens.length > 0 || sheet.allergen_statement) && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h4 className="font-medium">Allergènes</h4>
                </div>
                {allAllergens.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {allAllergens.map((allergen) => (
                      <Badge
                        key={allergen}
                        variant="outline"
                        className="bg-warning/10 text-warning border-warning/30"
                      >
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                )}
                {sheet.allergen_statement && (
                  <p className="text-sm text-muted-foreground">
                    {sheet.allergen_statement}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Ingredients declaration */}
          {sheet.ingredients_declaration && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-2">Liste des ingrédients</h4>
                <p className="text-sm">{sheet.ingredients_declaration}</p>
              </div>
            </>
          )}

          {/* Nutrition */}
          <Separator />
          <NutritionTable nutrition={nutrition} />

          {/* Storage & Usage */}
          {(sheet.storage_instructions || sheet.usage_instructions) && (
            <>
              <Separator />
              <div className="space-y-4">
                {sheet.storage_instructions && (
                  <div>
                    <h4 className="font-medium mb-2">Conservation</h4>
                    <p className="text-sm text-muted-foreground">
                      {sheet.storage_instructions}
                    </p>
                  </div>
                )}
                {sheet.usage_instructions && (
                  <div>
                    <h4 className="font-medium mb-2">Conseils d'utilisation</h4>
                    <p className="text-sm text-muted-foreground">
                      {sheet.usage_instructions}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
