import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CartonLabel {
  id: string;
  product_sheet_id: string;
  label_title: string;
  status: 'draft' | 'validated';
  validated_at: string | null;
  validated_by: string | null;
  validation_comment: string | null;
  version: number;
  snapshot_product_sheet_version: number | null;
  snapshot_ingredients_html: string | null;
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
    version: number;
    is_published: boolean;
    snapshot_ingredients: { condensedHtml?: string } | null;
    snapshot_allergens: { secondary?: string[] } | null;
    snapshot_nutrition: Record<string, number> | null;
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
export function useValidatedProductSheets() {
  return useQuery({
    queryKey: ['product-sheets', 'validated'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheets')
        .select('*')
        .eq('is_published', true)
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

      const snapshotIngredients = sheet.snapshot_ingredients as { condensedHtml?: string } | null;
      const snapshotAllergens = sheet.snapshot_allergens as { secondary?: string[] } | null;

      const { data, error } = await supabase
        .from('carton_labels')
        .insert({
          product_sheet_id: label.product_sheet_id,
          label_title: label.label_title,
          created_by: user.id,
          snapshot_product_sheet_version: sheet.version,
          snapshot_ingredients_html: snapshotIngredients?.condensedHtml || null,
          snapshot_allergens_secondary: snapshotAllergens?.secondary || [],
          snapshot_nutrition: sheet.snapshot_nutrition,
          snapshot_net_weight: sheet.net_weight,
          snapshot_net_weight_unit: sheet.net_weight_unit,
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

      const snapshotIngredients = sheet.snapshot_ingredients as { condensedHtml?: string } | null;
      const snapshotAllergens = sheet.snapshot_allergens as { secondary?: string[] } | null;

      const { data, error } = await supabase
        .from('carton_labels')
        .update({
          status: 'draft', // Reset to draft when refreshing
          snapshot_product_sheet_version: sheet.version,
          snapshot_ingredients_html: snapshotIngredients?.condensedHtml || null,
          snapshot_allergens_secondary: snapshotAllergens?.secondary || [],
          snapshot_nutrition: sheet.snapshot_nutrition,
          snapshot_net_weight: sheet.net_weight,
          snapshot_net_weight_unit: sheet.net_weight_unit,
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
