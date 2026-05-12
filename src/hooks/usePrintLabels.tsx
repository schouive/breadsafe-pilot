import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PrintProduct {
  id: string;                // erp_articles.id
  erp_code: string;
  erp_label: string;
  sku_base: string;          // products_master.sku_base
  family: string;            // family code
  label: string;             // products_master.label
  temperature: 'FR' | 'FZ';
  slicing: 'SLI' | 'WHO';
  packaging: 'U01' | 'C05' | 'C18' | 'C24' | 'PAL';
  template_name: string | null;
  barcode_value: string | null;
  active: boolean;
  // Données fiche technique pour étiquette
  product_name: string | null;
  net_weight: number | null;
  net_weight_unit: string | null;
  ingredients_html: string | null;
  allergen_statement: string | null;
  traces_statement: string | null;
  storage_instructions: string | null;
  thawing_instructions: string | null;
  nutrition: {
    energyKj?: number; energyKcal?: number;
    fat?: number; saturatedFat?: number;
    carbohydrates?: number; sugars?: number;
    fiber?: number; protein?: number; salt?: number;
  } | null;
  inco_status: string | null;
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
    queryKey: ['print_products_erp'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_articles')
        .select(`
          id, erp_code, erp_label, temperature_state, slicing_state,
          packaging_code, barcode_value, active,
          product:products_master!inner(
            sku_base, label,
            family:product_families(code, label),
            sheet:product_sheets(
              product_name, net_weight, net_weight_unit,
              inco_html, allergen_statement, snapshot_allergens,
              storage_instructions, thawing_instructions,
              snapshot_nutrition, inco_status
            )
          ),
          templates:article_templates(template:label_templates(template_code, template_name))
        `)
        .eq('active', true)
        .order('erp_code');
      if (error) throw error;
      return (data ?? []).map((a: any) => {
        const sheet = a.product?.sheet ?? null;
        const snapshotAllergens = sheet?.snapshot_allergens as { secondary?: string[] } | null;
        return {
          id: a.id,
          erp_code: a.erp_code,
          erp_label: a.erp_label,
          sku_base: a.product?.sku_base ?? a.erp_code,
          label: a.product?.label ?? a.erp_label,
          family: a.product?.family?.code ?? '—',
          temperature: a.temperature_state,
          slicing: a.slicing_state,
          packaging: a.packaging_code,
          template_name: a.templates?.[0]?.template?.template_code ?? null,
          barcode_value: a.barcode_value,
          active: a.active,
          product_name: sheet?.product_name ?? null,
          net_weight: sheet?.net_weight ?? null,
          net_weight_unit: sheet?.net_weight_unit ?? null,
          ingredients_html: sheet?.inco_html ?? null,
          allergen_statement: sheet?.allergen_statement ?? null,
          traces_statement: snapshotAllergens?.secondary?.join(', ') ?? null,
          storage_instructions: sheet?.storage_instructions ?? null,
          thawing_instructions: sheet?.thawing_instructions ?? null,
          nutrition: sheet?.snapshot_nutrition ?? null,
          inco_status: sheet?.inco_status ?? null,
        };
      }) as PrintProduct[];
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
    mutationFn: async (payload: Omit<PrintHistoryEntry, 'id' | 'operator_id' | 'printed_at' | 'variant_id'>) => {
      if (!user) throw new Error('Non authentifié');
      const { data, error } = await supabase
        .from('print_history')
        .insert({ ...payload, variant_id: null, operator_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['print_history'] }),
  });
}
