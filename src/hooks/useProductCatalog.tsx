import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ============ FAMILIES ============
export function useFamilies() {
  return useQuery({
    queryKey: ['product_families'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_families')
        .select('*')
        .order('code');
      if (error) throw error;
      return data;
    },
  });
}

// ============ RECIPES ============
export function useCatalogRecipes() {
  return useQuery({
    queryKey: ['recipes-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('id, name, code, is_active, status, recipe_type')
        .eq('is_active', true)
        .eq('status', 'validated')
        .eq('recipe_type', 'finished')
        .order('name');
      if (error) throw error;
      return data;
    },
  });
}

// ============ PRODUCT SHEETS ============
export function useCatalogProductSheets() {
  return useQuery({
    queryKey: ['product_sheets-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheets')
        .select('id, product_name, product_reference, version, is_published, net_weight, net_weight_unit')
        .eq('is_published', true)
        .order('product_name');
      if (error) throw error;
      return data;
    },
  });
}

// ============ LABEL TEMPLATES ============
export function useLabelTemplates() {
  return useQuery({
    queryKey: ['label_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('label_templates')
        .select('*')
        .order('template_name');
      if (error) throw error;
      return data;
    },
  });
}
