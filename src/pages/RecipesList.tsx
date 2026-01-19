import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChefHat, Calculator, Eye, Trash2, CheckCircle, FileEdit, FileDown, Printer, Edit2, Copy, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logoImage from '@/assets/logo-breadshop.png';
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
import { useRecipes, useRecipeIngredients, useDeleteRecipe, useDuplicateRecipe, Recipe } from '@/hooks/useRecipes';
import { useBakerCalculations } from '@/hooks/useBakerCalculations';
import { useNutriScore, getNutriScoreColor, getNutriScoreTextColor } from '@/hooks/useNutriScore';
import { cn } from '@/lib/utils';

export default function RecipesList() {
  const navigate = useNavigate();
  const { data: recipes, isLoading } = useRecipes();
  const deleteRecipe = useDeleteRecipe();
  const duplicateRecipe = useDuplicateRecipe();

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [deleteRecipeId, setDeleteRecipeId] = useState<string | null>(null);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter recipes by name or code
  const filteredRecipes = recipes?.filter((recipe) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      recipe.name.toLowerCase().includes(query) ||
      (recipe.code && recipe.code.toLowerCase().includes(query))
    );
  });

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

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
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
      ) : filteredRecipes?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ChefHat className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {searchQuery ? 'Aucun résultat' : 'Aucune recette'}
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery 
                ? `Aucune recette ne correspond à "${searchQuery}"`
                : 'Créez votre première recette pour commencer'
              }
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/products/new-recipe')}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une recette
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecipes?.map((recipe) => (
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
                    <Eye className="h-4 w-4 mr-1" />
                    Voir
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate(`/products/recipes/edit/${recipe.id}`)}
                    title="Modifier la recette"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => duplicateRecipe.mutate(recipe.id)}
                    disabled={duplicateRecipe.isPending}
                    title="Dupliquer la recette"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => setDeleteRecipeId(recipe.id)}
                    title="Supprimer la recette"
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

  // Brand colors from Breadshop identity (Slate Blue #4A5D73 = HSL 212 23% 37%)
  const brandColor: [number, number, number] = [74, 93, 115];
  const brandColorLight: [number, number, number] = [210, 220, 230];

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Logo
    try {
      doc.addImage(logoImage, 'PNG', 14, 10, 40, 15);
    } catch {
      // Fallback if logo fails
    }
    
    // Title with brand color
    doc.setFontSize(20);
    doc.setTextColor(...brandColor);
    doc.text(recipe.name, pageWidth / 2, 35, { align: 'center' });
    
    if (recipe.code) {
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Code: ${recipe.code}`, pageWidth / 2, 42, { align: 'center' });
    }
    
    // Flour quantity info
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text(`Base farines: ${flourQuantity} kg`, 14, 55);
    
    // Ingredients table (without prices)
    autoTable(doc, {
      startY: 62,
      head: [['Ingrédient', '%', 'Quantité (kg)']],
      body: calculation.ingredients.map((ing) => [
        ing.ingredientName,
        `${ing.bakerPercentage}%`,
        ing.quantityKg.toFixed(2),
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: brandColor },
      alternateRowStyles: { fillColor: brandColorLight },
    });
    
    // Summary - only number of pieces if provided
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    if (parseFloat(unitWeight) > 0) {
      doc.setFontSize(11);
      doc.text(`Poids unitaire: ${unitWeight} g  •  Nombre de pièces: ${calculation.numberOfPieces}`, 14, finalY);
    }
    
    // Footer with date and brand
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Breadshop SAS - Généré le ${new Date().toLocaleDateString('fr-FR')}`, 14, doc.internal.pageSize.getHeight() - 10);
    
    doc.save(`recette-${recipe.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  const handlePrint = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recette - ${recipe.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Inter', sans-serif; padding: 20px; color: #1a1a2e; }
          .header { display: flex; align-items: center; gap: 20px; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #4A5D73; }
          .logo { height: 50px; }
          .title { color: #4A5D73; font-size: 24px; font-weight: 700; }
          .code { color: #666; font-size: 12px; margin-top: 4px; }
          .info { margin: 15px 0; font-size: 14px; color: #333; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th { background: #4A5D73; color: white; padding: 10px; text-align: left; font-weight: 600; }
          td { padding: 8px 10px; border-bottom: 1px solid #ddd; }
          tr:nth-child(even) { background: #f5f7fa; }
          .summary { margin-top: 15px; font-size: 14px; color: #333; }
          .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 10px; color: #999; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${logoImage}" alt="Breadshop" class="logo" />
          <div>
            <div class="title">${recipe.name}</div>
            ${recipe.code ? `<div class="code">Code: ${recipe.code}</div>` : ''}
          </div>
        </div>
        <div class="info">Base farines: <strong>${flourQuantity} kg</strong></div>
        <table>
          <thead>
            <tr>
              <th>Ingrédient</th>
              <th style="text-align: right;">%</th>
              <th style="text-align: right;">Quantité (kg)</th>
            </tr>
          </thead>
          <tbody>
            ${calculation.ingredients.map(ing => `
              <tr>
                <td>${ing.ingredientName}</td>
                <td style="text-align: right;">${ing.bakerPercentage}%</td>
                <td style="text-align: right;">${ing.quantityKg.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        ${parseFloat(unitWeight) > 0 ? `
          <div class="summary">
            Poids unitaire: <strong>${unitWeight} g</strong> • Nombre de pièces: <strong>${calculation.numberOfPieces}</strong>
          </div>
        ` : ''}
        <div class="footer">
          Breadshop SAS - Imprimé le ${new Date().toLocaleDateString('fr-FR')}
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };
    }
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
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                disabled={calculation.ingredients.length === 0}
              >
                <Printer className="h-4 w-4 mr-1" />
                Imprimer
              </Button>
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
