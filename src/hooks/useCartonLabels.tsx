import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { generateIngredientLists } from '@/lib/ingredientListGenerator';

interface SnapshotIngredient {
  name: string;
  composition: string | null;
  bakerPercentage: number;
  allergens: string[];
  allergensSecondary: string[];
}

interface SnapshotNutrition {
  energyKcal: number | null;
  energyKj: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
}

export interface CartonLabel {
  id: string;
  product_sheet_id: string;
  label_title: string;
  language: string;
  status: 'draft' | 'validated' | 'archived';
  validated_at: string | null;
  validated_by: string | null;
  validation_comment: string | null;
  version: number;
  snapshot_product_sheet_version: number | null;
  snapshot_ingredients_html: string | null;
  snapshot_ingredients_html_original: string | null;
  snapshot_allergens_secondary: string[] | null;
  snapshot_nutrition: Record<string, number> | null;
  snapshot_net_weight: number | null;
  snapshot_net_weight_unit: string | null;
  snapshot_storage_instructions: string | null;
  snapshot_thawing_instructions: string | null;
  snapshot_created_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  product_sheets?: {
    id: string;
    product_name: string;
    product_reference: string | null;
    version: number;
    is_published: boolean;
    snapshot_ingredients: unknown;
    snapshot_allergens: unknown;
    snapshot_nutrition: unknown;
    net_weight: number | null;
    net_weight_unit: string | null;
    storage_instructions: string | null;
    thawing_instructions: string | null;
  };
}

export function useCartonLabels() {
  return useQuery({
    queryKey: ['carton-labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('carton_labels')
        .select(`
          *,
          product_sheets (
            id,
            product_name,
            product_reference,
            version,
            is_published,
            snapshot_ingredients,
            snapshot_allergens,
            snapshot_nutrition,
            net_weight,
            net_weight_unit,
            storage_instructions,
            thawing_instructions
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as CartonLabel[];
    },
  });
}

export function useCartonLabel(id: string | undefined) {
  return useQuery({
    queryKey: ['carton-labels', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('carton_labels')
        .select(`
          *,
          product_sheets (
            id,
            product_name,
            product_reference,
            version,
            is_published,
            snapshot_ingredients,
            snapshot_allergens,
            snapshot_nutrition,
            net_weight,
            net_weight_unit,
            storage_instructions,
            thawing_instructions
          )
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as CartonLabel;
    },
    enabled: !!id,
  });
}

// Get validated product sheets for selection
// Get product sheets where both FT and INCO are validated
export function useValidatedProductSheets() {
  return useQuery({
    queryKey: ['product-sheets', 'validated-with-inco'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheets')
        .select('*')
        .eq('is_published', true)
        .eq('inco_status', 'validated')
        .order('product_name');
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateCartonLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (label: {
      product_sheet_id: string;
      label_title: string;
      language?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Fetch the product sheet to create snapshot
      const { data: sheet, error: sheetError } = await supabase
        .from('product_sheets')
        .select('*')
        .eq('id', label.product_sheet_id)
        .single();
      
      if (sheetError) throw sheetError;
      if (!sheet.is_published) throw new Error('La fiche technique doit être validée');
      if ((sheet as any).inco_status !== 'validated') throw new Error('L\'INCO de la fiche technique doit être validée');

      // Parse snapshot data from FT
      const snapshotIngredients = sheet.snapshot_ingredients as unknown as SnapshotIngredient[] | null;
      const snapshotAllergens = sheet.snapshot_allergens as unknown as { main?: string[]; secondary?: string[] } | null;
      const snapshotNutrition = sheet.snapshot_nutrition as unknown as SnapshotNutrition | null;

      // Use INCO HTML from FT (validated at FT level) or fallback to generation
      let ingredientsHtml = (sheet as any).inco_html || '';
      if (!ingredientsHtml && snapshotIngredients && snapshotIngredients.length > 0) {
        const allAllergens = [...new Set(
          snapshotIngredients.flatMap((ing) => ing.allergens || [])
        )].sort();
        
        const lists = generateIngredientLists(snapshotIngredients, allAllergens);
        ingredientsHtml = lists.condensedHtml;
      }

      // Convert nutrition to per 100g format for display
      const nutritionFor100g = snapshotNutrition ? {
        per_100g_energy_kcal: snapshotNutrition.energyKcal,
        per_100g_energy_kj: snapshotNutrition.energyKj,
        per_100g_fat: snapshotNutrition.fat,
        per_100g_saturated_fat: snapshotNutrition.saturatedFat,
        per_100g_carbohydrates: snapshotNutrition.carbohydrates,
        per_100g_sugars: snapshotNutrition.sugars,
        per_100g_fiber: snapshotNutrition.fiber,
        per_100g_protein: snapshotNutrition.protein,
        per_100g_salt: snapshotNutrition.salt,
      } : null;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const lang = label.language || 'fr';
      const isFrench = lang === 'fr';

      const { data, error } = await supabase
        .from('carton_labels')
        .insert({
          product_sheet_id: label.product_sheet_id,
          label_title: label.label_title,
          language: lang,
          created_by: user.id,
          // French labels are validated immediately (snapshot from FT is FR).
          // Other languages start as draft so the user can translate INCO and instructions.
          status: isFrench ? 'validated' : 'draft',
          validated_at: isFrench ? new Date().toISOString() : null,
          validated_by: isFrench ? user.id : null,
          snapshot_product_sheet_version: sheet.version,
          snapshot_ingredients_html: ingredientsHtml || null,
          snapshot_ingredients_html_original: ingredientsHtml || null,
          snapshot_allergens_secondary: snapshotAllergens?.secondary || [],
          snapshot_nutrition: nutritionFor100g,
          snapshot_net_weight: sheet.carton_weight,
          snapshot_net_weight_unit: 'kg',
          snapshot_storage_instructions: sheet.storage_instructions,
          snapshot_thawing_instructions: sheet.thawing_instructions,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carton-labels'] });
      toast({
        title: 'Étiquette carton créée',
        description: 'L\'étiquette a été créée avec succès.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer l\'étiquette: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCartonLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, label_title }: { id: string; label_title: string }) => {
      const { data, error } = await supabase
        .from('carton_labels')
        .update({ label_title })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carton-labels'] });
      toast({
        title: 'Étiquette modifiée',
        description: 'Les modifications ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier l\'étiquette: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

// Update INCO HTML content (manual edit - only for drafts)
export function useUpdateIncoHtml() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, html }: { id: string; html: string }) => {
      // Verify label is in draft status
      const { data: label, error: labelError } = await supabase
        .from('carton_labels')
        .select('status, snapshot_ingredients_html, snapshot_ingredients_html_original')
        .eq('id', id)
        .single();

      if (labelError) throw labelError;
      if (label.status !== 'draft') throw new Error('Seuls les brouillons peuvent être modifiés');

      // Save original if not already saved
      const updates: Record<string, unknown> = {
        snapshot_ingredients_html: html,
      };
      if (!label.snapshot_ingredients_html_original) {
        updates.snapshot_ingredients_html_original = label.snapshot_ingredients_html;
      }

      const { data, error } = await supabase
        .from('carton_labels')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carton-labels'] });
      toast({
        title: 'Liste INCO modifiée',
        description: 'Les modifications ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Archive a validated label (called when recipe changes)
export function useArchiveCartonLabel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('carton_labels')
        .update({ status: 'archived' })
        .eq('id', id)
        .eq('status', 'validated')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carton-labels'] });
    },
  });
}

export function useValidateCartonLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      // Check if product sheet is still validated
      const { data: label, error: labelError } = await supabase
        .from('carton_labels')
        .select('product_sheet_id, version')
        .eq('id', id)
        .single();
      
      if (labelError) throw labelError;

      const { data: sheet, error: sheetError } = await supabase
        .from('product_sheets')
        .select('is_published, version')
        .eq('id', label.product_sheet_id)
        .single();
      
      if (sheetError) throw sheetError;
      if (!sheet.is_published) throw new Error('La fiche technique n\'est plus validée');

      const { data, error } = await supabase
        .from('carton_labels')
        .update({
          status: 'validated',
          validated_at: new Date().toISOString(),
          validated_by: user.id,
          validation_comment: comment || null,
          version: label.version + 1,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carton-labels'] });
      toast({
        title: 'Étiquette validée',
        description: 'L\'étiquette est maintenant imprimable.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de valider l\'étiquette: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCartonLabel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('carton_labels')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carton-labels'] });
      toast({
        title: 'Étiquette supprimée',
        description: 'L\'étiquette a été supprimée.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer l\'étiquette: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

// Refresh snapshot from product sheet
export function useRefreshCartonLabelSnapshot() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get current label
      const { data: label, error: labelError } = await supabase
        .from('carton_labels')
        .select('product_sheet_id')
        .eq('id', id)
        .single();
      
      if (labelError) throw labelError;

      // Get updated product sheet
      const { data: sheet, error: sheetError } = await supabase
        .from('product_sheets')
        .select('*')
        .eq('id', label.product_sheet_id)
        .single();
      
      if (sheetError) throw sheetError;
      if (!sheet.is_published) throw new Error('La fiche technique doit être validée');

      // Parse snapshot data from FT
      const snapshotIngredients = sheet.snapshot_ingredients as unknown as SnapshotIngredient[] | null;
      const snapshotAllergens = sheet.snapshot_allergens as unknown as { main?: string[]; secondary?: string[] } | null;
      const snapshotNutrition = sheet.snapshot_nutrition as unknown as SnapshotNutrition | null;

      // Use INCO HTML from FT (validated at FT level) or fallback to generation
      let ingredientsHtml = (sheet as any).inco_html || '';
      if (!ingredientsHtml && snapshotIngredients && snapshotIngredients.length > 0) {
        const allAllergens = [...new Set(
          snapshotIngredients.flatMap((ing) => ing.allergens || [])
        )].sort();
        
        const lists = generateIngredientLists(snapshotIngredients, allAllergens);
        ingredientsHtml = lists.condensedHtml;
      }

      // Convert nutrition to per 100g format for display
      const nutritionFor100g = snapshotNutrition ? {
        per_100g_energy_kcal: snapshotNutrition.energyKcal,
        per_100g_energy_kj: snapshotNutrition.energyKj,
        per_100g_fat: snapshotNutrition.fat,
        per_100g_saturated_fat: snapshotNutrition.saturatedFat,
        per_100g_carbohydrates: snapshotNutrition.carbohydrates,
        per_100g_sugars: snapshotNutrition.sugars,
        per_100g_fiber: snapshotNutrition.fiber,
        per_100g_protein: snapshotNutrition.protein,
        per_100g_salt: snapshotNutrition.salt,
      } : null;

      const { data, error } = await supabase
        .from('carton_labels')
        .update({
          status: 'draft',
          snapshot_product_sheet_version: sheet.version,
          snapshot_ingredients_html: ingredientsHtml || null,
          snapshot_ingredients_html_original: ingredientsHtml || null,
          snapshot_allergens_secondary: snapshotAllergens?.secondary || [],
          snapshot_nutrition: nutritionFor100g,
          snapshot_net_weight: sheet.carton_weight,
          snapshot_net_weight_unit: 'kg',
          snapshot_storage_instructions: sheet.storage_instructions,
          snapshot_thawing_instructions: sheet.thawing_instructions,
          snapshot_created_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carton-labels'] });
      toast({
        title: 'Données actualisées',
        description: 'Les données de la fiche technique ont été mises à jour.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible d\'actualiser les données: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}
