import { useMemo } from 'react';
import { useRecipes, useRecipeIngredients } from './useRecipes';
import { useIntermediateProductCostsMap } from './useIntermediateProductCost';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface RecipeComparisonData {
  recipeId: string;
  recipeName: string;
  recipeCode: string | null;
  category: string | null;
  recipeType: string;
  // Metrics
  totalBakerPercentage: number;
  totalHydration: number; // Water percentage relative to flour
  saltPercentage: number; // Salt relative to flour
  additiveLoad: number; // Sum of additives (non-flour, non-water, non-salt)
  costPerKg: number; // Material cost per kg of dough
  costPerUnit: number; // Cost per piece if unit weight available
  // Ingredient breakdown
  flourPercentage: number;
  waterPercentage: number;
  fatPercentage: number;
  sugarPercentage: number;
  // Raw data for filtering
  ingredients: Array<{
    id: string;
    name: string;
    type: string | null;
    bakerPercentage: number;
    pricePerKg: number;
    isFlour: boolean;
    isWater: boolean;
  }>;
}

// Define water-type materials (case insensitive matching)
const WATER_TYPES = ['eau', 'water', 'lait', 'milk', 'liquide'];
const ADDITIVE_KEYWORDS = ['améliorant', 'additif', 'levure', 'yeast', 'malt', 'enzyme', 'émulsifiant', 'conservateur'];

function isWaterType(name: string, type: string | null): boolean {
  const lowerName = name.toLowerCase();
  const lowerType = (type || '').toLowerCase();
  return WATER_TYPES.some(w => lowerName.includes(w) || lowerType.includes(w));
}

function isAdditive(name: string, category: string | null): boolean {
  const lowerName = name.toLowerCase();
  const lowerCategory = (category || '').toLowerCase();
  return ADDITIVE_KEYWORDS.some(a => lowerName.includes(a) || lowerCategory.includes(a));
}

interface BulkIngredient {
  id: string;
  recipe_id: string;
  raw_material_id: string | null;
  ingredient_recipe_id: string | null;
  baker_percentage: number | null;
  raw_materials: {
    id: string;
    name: string;
    type: string | null;
    category: string | null;
    price: number | null;
  } | null;
  ingredient_recipe?: { name: string; code: string | null } | null;
}

// Hook to get all ingredients for multiple recipes at once
export function useMultipleRecipesIngredients(recipeIds: string[]) {
  return useQuery({
    queryKey: ['recipe-ingredients-bulk', recipeIds.sort().join(',')],
    queryFn: async (): Promise<Record<string, BulkIngredient[]>> => {
      if (recipeIds.length === 0) return {};
      
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select(`
          id,
          recipe_id,
          raw_material_id,
          ingredient_recipe_id,
          baker_percentage,
          raw_materials (
            id, name, type, category, price
          )
        `)
        .in('recipe_id', recipeIds)
        .order('order_index');
      
      if (error) throw error;
      
      // Fetch PI recipe names
      const piRecipeIds = (data || [])
        .filter(ing => ing.ingredient_recipe_id)
        .map(ing => ing.ingredient_recipe_id)
        .filter((v, i, a) => v && a.indexOf(v) === i) as string[];
      
      let recipesMap: Record<string, { name: string; code: string | null }> = {};
      if (piRecipeIds.length > 0) {
        const { data: recipes } = await supabase
          .from('recipes')
          .select('id, name, code')
          .in('id', piRecipeIds);
        
        if (recipes) {
          recipesMap = recipes.reduce((acc, r) => {
            acc[r.id] = { name: r.name, code: r.code };
            return acc;
          }, {} as typeof recipesMap);
        }
      }
      
      // Group by recipe
      const groupedByRecipe: Record<string, BulkIngredient[]> = {};
      (data || []).forEach(ing => {
        if (!groupedByRecipe[ing.recipe_id]) {
          groupedByRecipe[ing.recipe_id] = [];
        }
        groupedByRecipe[ing.recipe_id].push({
          ...ing,
          ingredient_recipe: ing.ingredient_recipe_id ? recipesMap[ing.ingredient_recipe_id] || null : null,
        });
      });
      
      return groupedByRecipe;
    },
    enabled: recipeIds.length > 0,
  });
}

export function useRecipeComparison(selectedRecipeIds: string[]) {
  const { data: allRecipes, isLoading: loadingRecipes } = useRecipes();
  const { data: ingredientsByRecipe, isLoading: loadingIngredients } = useMultipleRecipesIngredients(selectedRecipeIds);
  const { costsMap: piCostsMap, isLoading: loadingPiCosts } = useIntermediateProductCostsMap();
  
  const comparisonData = useMemo<RecipeComparisonData[]>(() => {
    if (!allRecipes || !ingredientsByRecipe) return [];
    
    const selectedRecipes = allRecipes.filter(r => selectedRecipeIds.includes(r.id));
    
    return selectedRecipes.map(recipe => {
      const ingredients = ingredientsByRecipe[recipe.id] || [];
      // Calculate totals
      let totalFlourPercentage = 0;
      let totalWaterPercentage = 0;
      let totalSaltPercentage = 0;
      let totalAdditivePercentage = 0;
      let totalFatPercentage = 0;
      let totalSugarPercentage = 0;
      let totalCost = 0;
      let totalBakerPercentage = 0;
      
      const processedIngredients = ingredients.map(ing => {
        const rm = ing.raw_materials;
        const isPI = !!ing.ingredient_recipe_id;
        const name = isPI 
          ? (ing.ingredient_recipe?.name || 'PI')
          : (rm?.name || 'Inconnu');
        const type = rm?.type || null;
        const category = rm?.category || null;
        const bakerPercentage = ing.baker_percentage || 0;
        
        // Determine ingredient type
        const isFlour = type === 'farine';
        const isWater = isWaterType(name, type);
        const isSalt = name.toLowerCase().includes('sel') || name.toLowerCase().includes('salt');
        const isFat = name.toLowerCase().includes('beurre') || name.toLowerCase().includes('huile') || 
                     name.toLowerCase().includes('butter') || name.toLowerCase().includes('oil') ||
                     name.toLowerCase().includes('margarine');
        const isSugar = name.toLowerCase().includes('sucre') || name.toLowerCase().includes('sugar');
        const isAdditiveIng = isAdditive(name, category);
        
        // Get price
        let pricePerKg = 0;
        if (isPI && ing.ingredient_recipe_id && piCostsMap?.[ing.ingredient_recipe_id]) {
          pricePerKg = piCostsMap[ing.ingredient_recipe_id].pricePerKg;
        } else if (rm) {
          pricePerKg = rm.price || 0;
        }
        
        // Accumulate
        totalBakerPercentage += bakerPercentage;
        if (isFlour) totalFlourPercentage += bakerPercentage;
        if (isWater) totalWaterPercentage += bakerPercentage;
        if (isSalt) totalSaltPercentage += bakerPercentage;
        if (isFat) totalFatPercentage += bakerPercentage;
        if (isSugar) totalSugarPercentage += bakerPercentage;
        if (isAdditiveIng) totalAdditivePercentage += bakerPercentage;
        
        // Cost calculation (per 100kg flour base)
        const quantityKg = 100 * (bakerPercentage / 100); // Based on 100kg flour
        totalCost += quantityKg * pricePerKg;
        
        return {
          id: ing.id,
          name,
          type,
          bakerPercentage,
          pricePerKg,
          isFlour,
          isWater,
        };
      });
      
      // Calculate cost per kg of dough
      const totalDoughWeight = totalBakerPercentage; // In kg based on 100kg flour = 100%
      const costPerKg = totalDoughWeight > 0 ? totalCost / totalDoughWeight : 0;
      
      // Cost per unit (using yield info from recipe)
      const unitWeightKg = (recipe.yield_quantity || 0) / (recipe.yield_unit === 'g' ? 1000 : 1);
      const costPerUnit = unitWeightKg > 0 ? costPerKg * unitWeightKg : 0;
      
      return {
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeCode: recipe.code,
        category: recipe.category,
        recipeType: recipe.recipe_type,
        totalBakerPercentage,
        totalHydration: totalWaterPercentage,
        saltPercentage: totalSaltPercentage,
        additiveLoad: totalAdditivePercentage,
        costPerKg,
        costPerUnit,
        flourPercentage: totalFlourPercentage,
        waterPercentage: totalWaterPercentage,
        fatPercentage: totalFatPercentage,
        sugarPercentage: totalSugarPercentage,
        ingredients: processedIngredients,
      };
    });
  }, [allRecipes, ingredientsByRecipe, piCostsMap, selectedRecipeIds]);
  
  return {
    comparisonData,
    isLoading: loadingRecipes || loadingIngredients || loadingPiCosts,
    recipes: allRecipes,
  };
}
