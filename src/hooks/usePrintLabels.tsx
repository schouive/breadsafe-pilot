import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PrintProduct {
  id: string;
  old_code: string | null;
  sku_base: string;
  family: string;
  label: string;
  active: boolean;
}

export interface PrintVariant {
  id: string;
  product_id: string;
  temperature: 'FR' | 'FZ';
  slicing: 'SLI' | 'WHO';
  packaging: 'U01' | 'C05' | 'C24' | 'PAL';
  template_name: string;
  is_active: boolean;
}

export interface PrintHistoryEntry {
  id: string;
  product_id: string;
  variant_id: string | null;
  final_sku: string;
  sku_base: string;
  old_code: string | null;
  temperature: string;
  slicing: string;
  packaging: string;
  template_name: string;
  lot_number: string;
  ddm: string;
  quantity: number;
  operator_id: string;
  printed_at: string;
}

export function usePrintProducts() {
  return useQuery({
    queryKey: ['print_products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_products')
        .select('*')
        .eq('active', true)
        .order('label');
      if (error) throw error;
      return (data ?? []) as PrintProduct[];
    },
  });
}

export function usePrintVariants(productId?: string) {
  return useQuery({
    queryKey: ['print_variants', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_product_variants')
        .select('*')
        .eq('product_id', productId!)
        .eq('is_active', true);
      if (error) throw error;
      return (data ?? []) as PrintVariant[];
    },
  });
}

export function usePrintHistory(limit = 10) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['print_history', user?.id, limit],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_history')
        .select('*')
        .order('printed_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as PrintHistoryEntry[];
    },
  });
}

export function usePrintFavorites() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['print_favorites', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_favorites')
        .select('product_id')
        .eq('operator_id', user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.product_id as string);
    },
  });
}

export function useToggleFavorite() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, isFav }: { productId: string; isFav: boolean }) => {
      if (!user) throw new Error('Non authentifié');
      if (isFav) {
        const { error } = await supabase
          .from('print_favorites')
          .delete()
          .eq('operator_id', user.id)
          .eq('product_id', productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('print_favorites')
          .insert({ operator_id: user.id, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['print_favorites'] }),
  });
}

export function useRecordPrint() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<PrintHistoryEntry, 'id' | 'operator_id' | 'printed_at'>) => {
      if (!user) throw new Error('Non authentifié');
      const { data, error } = await supabase
        .from('print_history')
        .insert({ ...payload, operator_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['print_history'] }),
  });
}
