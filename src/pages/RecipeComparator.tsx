import { useState, useMemo } from 'react';
import { Scale, BarChart3, Droplets, Beaker, CircleDot, Filter, X, Check, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRecipes } from '@/hooks/useRecipes';
import { useRecipeComparison, RecipeComparisonData } from '@/hooks/useRecipeComparison';
import { RecipeComparisonCharts } from '@/components/products/RecipeComparisonCharts';
import { RecipeComparisonTable } from '@/components/products/RecipeComparisonTable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

export default function RecipeComparator() {
  const { data: recipes, isLoading: loadingRecipes } = useRecipes();
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [excludedIngredients, setExcludedIngredients] = useState<string[]>([]);
  const [recipeSelectOpen, setRecipeSelectOpen] = useState(false);
  
  const { comparisonData, isLoading: loadingComparison } = useRecipeComparison(selectedRecipeIds);
  
  // Get unique ingredient names across all selected recipes for filtering
  const allIngredientNames = useMemo(() => {
    const names = new Set<string>();
    comparisonData.forEach(recipe => {
      recipe.ingredients.forEach(ing => names.add(ing.name));
    });
    return Array.from(names).sort();
  }, [comparisonData]);
  
  // Filter common ingredients that can be excluded
  const commonFilters = ['Farine', 'Eau', 'Sel', 'Sucre'];
  
  const toggleRecipe = (recipeId: string) => {
    setSelectedRecipeIds(prev => 
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };
  
  const toggleIngredientFilter = (ingredientName: string) => {
    setExcludedIngredients(prev =>
      prev.includes(ingredientName)
        ? prev.filter(n => n !== ingredientName)
        : [...prev, ingredientName]
    );
  };
  
  const clearSelection = () => {
    setSelectedRecipeIds([]);
    setExcludedIngredients([]);
  };
  
  // Filter comparison data based on excluded ingredients
  const filteredComparisonData = useMemo<RecipeComparisonData[]>(() => {
    if (excludedIngredients.length === 0) return comparisonData;
    
    return comparisonData.map(recipe => {
      const filteredIngredients = recipe.ingredients.filter(
        ing => !excludedIngredients.some(ex => 
          ing.name.toLowerCase().includes(ex.toLowerCase())
        )
      );
      
      // Recalculate totals based on filtered ingredients
      const totalBakerPercentage = filteredIngredients.reduce((sum, ing) => sum + ing.bakerPercentage, 0);
      const totalHydration = filteredIngredients.filter(ing => ing.isWater).reduce((sum, ing) => sum + ing.bakerPercentage, 0);
      const flourPercentage = filteredIngredients.filter(ing => ing.isFlour).reduce((sum, ing) => sum + ing.bakerPercentage, 0);
      
      return {
        ...recipe,
        ingredients: filteredIngredients,
        totalBakerPercentage,
        totalHydration,
        flourPercentage,
      };
    });
  }, [comparisonData, excludedIngredients]);

  const activeRecipes = recipes?.filter(r => r.is_active) || [];
  const finishedRecipes = activeRecipes.filter(r => r.recipe_type === 'finished');
  const intermediateRecipes = activeRecipes.filter(r => r.recipe_type === 'intermediate');
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Comparateur de recettes
          </h1>
          <p className="text-muted-foreground">
            Sélectionnez plusieurs recettes pour comparer leurs caractéristiques
          </p>
        </div>
        {selectedRecipeIds.length > 0 && (
          <Button variant="outline" onClick={clearSelection}>
            <X className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Recipe Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Sélection des recettes</CardTitle>
          <CardDescription>
            {selectedRecipeIds.length === 0 
              ? 'Choisissez au moins 2 recettes à comparer'
              : `${selectedRecipeIds.length} recette(s) sélectionnée(s)`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedRecipeIds.map(id => {
              const recipe = recipes?.find(r => r.id === id);
              return recipe ? (
                <Badge key={id} variant="secondary" className="pl-3 pr-1 py-1.5">
                  {recipe.name}
                  {recipe.code && <span className="text-muted-foreground ml-1">({recipe.code})</span>}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-1 hover:bg-destructive/20"
                    onClick={() => toggleRecipe(id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ) : null;
            })}
          </div>
          
          <Popover open={recipeSelectOpen} onOpenChange={setRecipeSelectOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span>Ajouter une recette...</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Rechercher une recette..." />
                <CommandList>
                  <CommandEmpty>Aucune recette trouvée</CommandEmpty>
                  {finishedRecipes.length > 0 && (
                    <CommandGroup heading="Produits finis">
                      {finishedRecipes.map(recipe => (
                        <CommandItem
                          key={recipe.id}
                          onSelect={() => {
                            toggleRecipe(recipe.id);
                          }}
                        >
                          <div className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedRecipeIds.includes(recipe.id)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}>
                            {selectedRecipeIds.includes(recipe.id) && <Check className="h-3 w-3" />}
                          </div>
                          <span>{recipe.name}</span>
                          {recipe.code && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              ({recipe.code})
                            </span>
                          )}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {intermediateRecipes.length > 0 && (
                    <CommandGroup heading="Produits intermédiaires">
                      {intermediateRecipes.map(recipe => (
                        <CommandItem
                          key={recipe.id}
                          onSelect={() => {
                            toggleRecipe(recipe.id);
                          }}
                        >
                          <div className={cn(
                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                            selectedRecipeIds.includes(recipe.id)
                              ? "bg-primary text-primary-foreground"
                              : "opacity-50"
                          )}>
                            {selectedRecipeIds.includes(recipe.id) && <Check className="h-3 w-3" />}
                          </div>
                          <span>{recipe.name}</span>
                          {recipe.code && (
                            <span className="ml-2 text-muted-foreground text-xs">
                              ({recipe.code})
                            </span>
                          )}
                          <Badge variant="outline" className="ml-auto text-xs bg-amber-50 text-amber-700 border-amber-200">
                            PI
                          </Badge>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      {/* Ingredient Filters */}
      {selectedRecipeIds.length >= 2 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-lg">Filtres d'ingrédients</CardTitle>
            </div>
            <CardDescription>
              Excluez certains ingrédients pour analyser finement les ingrédients techniques
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {commonFilters.map(filter => {
                const isExcluded = excludedIngredients.some(e => 
                  e.toLowerCase() === filter.toLowerCase()
                );
                return (
                  <div key={filter} className="flex items-center gap-2">
                    <Checkbox
                      id={`filter-${filter}`}
                      checked={isExcluded}
                      onCheckedChange={() => toggleIngredientFilter(filter)}
                    />
                    <label 
                      htmlFor={`filter-${filter}`}
                      className="text-sm cursor-pointer"
                    >
                      Exclure {filter}
                    </label>
                  </div>
                );
              })}
            </div>
            {excludedIngredients.length > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ingrédients exclus:</span>
                {excludedIngredients.map(ing => (
                  <Badge key={ing} variant="outline" className="bg-destructive/10">
                    {ing}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1"
                      onClick={() => toggleIngredientFilter(ing)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparison Results */}
      {selectedRecipeIds.length >= 2 && (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="text-center p-4">
              <Scale className="h-5 w-5 mx-auto text-blue-500 mb-2" />
              <p className="text-xs text-muted-foreground">Poids pâte</p>
              <p className="font-semibold">% total</p>
            </Card>
            <Card className="text-center p-4">
              <Droplets className="h-5 w-5 mx-auto text-cyan-500 mb-2" />
              <p className="text-xs text-muted-foreground">Hydratation</p>
              <p className="font-semibold">% / farine</p>
            </Card>
            <Card className="text-center p-4">
              <CircleDot className="h-5 w-5 mx-auto text-amber-500 mb-2" />
              <p className="text-xs text-muted-foreground">Sel</p>
              <p className="font-semibold">% / farine</p>
            </Card>
            <Card className="text-center p-4">
              <Beaker className="h-5 w-5 mx-auto text-purple-500 mb-2" />
              <p className="text-xs text-muted-foreground">Additifs</p>
              <p className="font-semibold">% charge</p>
            </Card>
            <Card className="text-center p-4">
              <BarChart3 className="h-5 w-5 mx-auto text-green-500 mb-2" />
              <p className="text-xs text-muted-foreground">Coût matière</p>
              <p className="font-semibold">€/kg</p>
            </Card>
          </div>

          {/* Charts */}
          <RecipeComparisonCharts 
            data={filteredComparisonData} 
            isLoading={loadingComparison}
          />

          {/* Data Table */}
          <RecipeComparisonTable 
            data={filteredComparisonData}
            isLoading={loadingComparison}
          />
        </>
      )}

      {/* Empty State */}
      {selectedRecipeIds.length < 2 && (
        <Card className="text-center py-12">
          <CardContent>
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Sélectionnez au moins 2 recettes</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Utilisez le sélecteur ci-dessus pour choisir les recettes que vous souhaitez comparer. 
              Les graphiques et tableaux comparatifs s'afficheront automatiquement.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
