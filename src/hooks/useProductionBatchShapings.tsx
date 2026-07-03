import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BatchShaping {
  id: string;
  batch_id: string;
  product_sheet_id: string;
  chariots: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompatibleSheet {
  id: string;
  product_name: string;
  product_reference: string | null;
  net_weight: number | null;
  net_weight_unit: string | null;
  pieces_per_carton: number | null;
}

const client = supabase as any;

export function useCompatibleSheets(recipeId: string | undefined) {
  return useQuery({
    queryKey: ['product_sheets', 'by_recipe', recipeId],
    enabled: !!recipeId,
    queryFn: async () => {
      const { data, error } = await client
        .from('product_sheets')
        .select('id, product_name, product_reference, net_weight, net_weight_unit, pieces_per_carton, is_published')
        .eq('recipe_id', recipeId)
        .eq('is_published', true)
        .order('product_name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as CompatibleSheet[];
    },
  });
}

export function useBatchShapings(batchId: string | undefined) {
  return useQuery({
    queryKey: ['batch_shapings', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await client
        .from('production_batch_shapings')
        .select('*')
        .eq('batch_id', batchId);
      if (error) throw error;
      return (data ?? []) as BatchShaping[];
    },
  });
}

export function useUpsertBatchShaping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      batchId,
      productSheetId,
      chariots,
    }: {
      batchId: string;
      productSheetId: string;
      chariots: number;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await client
        .from('production_batch_shapings')
        .upsert(
          {
            batch_id: batchId,
            product_sheet_id: productSheetId,
            chariots,
            created_by: userData.user?.id,
          },
          { onConflict: 'batch_id,product_sheet_id' }
        )
        .select()
        .single();
      if (error) throw error;
      return data as BatchShaping;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['batch_shapings', data.batch_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
