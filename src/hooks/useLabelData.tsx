import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LabelData {
  id: string;
  recipe_id: string;
  product_reference: string | null;
  commercial_designation: string | null;
  pieces_per_carton: number | null;
  cartons_per_layer: number | null;
  cartons_per_pallet: number | null;
  net_weight: number | null;
  net_weight_unit: string | null;
  carton_format: string | null;
  usage_instructions: string | null;
  thawing_instructions: string | null;
  storage_conditions: string | null;
  product_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export function useLabelData(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['label-data', recipeId],
    queryFn: async () => {
      if (!recipeId) return null;
      const { data, error } = await supabase
        .from('label_data')
        .select('*')
        .eq('recipe_id', recipeId)
        .maybeSingle();
      
      if (error) throw error;
      return data as LabelData | null;
    },
    enabled: !!recipeId,
  });
}

export function useAllLabelData() {
  return useQuery({
    queryKey: ['label-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('label_data')
        .select(`
          *,
          recipes (id, name, code)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateLabelData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (labelData: Omit<LabelData, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('label_data')
        .insert(labelData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-data'] });
      toast({
        title: 'Données étiquette créées',
        description: 'Les données d\'étiquette ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de créer les données: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLabelData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LabelData> & { id: string }) => {
      const { data, error } = await supabase
        .from('label_data')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-data'] });
      toast({
        title: 'Données mises à jour',
        description: 'Les modifications ont été enregistrées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useUpsertLabelData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (labelData: Omit<LabelData, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => {
      const { data, error } = await supabase
        .from('label_data')
        .upsert(labelData, { onConflict: 'recipe_id' })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['label-data'] });
      toast({
        title: 'Données enregistrées',
        description: 'Les données d\'étiquette ont été sauvegardées.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder: ' + error.message,
        variant: 'destructive',
      });
    },
  });
}
