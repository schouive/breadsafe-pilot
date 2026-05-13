import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductSheetPackaging {
  id: string;
  product_sheet_id: string;
  packaging_code: 'U01' | 'C04' | 'C05' | 'C18' | 'C24' | 'PAL';
  erp_code: string;
  erp_label: string;
  barcode_value: string | null;
  temperature_state: 'FR' | 'FZ';
  slicing_state: 'SLI' | 'WHO';
  pieces_per_carton: number | null;
  cartons_per_layer: number | null;
  layers_per_pallet: number | null;
  carton_weight: number | null;
  carton_dimensions: string | null;
  template_id: string | null;
  active: boolean;
  print_order: number;
  created_at: string;
  updated_at: string;
}

export function useProductSheetPackagings(sheetId?: string) {
  return useQuery({
    queryKey: ['product_sheet_packagings', sheetId],
    enabled: !!sheetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheet_packagings')
        .select('*')
        .eq('product_sheet_id', sheetId!)
        .order('print_order')
        .order('created_at');
      if (error) throw error;
      return data as ProductSheetPackaging[];
    },
  });
}

export function useUpsertPackaging() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ProductSheetPackaging> & { product_sheet_id: string }) => {
      const { id, created_at, updated_at, ...rest } = input as any;
      if (id) {
        const { data, error } = await supabase
          .from('product_sheet_packagings')
          .update(rest)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('product_sheet_packagings')
        .insert(rest)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['product_sheet_packagings', data.product_sheet_id] });
      toast.success('Conditionnement enregistré');
    },
    onError: (e: any) => toast.error(e.message || 'Erreur'),
  });
}

export function useDeletePackaging() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; product_sheet_id: string }) => {
      const { error } = await supabase
        .from('product_sheet_packagings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['product_sheet_packagings', vars.product_sheet_id] });
      toast.success('Conditionnement supprimé');
    },
    onError: (e: any) => toast.error(e.message || 'Erreur'),
  });
}
