import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { roundToSignificantFigures } from '@/lib/utils';

export interface IntermediateProductCost {
  recipeId: string;
  recipeName: string;
  recipeCode: string | null;
  totalCostEuros: number;
  totalWeightKg: number;
  pricePerKg: number;
  // Aggregated nutrition per 100g for proper calculation
  nutritionPer100g: {
    energyKcal: number;
    energyKj: number;
    fat: number;
    saturatedFat: number;
    carbohydrates: number;
    sugars: number;
    fiber: number;
    protein: number;
    salt: number;
  };
  // Aggregated allergens
  allergens: string[];
  allergensSecondary: string[];
}

/**
 * Hook to calculate the cost per kg for all intermediate product recipes.
 * This data is used to treat PI as ingredients with their own price.
 * 
 * The calculation uses baker's percentage with a 100kg flour reference:
 * - Total weight = sum of all ingredient weights (based on 100kg flour)
 * - Total cost = sum of (quantity_kg * price_per_kg) for all ingredients
 * - Price per kg = Total cost / Total weight
 */
export function useIntermediateProductCosts() {
  return useQuery({
    queryKey: ['intermediate-product-costs'],
    queryFn: async () => {
      // 1. Fetch all intermediate recipes
      const { data: piRecipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id, name, code, baking_ratio, process_losses')
        .eq('recipe_type', 'intermediate')
        .eq('is_active', true);

      if (recipesError) throw recipesError;
      if (!piRecipes || piRecipes.length === 0) return [];

      // 2. Fetch all ingredients for these recipes with raw materials data
      const piRecipeIds = piRecipes.map(r => r.id);
      const { data: allIngredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          id,
          recipe_id,
          raw_material_id,
          ingredient_recipe_id,
          baker_percentage,
          raw_materials (
            id,
            name,
            price,
            energy_kcal,
            energy_kj,
            fat,
            saturated_fat,
            carbohydrates,
            sugars,
            fiber,
            protein,
            salt,
            allergens,
            allergens_secondary
          )
        `)
        .in('recipe_id', piRecipeIds);

      if (ingredientsError) throw ingredientsError;

      // Reference flour quantity for calculation (standard: 100kg)
      const REFERENCE_FLOUR_KG = 100;

      // 3. Calculate cost per kg for each PI recipe
      const costs: IntermediateProductCost[] = piRecipes.map(recipe => {
        const ingredients = allIngredients?.filter(ing => ing.recipe_id === recipe.id) || [];
        
        let totalCost = 0;
        let totalWeightKg = 0;
        let totalNutrition = {
          energyKcal: 0,
          energyKj: 0,
          fat: 0,
          saturatedFat: 0,
          carbohydrates: 0,
          sugars: 0,
          fiber: 0,
          protein: 0,
          salt: 0,
        };
        const allAllergens: string[] = [];
        const allAllergensSecondary: string[] = [];

        ingredients.forEach(ing => {
          const bakerPercentage = ing.baker_percentage || 0;
          const rm = ing.raw_materials;
          
          // Quantity based on reference flour quantity
          const quantityKg = REFERENCE_FLOUR_KG * (bakerPercentage / 100);
          const quantityGrams = quantityKg * 1000;
          
          totalWeightKg += quantityKg;

          if (rm) {
            // Cost calculation
            const pricePerKg = rm.price || 0;
            totalCost += quantityKg * pricePerKg;

            // Nutrition (based on quantity, values are per 100g in DB)
            totalNutrition.energyKcal += (quantityGrams * (rm.energy_kcal || 0)) / 100;
            totalNutrition.energyKj += (quantityGrams * (rm.energy_kj || 0)) / 100;
            totalNutrition.fat += (quantityGrams * (rm.fat || 0)) / 100;
            totalNutrition.saturatedFat += (quantityGrams * (rm.saturated_fat || 0)) / 100;
            totalNutrition.carbohydrates += (quantityGrams * (rm.carbohydrates || 0)) / 100;
            totalNutrition.sugars += (quantityGrams * (rm.sugars || 0)) / 100;
            totalNutrition.fiber += (quantityGrams * (rm.fiber || 0)) / 100;
            totalNutrition.protein += (quantityGrams * (rm.protein || 0)) / 100;
            totalNutrition.salt += (quantityGrams * (rm.salt || 0)) / 100;

            // Allergens
            if (rm.allergens) {
              rm.allergens.forEach(a => {
                if (!allAllergens.includes(a)) allAllergens.push(a);
              });
            }
            if (rm.allergens_secondary) {
              rm.allergens_secondary.forEach(a => {
                if (!allAllergensSecondary.includes(a) && !allAllergens.includes(a)) {
                  allAllergensSecondary.push(a);
                }
              });
            }
          }
        });

        // Apply baking ratio and process losses for final weight
        const bakingRatio = recipe.baking_ratio || 1;
        const processLosses = recipe.process_losses || 0;
        const afterBaking = totalWeightKg * bakingRatio;
        const finalWeightKg = afterBaking * (1 - processLosses / 100);

        // Calculate price per kg based on final weight
        const pricePerKg = finalWeightKg > 0 ? totalCost / finalWeightKg : 0;

        // Calculate nutrition per 100g of final product
        const finalWeightGrams = finalWeightKg * 1000;
        const nutritionPer100g = finalWeightGrams > 0
          ? {
              energyKcal: roundToSignificantFigures((totalNutrition.energyKcal / finalWeightGrams) * 100, 2),
              energyKj: roundToSignificantFigures((totalNutrition.energyKj / finalWeightGrams) * 100, 2),
              fat: roundToSignificantFigures((totalNutrition.fat / finalWeightGrams) * 100, 2),
              saturatedFat: roundToSignificantFigures((totalNutrition.saturatedFat / finalWeightGrams) * 100, 2),
              carbohydrates: roundToSignificantFigures((totalNutrition.carbohydrates / finalWeightGrams) * 100, 2),
              sugars: roundToSignificantFigures((totalNutrition.sugars / finalWeightGrams) * 100, 2),
              fiber: roundToSignificantFigures((totalNutrition.fiber / finalWeightGrams) * 100, 2),
              protein: roundToSignificantFigures((totalNutrition.protein / finalWeightGrams) * 100, 2),
              salt: roundToSignificantFigures((totalNutrition.salt / finalWeightGrams) * 100, 2),
            }
          : {
              energyKcal: 0,
              energyKj: 0,
              fat: 0,
              saturatedFat: 0,
              carbohydrates: 0,
              sugars: 0,
              fiber: 0,
              protein: 0,
              salt: 0,
            };

        return {
          recipeId: recipe.id,
          recipeName: recipe.name,
          recipeCode: recipe.code,
          totalCostEuros: totalCost,
          totalWeightKg: finalWeightKg,
          pricePerKg,
          nutritionPer100g,
          allergens: allAllergens.sort(),
          allergensSecondary: allAllergensSecondary.sort(),
        };
      });

      return costs;
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get a map of PI recipe ID to cost data for quick lookup
 */
export function useIntermediateProductCostsMap() {
  const { data: costs, ...rest } = useIntermediateProductCosts();
  
  const costsMap = costs?.reduce((acc, cost) => {
    acc[cost.recipeId] = cost;
    return acc;
  }, {} as Record<string, IntermediateProductCost>) || {};

  return { costsMap, ...rest };
}
