import { useMemo } from 'react';
import { RecipeIngredient } from './useRecipes';

export interface BakerCalculation {
  ingredientId: string;
  ingredientName: string;
  type: 'farine' | 'ingredient';
  bakerPercentage: number;
  quantityKg: number;
  costEuros: number;
  // Nutritional values
  energyKcal: number;
  energyKj: number;
  fat: number;
  saturatedFat: number;
  carbohydrates: number;
  sugars: number;
  fiber: number;
  protein: number;
  salt: number;
  // Allergens
  allergens: string[];
  allergensSecondary: string[];
}

export interface RecipeCalculationResult {
  ingredients: BakerCalculation[];
  flourIngredients: BakerCalculation[];
  otherIngredients: BakerCalculation[];
  totalFlourPercentage: number;
  totalBakerPercentage: number;
  isFlourValid: boolean;
  rawDoughWeightKg: number;
  cookedWeightKg: number;
  numberOfPieces: number;
  totalCost: number;
  costPerPiece: number;
  // Nutritional per 100g of finished product
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
  // All allergens
  allAllergens: string[];
  allAllergensSecondary: string[];
  // Sorted ingredients for label (by weight descending)
  sortedIngredients: Array<{
    name: string;
    composition: string | null;
    weightKg: number;
    allergens: string[];
  }>;
}

/**
 * Multi-flour baker's percentage calculation hook
 * 
 * Business Logic:
 * - Flours must total 100% (base of calculation)
 * - Other ingredients are expressed as % of total flour
 * - User inputs total flour quantity in kg (this represents 100%)
 * - All ingredient quantities are calculated from this base
 */
export function useBakerCalculations(
  ingredients: RecipeIngredient[] | undefined,
  totalFlourQuantityKg: number,
  unitWeightGrams: number,
  bakingRatio: number = 0.9,
  processLosses: number = 0
): RecipeCalculationResult {
  return useMemo(() => {
    if (!ingredients || ingredients.length === 0 || totalFlourQuantityKg <= 0) {
      return {
        ingredients: [],
        flourIngredients: [],
        otherIngredients: [],
        totalFlourPercentage: 0,
        totalBakerPercentage: 0,
        isFlourValid: false,
        rawDoughWeightKg: 0,
        cookedWeightKg: 0,
        numberOfPieces: 0,
        totalCost: 0,
        costPerPiece: 0,
        nutritionPer100g: {
          energyKcal: 0,
          energyKj: 0,
          fat: 0,
          saturatedFat: 0,
          carbohydrates: 0,
          sugars: 0,
          fiber: 0,
          protein: 0,
          salt: 0,
        },
        allAllergens: [],
        allAllergensSecondary: [],
        sortedIngredients: [],
      };
    }

    // Calculate quantities for each ingredient
    const calculatedIngredients: BakerCalculation[] = ingredients.map((ing) => {
      const bakerPercentage = ing.baker_percentage || 0;
      const rm = ing.raw_materials;
      const isIntermediate = !!ing.ingredient_recipe_id;
      
      // For intermediate products, use the recipe name; for raw materials, use the material name
      const ingredientName = isIntermediate 
        ? (ing.ingredient_recipe?.name || 'PI sans nom')
        : (rm?.name || 'Inconnu');
      
      const type = (rm?.type || 'ingredient') as 'farine' | 'ingredient';
      
      // For flours: quantity = totalFlourQuantity * (flour% / 100)
      // For other ingredients: quantity = totalFlourQuantity * (ingredient% / 100)
      // This is the standard baker's percentage calculation
      const quantityKg = totalFlourQuantityKg * (bakerPercentage / 100);
      const quantityGrams = quantityKg * 1000;
      
      const pricePerKg = rm?.price || 0;
      const costEuros = quantityKg * pricePerKg;

      // Nutritional values (based on quantity in grams, values per 100g)
      const energyKcal = (quantityGrams * (rm?.energy_kcal || 0)) / 100;
      const energyKj = (quantityGrams * (rm?.energy_kj || 0)) / 100;
      const fat = (quantityGrams * (rm?.fat || 0)) / 100;
      const saturatedFat = (quantityGrams * (rm?.saturated_fat || 0)) / 100;
      const carbohydrates = (quantityGrams * (rm?.carbohydrates || 0)) / 100;
      const sugars = (quantityGrams * (rm?.sugars || 0)) / 100;
      const fiber = (quantityGrams * (rm?.fiber || 0)) / 100;
      const protein = (quantityGrams * (rm?.protein || 0)) / 100;
      const salt = (quantityGrams * (rm?.salt || 0)) / 100;

      return {
        ingredientId: ing.id,
        ingredientName,
        type,
        bakerPercentage,
        quantityKg,
        costEuros,
        energyKcal,
        energyKj,
        fat,
        saturatedFat,
        carbohydrates,
        sugars,
        fiber,
        protein,
        salt,
        allergens: rm?.allergens || [],
        allergensSecondary: rm?.allergens_secondary || [],
      };
    });

    // Separate flour and other ingredients
    const flourIngredients = calculatedIngredients.filter(ing => ing.type === 'farine');
    const otherIngredients = calculatedIngredients.filter(ing => ing.type !== 'farine');

    // Calculate flour percentage total (should be 100%)
    const totalFlourPercentage = flourIngredients.reduce(
      (sum, ing) => sum + ing.bakerPercentage,
      0
    );

    // Validate flour total equals 100%
    const isFlourValid = Math.abs(totalFlourPercentage - 100) < 0.01;

    // Total baker percentage (flours + others)
    const totalBakerPercentage = calculatedIngredients.reduce(
      (sum, ing) => sum + ing.bakerPercentage,
      0
    );

    // Raw dough weight = sum of all ingredient quantities
    const rawDoughWeightKg = calculatedIngredients.reduce(
      (sum, ing) => sum + ing.quantityKg,
      0
    );

    // Cooked weight (after baking ratio and process losses)
    const afterBaking = rawDoughWeightKg * bakingRatio;
    const cookedWeightKg = afterBaking * (1 - processLosses / 100);

    // Number of pieces (based on raw dough weight / unit weight)
    const numberOfPieces = unitWeightGrams > 0 
      ? Math.floor((rawDoughWeightKg * 1000) / unitWeightGrams)
      : 0;

    // Total cost
    const totalCost = calculatedIngredients.reduce(
      (sum, ing) => sum + ing.costEuros,
      0
    );

    // Cost per piece
    const costPerPiece = numberOfPieces > 0 ? totalCost / numberOfPieces : 0;

    // Total nutrition
    const totalNutrition = {
      energyKcal: calculatedIngredients.reduce((sum, ing) => sum + ing.energyKcal, 0),
      energyKj: calculatedIngredients.reduce((sum, ing) => sum + ing.energyKj, 0),
      fat: calculatedIngredients.reduce((sum, ing) => sum + ing.fat, 0),
      saturatedFat: calculatedIngredients.reduce((sum, ing) => sum + ing.saturatedFat, 0),
      carbohydrates: calculatedIngredients.reduce((sum, ing) => sum + ing.carbohydrates, 0),
      sugars: calculatedIngredients.reduce((sum, ing) => sum + ing.sugars, 0),
      fiber: calculatedIngredients.reduce((sum, ing) => sum + ing.fiber, 0),
      protein: calculatedIngredients.reduce((sum, ing) => sum + ing.protein, 0),
      salt: calculatedIngredients.reduce((sum, ing) => sum + ing.salt, 0),
    };

    // Nutrition per 100g of finished product
    const cookedWeightGrams = cookedWeightKg * 1000;
    const nutritionPer100g = cookedWeightGrams > 0
      ? {
          energyKcal: (totalNutrition.energyKcal / cookedWeightGrams) * 100,
          energyKj: (totalNutrition.energyKj / cookedWeightGrams) * 100,
          fat: (totalNutrition.fat / cookedWeightGrams) * 100,
          saturatedFat: (totalNutrition.saturatedFat / cookedWeightGrams) * 100,
          carbohydrates: (totalNutrition.carbohydrates / cookedWeightGrams) * 100,
          sugars: (totalNutrition.sugars / cookedWeightGrams) * 100,
          fiber: (totalNutrition.fiber / cookedWeightGrams) * 100,
          protein: (totalNutrition.protein / cookedWeightGrams) * 100,
          salt: (totalNutrition.salt / cookedWeightGrams) * 100,
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

    // Collect all allergens (unique, sorted)
    const allAllergens = [...new Set(
      calculatedIngredients.flatMap((ing) => ing.allergens)
    )].sort();

    const allAllergensSecondary = [...new Set(
      calculatedIngredients.flatMap((ing) => ing.allergensSecondary)
    )].filter(a => !allAllergens.includes(a)).sort();

    // Sort ingredients by weight (descending) for label
    const sortedIngredients = ingredients
      .map((ing) => {
        const isIntermediate = !!ing.ingredient_recipe_id;
        const name = isIntermediate 
          ? (ing.ingredient_recipe?.name || 'PI sans nom')
          : (ing.raw_materials?.name || 'Inconnu');
        return {
          name,
          composition: ing.raw_materials?.composition || null,
          weightKg: totalFlourQuantityKg * ((ing.baker_percentage || 0) / 100),
          allergens: ing.raw_materials?.allergens || [],
        };
      })
      .sort((a, b) => b.weightKg - a.weightKg);

    return {
      ingredients: calculatedIngredients,
      flourIngredients,
      otherIngredients,
      totalFlourPercentage,
      totalBakerPercentage,
      isFlourValid,
      rawDoughWeightKg,
      cookedWeightKg,
      numberOfPieces,
      totalCost,
      costPerPiece,
      nutritionPer100g,
      allAllergens,
      allAllergensSecondary,
      sortedIngredients,
    };
  }, [ingredients, totalFlourQuantityKg, unitWeightGrams, bakingRatio, processLosses]);
}

// Generate ingredient list for label (with allergens in UPPERCASE)
export function generateIngredientsList(
  sortedIngredients: Array<{
    name: string;
    composition: string | null;
    allergens: string[];
  }>
): string {
  return sortedIngredients
    .map((ing) => {
      // Use composition if available, otherwise just the name
      let text = ing.composition || ing.name;
      
      // Highlight allergens in UPPERCASE
      ing.allergens.forEach((allergen) => {
        const regex = new RegExp(`\\b${allergen}\\b`, 'gi');
        text = text.replace(regex, allergen.toUpperCase());
      });
      
      // Also uppercase the ingredient name if it's an allergen
      ing.allergens.forEach((allergen) => {
        if (ing.name.toLowerCase().includes(allergen.toLowerCase())) {
          text = text.replace(new RegExp(ing.name, 'gi'), ing.name.toUpperCase());
        }
      });
      
      return text;
    })
    .join(', ');
}
