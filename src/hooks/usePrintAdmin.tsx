import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductFamily { id: string; code: string; label: string; active: boolean; }
export interface Allergen { id: string; code: string; label: string; }
export interface PackagingType { id: string; code: string; label: string; quantity: number; active: boolean; }
export interface LabelTemplate { id: string; template_code: string; template_name: string; zpl_filename: string | null; active: boolean; }

export function useProductFamilies() {
  return useQuery({
    queryKey: ['product_families'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_families').select('*').order('code');
      if (error) throw error;
      return (data ?? []) as ProductFamily[];
    },
  });
}

export function useAllergens() {
  return useQuery({
    queryKey: ['allergens'],
    queryFn: async () => {
      const { data, error } = await supabase.from('allergens').select('*').order('label');
      if (error) throw error;
      return (data ?? []) as Allergen[];
    },
  });
}

export function usePackagingTypes() {
  return useQuery({
    queryKey: ['packaging_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('packaging_types').select('*').order('code');
      if (error) throw error;
      return (data ?? []) as PackagingType[];
    },
  });
}

export function useLabelTemplates() {
  return useQuery({
    queryKey: ['label_templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('label_templates').select('*').order('template_code');
      if (error) throw error;
      return (data ?? []) as LabelTemplate[];
    },
  });
}

export function useUpsertEntity<T extends { id?: string }>(table: 'product_families' | 'allergens' | 'packaging_types' | 'label_templates') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<T>) => {
      if (payload.id) {
        const { id, ...rest } = payload as any;
        const { error } = await supabase.from(table).update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table).insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export function useDeleteEntity(table: 'product_families' | 'allergens' | 'packaging_types' | 'label_templates') {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete si la table a une colonne active
      if (table === 'allergens') {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from(table as any).update({ active: false }).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}
