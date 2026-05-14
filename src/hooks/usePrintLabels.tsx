import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PrintProduct {
  id: string;                // product_sheet_packagings.id
  erp_code: string;
  erp_label: string;
  sku_base: string;          // product_sheets.product_reference (fallback erp_code)
  family: string;            // code famille (ou '—')
  family_label: string;      // libellé famille
  label: string;             // product_sheets.product_name
  temperature: 'FR' | 'FZ';
  slicing: 'SLI' | 'WHO';
  packaging: 'U01' | 'C04' | 'C05' | 'C18' | 'C24' | 'PAL';
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
    queryKey: ['print_products_psp'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('product_sheet_packagings')
        .select(`
          id, erp_code, erp_label, temperature_state, slicing_state,
          packaging_code, barcode_value, active,
          template:label_templates(template_code, template_name),
          sheet:product_sheets!inner(
            product_name, product_reference, net_weight, net_weight_unit,
            inco_html, allergen_statement, snapshot_allergens,
            storage_instructions, thawing_instructions,
            snapshot_nutrition, inco_status,
            family:product_families(code, label)
          )
        `)
        .eq('active', true)
        .eq('sheet.inco_status', 'validated')
        .order('erp_code');
      if (error) throw error;
      return ((data ?? []) as any[]).map((p) => {
        const sheet = p.sheet ?? null;
        const snapshotAllergens = sheet?.snapshot_allergens as { secondary?: string[] } | null;
        return {
          id: p.id,
          erp_code: p.erp_code,
          erp_label: p.erp_label,
          sku_base: sheet?.product_reference ?? p.erp_code,
          label: sheet?.product_name ?? p.erp_label,
          family: sheet?.family?.code ?? '—',
          family_label: sheet?.family?.label ?? '—',
          temperature: p.temperature_state,
          slicing: p.slicing_state,
          packaging: p.packaging_code,
          template_name: p.template?.template_code ?? null,
          barcode_value: p.barcode_value,
          active: p.active,
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
        } as PrintProduct;
      });
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
