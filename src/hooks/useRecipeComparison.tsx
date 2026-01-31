import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';

export type RawMaterial = Tables<'raw_materials'>;

export interface RecipeWithIngredients {
  id: string;
  name: string;
  code: string | null;
  ingredients: Array<{
    rawMaterialId: string | null;
    rawMaterialName: string;
    rawMaterialType: string | null;
    ingredientRecipeId: string | null;
    bakerPercentage: number;
    // Quantités calculées après éclatement des PI
    quantityKg: number;
  }>;
  // Quantités totales calculées
  totalFlourKg: number;
  totalWaterKg: number;
  totalDoughKg: number;
}

export interface FlattenedMaterial {
  rawMaterialId: string;
  rawMaterialName: string;
  rawMaterialType: string | null;
  quantityKg: number;
}

export interface ComparisonResult {
  recipeId: string;
  recipeName: string;
  recipeCode: string | null;
  materialQuantityKg: number;
  referenceQuantityKg: number;
  ratio: number; // valeur décimale
  percentage: number; // valeur en %
}

export type ReferenceType = 'water' | 'flour' | 'dough';

// Hook pour récupérer toutes les matières premières actives
export function useAllRawMaterials() {
  return useQuery({
    queryKey: ['raw-materials-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Array<{ id: string; name: string; type: string | null }>;
    },
  });
}

// Hook pour récupérer les recettes avec leurs ingrédients
export function useRecipesWithIngredients(recipeIds: string[]) {
  return useQuery({
    queryKey: ['recipes-with-ingredients', recipeIds],
    queryFn: async () => {
      if (recipeIds.length === 0) return [];

      // Récupérer les recettes
      const { data: recipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id, name, code')
        .in('id', recipeIds);
      
      if (recipesError) throw recipesError;
      if (!recipes) return [];

      // Récupérer tous les ingrédients des recettes sélectionnées
      const { data: ingredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          id,
          recipe_id,
          raw_material_id,
          ingredient_recipe_id,
          baker_percentage,
          raw_materials (id, name, type)
        `)
        .in('recipe_id', recipeIds);
      
      if (ingredientsError) throw ingredientsError;

      // Récupérer les ingrédients des PI (produits intermédiaires)
      const piRecipeIds = [...new Set(
        (ingredients || [])
          .filter(ing => ing.ingredient_recipe_id)
          .map(ing => ing.ingredient_recipe_id)
      )].filter(Boolean) as string[];

      let piIngredients: any[] = [];
      let piRecipes: any[] = [];

      if (piRecipeIds.length > 0) {
        const { data: piData, error: piError } = await supabase
          .from('recipe_ingredients')
          .select(`
            id,
            recipe_id,
            raw_material_id,
            ingredient_recipe_id,
            baker_percentage,
            raw_materials (id, name, type)
          `)
          .in('recipe_id', piRecipeIds);
        
        if (!piError && piData) {
          piIngredients = piData;
        }

        const { data: piRecipesData } = await supabase
          .from('recipes')
          .select('id, name, code')
          .in('id', piRecipeIds);
        
        if (piRecipesData) {
          piRecipes = piRecipesData;
        }
      }

      // Mapper les recettes avec leurs ingrédients éclatés
      const result: RecipeWithIngredients[] = recipes.map(recipe => {
        const recipeIngredients = (ingredients || []).filter(
          ing => ing.recipe_id === recipe.id
        );

        // Calculer le total farine pour la base (100kg)
        const flourIngredients = recipeIngredients.filter(
          ing => ing.raw_materials?.type === 'farine'
        );
        const totalFlourPercentage = flourIngredients.reduce(
          (sum, ing) => sum + (ing.baker_percentage || 0), 0
        );

        // Base: 100kg de farine
        const baseFlourKg = 100;
        const flourMultiplier = totalFlourPercentage > 0 ? baseFlourKg / totalFlourPercentage : 0;

        // Éclater les ingrédients (y compris PI)
        const flattenedIngredients: Array<{
          rawMaterialId: string | null;
          rawMaterialName: string;
          rawMaterialType: string | null;
          ingredientRecipeId: string | null;
          bakerPercentage: number;
          quantityKg: number;
        }> = [];

        recipeIngredients.forEach(ing => {
          if (ing.ingredient_recipe_id) {
            // C'est un PI - éclater ses ingrédients
            const piIngs = piIngredients.filter(
              pi => pi.recipe_id === ing.ingredient_recipe_id
            );
            const piRecipe = piRecipes.find(r => r.id === ing.ingredient_recipe_id);
            
            // Calculer le ratio de PI par rapport au total farine de la recette parente
            const piPercentage = ing.baker_percentage || 0;
            
            // Total farine du PI
            const piFlourPercentage = piIngs
              .filter(pi => pi.raw_materials?.type === 'farine')
              .reduce((sum, pi) => sum + (pi.baker_percentage || 0), 0);
            
            // Ratio pour convertir les % PI en quantités de la recette parente
            const piRatio = piFlourPercentage > 0 
              ? (piPercentage / piFlourPercentage) 
              : 0;

            piIngs.forEach(piIng => {
              if (piIng.raw_materials) {
                const adjustedPercentage = (piIng.baker_percentage || 0) * piRatio;
                flattenedIngredients.push({
                  rawMaterialId: piIng.raw_material_id,
                  rawMaterialName: piIng.raw_materials.name,
                  rawMaterialType: piIng.raw_materials.type,
                  ingredientRecipeId: ing.ingredient_recipe_id,
                  bakerPercentage: adjustedPercentage,
                  quantityKg: (adjustedPercentage / 100) * baseFlourKg,
                });
              }
            });
          } else if (ing.raw_materials) {
            // Ingrédient direct
            const percentage = ing.baker_percentage || 0;
            flattenedIngredients.push({
              rawMaterialId: ing.raw_material_id,
              rawMaterialName: ing.raw_materials.name,
              rawMaterialType: ing.raw_materials.type,
              ingredientRecipeId: null,
              bakerPercentage: percentage,
              quantityKg: (percentage / 100) * baseFlourKg,
            });
          }
        });

        // Dédupliquer et agréger par MP
        const aggregatedMap = new Map<string, typeof flattenedIngredients[0]>();
        flattenedIngredients.forEach(ing => {
          if (ing.rawMaterialId) {
            const existing = aggregatedMap.get(ing.rawMaterialId);
            if (existing) {
              existing.quantityKg += ing.quantityKg;
              existing.bakerPercentage += ing.bakerPercentage;
            } else {
              aggregatedMap.set(ing.rawMaterialId, { ...ing });
            }
          }
        });

        const aggregatedIngredients = Array.from(aggregatedMap.values());

        // Calculer les totaux
        const totalFlourKg = aggregatedIngredients
          .filter(ing => ing.rawMaterialType === 'farine')
          .reduce((sum, ing) => sum + ing.quantityKg, 0);

        // Identifier l'eau (par nom ou type)
        const totalWaterKg = aggregatedIngredients
          .filter(ing => 
            ing.rawMaterialName.toLowerCase() === 'eau' ||
            ing.rawMaterialName.toLowerCase().includes('water')
          )
          .reduce((sum, ing) => sum + ing.quantityKg, 0);

        const totalDoughKg = aggregatedIngredients.reduce(
          (sum, ing) => sum + ing.quantityKg, 0
        );

        return {
          id: recipe.id,
          name: recipe.name,
          code: recipe.code,
          ingredients: aggregatedIngredients,
          totalFlourKg,
          totalWaterKg,
          totalDoughKg,
        };
      });

      return result;
    },
    enabled: recipeIds.length > 0,
  });
}

// Hook principal pour le calcul de comparaison
export function useRecipeComparison(
  recipes: RecipeWithIngredients[],
  selectedMaterialId: string | null,
  referenceType: ReferenceType
): ComparisonResult[] {
  return useMemo(() => {
    if (!selectedMaterialId || recipes.length === 0) return [];

    return recipes.map(recipe => {
      // Trouver la quantité de la MP sélectionnée
      const materialIngredient = recipe.ingredients.find(
        ing => ing.rawMaterialId === selectedMaterialId
      );
      const materialQuantityKg = materialIngredient?.quantityKg || 0;

      // Déterminer le référentiel
      let referenceQuantityKg = 0;
      switch (referenceType) {
        case 'water':
          referenceQuantityKg = recipe.totalWaterKg;
          break;
        case 'flour':
          referenceQuantityKg = recipe.totalFlourKg;
          break;
        case 'dough':
          referenceQuantityKg = recipe.totalDoughKg;
          break;
      }

      // Calculer le ratio
      const ratio = referenceQuantityKg > 0 
        ? materialQuantityKg / referenceQuantityKg 
        : 0;
      const percentage = ratio * 100;

      return {
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeCode: recipe.code,
        materialQuantityKg,
        referenceQuantityKg,
        ratio,
        percentage,
      };
    });
  }, [recipes, selectedMaterialId, referenceType]);
}

// Extraire toutes les MP uniques utilisées dans les recettes sélectionnées
export function extractUniqueMaterials(
  recipes: RecipeWithIngredients[]
): Array<{ id: string; name: string; type: string | null }> {
  const materialsMap = new Map<string, { id: string; name: string; type: string | null }>();
  
  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ing => {
      if (ing.rawMaterialId && !materialsMap.has(ing.rawMaterialId)) {
        materialsMap.set(ing.rawMaterialId, {
          id: ing.rawMaterialId,
          name: ing.rawMaterialName,
          type: ing.rawMaterialType,
        });
      }
    });
  });

  return Array.from(materialsMap.values()).sort((a, b) => 
    a.name.localeCompare(b.name)
  );
}
