import { useState } from 'react';
import { Plus, Trash2, Scale, AlertTriangle, ChefHat, Beaker } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useRecipeIngredients,
  useRecipeNutrition,
  useDeleteRecipeIngredient,
  Recipe,
} from '@/hooks/useRecipes';
import { IngredientFormDialog } from './IngredientFormDialog';
import { NutritionTable } from './NutritionTable';

interface RecipeDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
}

export function RecipeDetailSheet({ open, onOpenChange, recipe }: RecipeDetailSheetProps) {
  const { data: ingredients, isLoading: loadingIngredients } = useRecipeIngredients(recipe?.id);
  const { data: nutrition } = useRecipeNutrition(recipe?.id);
  const deleteIngredient = useDeleteRecipeIngredient();
  
  const [isAddIngredientOpen, setIsAddIngredientOpen] = useState(false);

  if (!recipe) return null;

  // Collect all unique allergens from ingredients
  const allAllergens = ingredients?.reduce((acc, ing) => {
    const allergens = ing.raw_materials?.allergens || [];
    allergens.forEach(a => {
      if (!acc.includes(a)) acc.push(a);
    });
    return acc;
  }, [] as string[]) || [];

  const handleDeleteIngredient = async (id: string) => {
    await deleteIngredient.mutateAsync({ id, recipeId: recipe.id });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <ChefHat className="h-6 w-6 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left">{recipe.name}</SheetTitle>
                <SheetDescription className="text-left">
                  {recipe.code && <Badge variant="outline" className="mr-2">{recipe.code}</Badge>}
                  {recipe.category}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Recipe info */}
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Scale className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Rendement</p>
                <p className="text-sm text-muted-foreground">
                  {recipe.yield_quantity} {recipe.yield_unit}
                </p>
              </div>
            </div>

            {recipe.description && (
              <div>
                <h4 className="font-medium mb-2">Description</h4>
                <p className="text-sm text-muted-foreground">{recipe.description}</p>
              </div>
            )}

            <Separator />

            {/* Allergens */}
            {allAllergens.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <h4 className="font-medium">Allergènes</h4>
                </div>
                <div className="flex flex-wrap gap-2">
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
              </div>
            )}

            <Separator />

            {/* Ingredients */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">Ingrédients</h4>
                <Button size="sm" variant="outline" onClick={() => setIsAddIngredientOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>

              {loadingIngredients ? (
                <p className="text-sm text-muted-foreground">Chargement...</p>
              ) : ingredients?.length === 0 ? (
                <div className="text-center py-8 border border-dashed rounded-lg">
                  <p className="text-sm text-muted-foreground mb-3">
                    Aucun ingrédient ajouté
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setIsAddIngredientOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter un ingrédient
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Matière première</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                    {ingredients?.map((ingredient) => {
                      // Check if this is an intermediate recipe ingredient
                      const isIntermediate = !!ingredient.ingredient_recipe_id;
                      // Debug log to verify data structure
                      if (isIntermediate) {
                        console.log('PI ingredient:', ingredient.id, 'ingredient_recipe:', ingredient.ingredient_recipe);
                      }
                      const name = isIntermediate 
                        ? (ingredient.ingredient_recipe?.name || 'PI sans nom')
                        : ingredient.raw_materials?.name;
                      const subtitle = isIntermediate 
                        ? 'Produit intermédiaire' 
                        : ingredient.raw_materials?.suppliers?.name;
                      
                      return (
                        <TableRow key={ingredient.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isIntermediate && (
                                <Beaker className="h-4 w-4 text-amber-600 flex-shrink-0" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{name || 'Inconnu'}</p>
                                  {isIntermediate && (
                                    <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">PI</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {subtitle}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {ingredient.quantity} {ingredient.unit}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteIngredient(ingredient.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>

            <Separator />

            {/* Nutrition */}
            <NutritionTable nutrition={nutrition} />

            {/* Preparation notes */}
            {recipe.preparation_notes && (
              <>
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Notes de préparation</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {recipe.preparation_notes}
                  </p>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Ingredient Dialog */}
      <IngredientFormDialog
        open={isAddIngredientOpen}
        onOpenChange={setIsAddIngredientOpen}
        recipeId={recipe.id}
      />
    </>
  );
}
