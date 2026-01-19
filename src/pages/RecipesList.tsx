import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChefHat, Calculator, Eye, Trash2, CheckCircle, FileEdit, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useRecipes, useRecipeIngredients, useDeleteRecipe, Recipe } from '@/hooks/useRecipes';
import { useBakerCalculations } from '@/hooks/useBakerCalculations';
import { useNutriScore, getNutriScoreColor, getNutriScoreTextColor } from '@/hooks/useNutriScore';
import { cn } from '@/lib/utils';

export default function RecipesList() {
  const navigate = useNavigate();
  const { data: recipes, isLoading } = useRecipes();
  const deleteRecipe = useDeleteRecipe();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [deleteRecipeId, setDeleteRecipeId] = useState<string | null>(null);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recettes</h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos recettes et calculez les quantités de production
          </p>
        </div>
        <Button onClick={() => navigate('/products/new-recipe')}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle recette
        </Button>
      </div>

      {/* Recipes grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : recipes?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ChefHat className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune recette</h3>
            <p className="text-muted-foreground text-center mb-4">
              Créez votre première recette pour commencer
            </p>
            <Button onClick={() => navigate('/products/new-recipe')}>
              <Plus className="h-4 w-4 mr-2" />
              Créer une recette
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes?.map((recipe) => (
            <Card 
              key={recipe.id} 
              className={cn(
                "hover:shadow-md transition-shadow cursor-pointer",
                !recipe.is_active && "opacity-60"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                    {recipe.code && (
                      <CardDescription className="font-mono">{recipe.code}</CardDescription>
                    )}
                  </div>
                  <Badge 
                    variant={recipe.status === 'validated' ? 'default' : 'secondary'}
                    className={cn(
                      recipe.status === 'validated' && "bg-success text-success-foreground"
                    )}
                  >
                    {recipe.status === 'validated' ? (
                      <>
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Validée
                      </>
                    ) : (
                      <>
                        <FileEdit className="h-3 w-3 mr-1" />
                        Brouillon
                      </>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {recipe.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {recipe.description}
                  </p>
                )}
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <span>Ratio cuisson: {recipe.baking_ratio || 0.9}</span>
                  {recipe.process_losses > 0 && (
                    <span>• Pertes: {recipe.process_losses}%</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setSelectedRecipe(recipe);
                      setCalcDialogOpen(true);
                    }}
                  >
                    <Calculator className="h-4 w-4 mr-1" />
                    Calculer
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate(`/products/recipes/${recipe.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setDeleteRecipeId(recipe.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Calculation Dialog */}
      {selectedRecipe && (
        <RecipeCalculationDialog
          recipe={selectedRecipe}
          open={calcDialogOpen}
          onClose={() => {
            setCalcDialogOpen(false);
            setSelectedRecipe(null);
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteRecipeId} onOpenChange={() => setDeleteRecipeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la recette ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les ingrédients et données associées seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (deleteRecipeId) {
                  deleteRecipe.mutate(deleteRecipeId);
                  setDeleteRecipeId(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Calculation Dialog Component
function RecipeCalculationDialog({ 
  recipe, 
  open, 
  onClose 
}: { 
  recipe: Recipe; 
  open: boolean; 
  onClose: () => void;
}) {
  const { data: ingredients } = useRecipeIngredients(recipe.id);
  const [flourQuantity, setFlourQuantity] = useState('100');
  const [unitWeight, setUnitWeight] = useState('');

  const calculation = useBakerCalculations(
    ingredients,
    parseFloat(flourQuantity) || 0,
    parseFloat(unitWeight) || 0,
    recipe.baking_ratio || 0.9,
    recipe.process_losses || 0
  );

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(18);
    doc.text(recipe.name, pageWidth / 2, 20, { align: 'center' });
    
    if (recipe.code) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Code: ${recipe.code}`, pageWidth / 2, 28, { align: 'center' });
    }
    
    // Flour quantity info
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Base farines: ${flourQuantity} kg`, 14, 40);
    
    // Ingredients table (without prices)
    autoTable(doc, {
      startY: 48,
      head: [['Ingrédient', '%', 'Quantité (kg)']],
      body: calculation.ingredients.map((ing) => [
        ing.ingredientName,
        `${ing.bakerPercentage}%`,
        ing.quantityKg.toFixed(2),
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [80, 80, 80] },
    });
    
    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Poids pâte cru: ${calculation.rawDoughWeightKg.toFixed(2)} kg`, 14, finalY);
    doc.text(`Poids après cuisson: ${calculation.cookedWeightKg.toFixed(2)} kg`, 14, finalY + 7);
    
    if (parseFloat(unitWeight) > 0) {
      doc.text(`Nombre de pièces: ${calculation.numberOfPieces}`, 14, finalY + 14);
    }
    
    // Footer with date
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, doc.internal.pageSize.getHeight() - 10);
    
    doc.save(`recette-${recipe.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{recipe.name} - Calculs de production</DialogTitle>
              <DialogDescription>
                Saisissez la quantité de farine et le poids unitaire pour calculer la production
              </DialogDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleExportPDF}
              disabled={calculation.ingredients.length === 0}
            >
              <FileDown className="h-4 w-4 mr-1" />
              PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label>Quantité totale de farines (kg)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={flourQuantity}
              onChange={(e) => setFlourQuantity(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Base 100% pour le calcul</p>
          </div>
          <div className="space-y-2">
            <Label>Poids unitaire produit (g)</Label>
            <Input
              type="number"
              step="1"
              min="0"
              value={unitWeight}
              onChange={(e) => setUnitWeight(e.target.value)}
              placeholder="Optionnel"
            />
          </div>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {/* Quantities */}
          <div>
            <h4 className="font-medium mb-3">Quantités par ingrédient</h4>
            <div className="rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3">Ingrédient</th>
                    <th className="text-right p-3">%</th>
                    <th className="text-right p-3">Quantité (kg)</th>
                    <th className="text-right p-3">Coût (€)</th>
                  </tr>
                </thead>
                <tbody>
                  {calculation.ingredients.map((ing, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-3">{ing.ingredientName}</td>
                      <td className="text-right p-3 font-mono">{ing.bakerPercentage}%</td>
                      <td className="text-right p-3 font-mono">{ing.quantityKg.toFixed(2)}</td>
                      <td className="text-right p-3 font-mono">{ing.costEuros.toFixed(2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Poids pâte cru</p>
                <p className="text-2xl font-bold">{calculation.rawDoughWeightKg.toFixed(2)} kg</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Poids après cuisson</p>
                <p className="text-2xl font-bold">{calculation.cookedWeightKg.toFixed(2)} kg</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Nombre de pièces</p>
                <p className="text-2xl font-bold">{calculation.numberOfPieces}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">Coût total</p>
                <p className="text-2xl font-bold">{calculation.totalCost.toFixed(2)} €</p>
              </CardContent>
            </Card>
          </div>

          {/* Cost per piece */}
          <div className="p-4 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium">Coût de revient par pièce</span>
              <span className="text-2xl font-bold text-primary">
                {calculation.costPerPiece.toFixed(3)} €
              </span>
            </div>
          </div>

          {/* Nutritional values */}
          <div>
            <h4 className="font-medium mb-3">Valeurs nutritionnelles pour 100g de produit fini</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Énergie (kcal)</p>
                <p className="font-mono font-medium">{calculation.nutritionPer100g.energyKcal.toFixed(0)} kcal</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Énergie (kJ)</p>
                <p className="font-mono font-medium">{calculation.nutritionPer100g.energyKj.toFixed(0)} kJ</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Lipides</p>
                <p className="font-mono font-medium">{calculation.nutritionPer100g.fat.toFixed(1)} g</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">dont saturés</p>
                <p className="font-mono font-medium">{calculation.nutritionPer100g.saturatedFat.toFixed(1)} g</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Glucides</p>
                <p className="font-mono font-medium">{calculation.nutritionPer100g.carbohydrates.toFixed(1)} g</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">dont sucres</p>
                <p className="font-mono font-medium">{calculation.nutritionPer100g.sugars.toFixed(1)} g</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Fibres</p>
                <p className="font-mono font-medium">{calculation.nutritionPer100g.fiber.toFixed(1)} g</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Protéines</p>
                <p className="font-mono font-medium">{calculation.nutritionPer100g.protein.toFixed(1)} g</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Sel</p>
                <p className="font-mono font-medium">{calculation.nutritionPer100g.salt.toFixed(2)} g</p>
              </div>
            </div>
          </div>

          {/* Nutri-Score */}
          <NutriScoreDisplay nutrition={calculation.nutritionPer100g} />

          {/* Allergens */}
          {(calculation.allAllergens.length > 0 || calculation.allAllergensSecondary.length > 0) && (
            <div>
              <h4 className="font-medium mb-3">Allergènes</h4>
              <div className="space-y-2">
                {calculation.allAllergens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {calculation.allAllergens.map((allergen) => (
                      <Badge key={allergen} variant="destructive">
                        {allergen.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                )}
                {calculation.allAllergensSecondary.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-sm text-muted-foreground">Traces:</span>
                    {calculation.allAllergensSecondary.map((allergen) => (
                      <Badge key={allergen} variant="outline" className="bg-warning/10">
                        {allergen}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Nutri-Score Display Component
function NutriScoreDisplay({ nutrition }: { nutrition: { energyKj: number; sugars: number; saturatedFat: number; salt: number; fiber: number; protein: number } }) {
  const nutriScore = useNutriScore(nutrition);

  if (!nutriScore) return null;

  const grades: Array<'A' | 'B' | 'C' | 'D' | 'E'> = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div>
      <h4 className="font-medium mb-3">Nutri-Score</h4>
      <div className="flex items-center gap-1">
        {grades.map((grade) => (
          <div
            key={grade}
            className={cn(
              "w-10 h-10 flex items-center justify-center font-bold text-lg rounded transition-all",
              getNutriScoreColor(grade),
              getNutriScoreTextColor(grade),
              nutriScore.grade === grade 
                ? "scale-125 ring-2 ring-offset-2 ring-gray-400" 
                : "opacity-40"
            )}
          >
            {grade}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Score: {nutriScore.score} (N: {nutriScore.negativePoints} - P: {nutriScore.positivePoints})
      </p>
    </div>
  );
}
