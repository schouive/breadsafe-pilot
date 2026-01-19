import { useMemo } from 'react';
import { RecipeIngredient } from './useRecipes';

export interface BakerCalculation {
  ingredientId: string;
  ingredientName: string;
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
  totalBakerPercentage: number;
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
  // Sorted ingredients for label
  sortedIngredients: Array<{
    name: string;
    composition: string | null;
    weightKg: number;
    allergens: string[];
  }>;
}

export function useBakerCalculations(
  ingredients: RecipeIngredient[] | undefined,
  flourQuantityKg: number,
  unitWeightGrams: number,
  bakingRatio: number = 0.9,
  processLosses: number = 0
): RecipeCalculationResult {
  return useMemo(() => {
    if (!ingredients || ingredients.length === 0 || flourQuantityKg <= 0) {
      return {
        ingredients: [],
        totalBakerPercentage: 0,
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

    const calculatedIngredients: BakerCalculation[] = ingredients.map((ing) => {
      const bakerPercentage = ing.baker_percentage || 0;
      const quantityKg = flourQuantityKg * (bakerPercentage / 100);
      const quantityGrams = quantityKg * 1000;
      
      const rm = ing.raw_materials;
      const pricePerKg = rm?.price || 0;
      const costEuros = quantityKg * pricePerKg;

      // Nutritional values (based on quantity in grams)
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
        ingredientName: rm?.name || 'Inconnu',
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

    // Total baker percentage
    const totalBakerPercentage = calculatedIngredients.reduce(
      (sum, ing) => sum + ing.bakerPercentage,
      0
    );

    // Raw dough weight
    const rawDoughWeightKg = calculatedIngredients.reduce(
      (sum, ing) => sum + ing.quantityKg,
      0
    );

    // Cooked weight (after baking ratio and process losses)
    const afterBaking = rawDoughWeightKg * bakingRatio;
    const cookedWeightKg = afterBaking * (1 - processLosses / 100);

    // Number of pieces
    const numberOfPieces = unitWeightGrams > 0 
      ? Math.floor((cookedWeightKg * 1000) / unitWeightGrams)
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

    // Collect all allergens
    const allAllergens = [...new Set(
      calculatedIngredients.flatMap((ing) => ing.allergens)
    )].sort();

    const allAllergensSecondary = [...new Set(
      calculatedIngredients.flatMap((ing) => ing.allergensSecondary)
    )].filter(a => !allAllergens.includes(a)).sort();

    // Sort ingredients by weight (descending) for label
    const sortedIngredients = ingredients
      .map((ing) => ({
        name: ing.raw_materials?.name || 'Inconnu',
        composition: ing.raw_materials?.composition || null,
        weightKg: flourQuantityKg * ((ing.baker_percentage || 0) / 100),
        allergens: ing.raw_materials?.allergens || [],
      }))
      .sort((a, b) => b.weightKg - a.weightKg);

    return {
      ingredients: calculatedIngredients,
      totalBakerPercentage,
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
  }, [ingredients, flourQuantityKg, unitWeightGrams, bakingRatio, processLosses]);
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
