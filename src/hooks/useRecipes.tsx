import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type Recipe = Tables<'recipes'>;
export type RecipeIngredient = Tables<'recipe_ingredients'> & {
  raw_materials?: Tables<'raw_materials'> & {
    suppliers?: { name: string } | null;
  } | null;
  ingredient_recipe?: {
    id: string;
    name: string;
    code: string | null;
    recipe_type: string;
    inco_declaration_mode: string | null;
    inco_name: string | null;
  } | null;
};
export type RecipeNutrition = Tables<'recipe_nutrition'>;
export type ProductSheet = Tables<'product_sheets'>;

// Recipes hooks
export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Recipe[];
    },
  });
}

export function useActiveRecipes() {
  return useQuery({
    queryKey: ['recipes', 'active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Recipe[];
    },
  });
}

// Get only intermediate recipes (poolish, levain, etc.) for use as ingredients
export function useIntermediateRecipes() {
  return useQuery({
    queryKey: ['recipes', 'intermediate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('recipe_type', 'intermediate')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Recipe[];
    },
  });
}

// Get only finished product recipes available for production planning
export function useFinishedRecipes() {
  return useQuery({
    queryKey: ['recipes', 'finished'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('recipes')
        .select('*')
        .eq('recipe_type', 'finished')
        .eq('is_active', true)
        .eq('production_status', 'in_production')
        .order('name');
      
      if (error) throw error;
      return data as Recipe[];
    },
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipes', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Recipe;
    },
    enabled: !!id,
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (recipe: TablesInsert<'recipes'>) => {
      const { data, error } = await supabase
        .from('recipes')
        .insert(recipe)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({
        title: 'Recette créée',
        description: 'La recette a été ajoutée avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la recette: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'recipes'> & { id: string }) => {
      const { data, error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({
        title: 'Recette modifiée',
        description: 'Les modifications ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la recette: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({
        title: 'Recette supprimée',
        description: 'La recette a été supprimée.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la recette: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDuplicateRecipe() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (recipeId: string) => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // 1. Fetch the original recipe
      const { data: originalRecipe, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeId)
        .single();
      
      if (recipeError) throw recipeError;
      
      // 2. Fetch original ingredients
      const { data: originalIngredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .eq('recipe_id', recipeId);
      
      if (ingredientsError) throw ingredientsError;
      
      // 3. Create the duplicate recipe (exclude id, timestamps, code and set new created_by)
      const { 
        id: _id, 
        created_at: _created_at, 
        updated_at: _updated_at, 
        created_by: _created_by,
        code: originalCode,
        ...recipeData 
      } = originalRecipe;
      
      // Generate a new unique code if original had one
      const newCode = originalCode ? `${originalCode}-CPY${Date.now().toString().slice(-4)}` : null;
      
      const { data: newRecipe, error: createError } = await supabase
        .from('recipes')
        .insert({
          ...recipeData,
          name: `${originalRecipe.name} (copie)`,
          code: newCode,
          status: 'draft',
          created_by: user.id,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // 4. Duplicate ingredients if any
      if (originalIngredients && originalIngredients.length > 0) {
        const newIngredients = originalIngredients.map(({ 
          id: _ingId, 
          created_at: _ingCreated, 
          updated_at: _ingUpdated, 
          recipe_id: _recipeId, 
          ...ing 
        }) => ({
          ...ing,
          recipe_id: newRecipe.id,
        }));
        
        const { error: ingredientsInsertError } = await supabase
          .from('recipe_ingredients')
          .insert(newIngredients);
        
        if (ingredientsInsertError) throw ingredientsInsertError;
      }
      
      return newRecipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
      toast({
        title: 'Recette dupliquée',
        description: 'La copie de la recette a été créée avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de dupliquer la recette: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

// Recipe ingredients hooks
export function useRecipeIngredients(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['recipe-ingredients', recipeId],
    staleTime: 0, // Force fresh data
    queryFn: async () => {
      if (!recipeId) return [];
      
      // Fetch ingredients with raw materials
      const { data: ingredients, error } = await supabase
        .from('recipe_ingredients')
        .select(`
          *,
          raw_materials (
            *,
            suppliers (name)
          )
        `)
        .eq('recipe_id', recipeId)
        .order('order_index');
      
      if (error) throw error;
      if (!ingredients) return [];
      
      // Fetch intermediate recipe names separately for PI ingredients
      const piIngredients = ingredients.filter(ing => ing.ingredient_recipe_id);
      const piRecipeIds = piIngredients.map(ing => ing.ingredient_recipe_id).filter(Boolean) as string[];
      
      console.log('PI Recipe IDs to fetch:', piRecipeIds);
      
      let recipesMap: Record<string, { id: string; name: string; code: string | null; recipe_type: string; inco_declaration_mode: string | null; inco_name: string | null }> = {};
      
      if (piRecipeIds.length > 0) {
        const { data: recipes, error: recipesError } = await supabase
          .from('recipes')
          .select('id, name, code, recipe_type, inco_declaration_mode, inco_name')
          .in('id', piRecipeIds);
        
        console.log('Fetched PI recipes:', recipes, 'Error:', recipesError);
        
        if (recipes) {
          recipesMap = recipes.reduce((acc, r) => {
            acc[r.id] = r;
            return acc;
          }, {} as typeof recipesMap);
        }
      }
      
      // Merge ingredient_recipe data into ingredients
      const result = ingredients.map(ing => ({
        ...ing,
        ingredient_recipe: ing.ingredient_recipe_id ? recipesMap[ing.ingredient_recipe_id] || null : null,
      }));
      
      console.log('Final ingredients with PI data:', result.filter(i => i.ingredient_recipe_id));
      
      return result;
    },
    enabled: !!recipeId,
  });
}

export function useCreateRecipeIngredient() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (ingredient: TablesInsert<'recipe_ingredients'>) => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .insert(ingredient)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients', variables.recipe_id] });
      queryClient.invalidateQueries({ queryKey: ['recipe-nutrition'] });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'ajouter l\'ingrédient: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateRecipeIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'recipe_ingredients'> & { id: string }) => {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients'] });
      queryClient.invalidateQueries({ queryKey: ['recipe-nutrition'] });
    },
  });
}

export function useDeleteRecipeIngredient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, recipeId }: { id: string; recipeId: string }) => {
      const { error } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return recipeId;
    },
    onSuccess: (recipeId) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-ingredients', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipe-nutrition'] });
    },
  });
}

// Recipe nutrition hook
export function useRecipeNutrition(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['recipe-nutrition', recipeId],
    queryFn: async () => {
      if (!recipeId) return null;
      const { data, error } = await supabase
        .from('recipe_nutrition')
        .select('*')
        .eq('recipe_id', recipeId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as RecipeNutrition | null;
    },
    enabled: !!recipeId,
  });
}

// Product sheets hooks
export function useProductSheets() {
  return useQuery({
    queryKey: ['product-sheets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheets')
        .select(`
          *,
          recipes (name, code),
          family:product_families (id, code, label)
        `)
        .order('product_name');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useProductSheet(id: string | undefined) {
  return useQuery({
    queryKey: ['product-sheets', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('product_sheets')
        .select(`
          *,
          recipes (
            id,
            name, 
            code,
            yield_quantity,
            yield_unit
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateProductSheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sheet: TablesInsert<'product_sheets'>) => {
      const { data, error } = await supabase
        .from('product_sheets')
        .insert(sheet)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-sheets'] });
      toast({
        title: 'Fiche produit créée',
        description: 'La fiche produit a été ajoutée avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer la fiche produit: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateProductSheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'product_sheets'> & { id: string }) => {
      const { data, error } = await supabase
        .from('product_sheets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-sheets'] });
      toast({
        title: 'Fiche produit modifiée',
        description: 'Les modifications ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier la fiche produit: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDuplicateProductSheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { data: source, error: fetchError } = await supabase
        .from('product_sheets')
        .select('*')
        .eq('id', sourceId)
        .single();

      if (fetchError) throw fetchError;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, created_at, updated_at, published_at, is_published, version, inco_validated_at, inco_validated_by, inco_validation_comment, inco_status, inco_version, ...rest } = source;

      const { data, error } = await supabase
        .from('product_sheets')
        .insert({
          ...rest,
          product_name: `${source.product_name} (copie)`,
          is_published: false,
          version: 1,
          inco_status: 'draft',
          inco_version: 0,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-sheets'] });
      toast({
        title: 'Fiche technique dupliquée',
        description: 'La copie a été créée en tant que brouillon.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de dupliquer: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProductSheet() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('product_sheets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-sheets'] });
      toast({
        title: 'Fiche produit supprimée',
        description: 'La fiche produit a été supprimée.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer la fiche produit: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}
