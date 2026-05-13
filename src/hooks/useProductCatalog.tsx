import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============ TYPES ============
export interface NutritionProfile {
  id: string;
  name: string | null;
  energy_kj: number | null;
  energy_kcal: number | null;
  fat: number | null;
  saturated_fat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
}

export interface ProductMaster {
  id: string;
  sku_base: string;
  label: string;
  family_id: string | null;
  recipe_id: string | null;
  nutrition_profile_id: string | null;
  product_sheet_id: string | null;
  active: boolean;
  created_at: string;
}

export interface ErpArticle {
  id: string;
  product_id: string;
  erp_code: string;
  erp_label: string;
  temperature_state: 'FR' | 'FZ';
  slicing_state: 'SLI' | 'WHO';
  packaging_code: 'U01' | 'C04' | 'C05' | 'C18' | 'C24' | 'PAL';
  barcode_value: string | null;
  active: boolean;
  created_at: string;
}

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

// ============ RECIPES (kept for compat) ============
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

// ============ PRODUCT SHEETS (fiches techniques) ============
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

// ============ NUTRITION PROFILES ============
export function useNutritionProfiles() {
  return useQuery({
    queryKey: ['nutrition_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('nutrition_profiles')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as NutritionProfile[];
    },
  });
}

// ============ PRODUCTS MASTER ============
export function useProductsMaster() {
  return useQuery({
    queryKey: ['products_master'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products_master')
        .select(`
          *,
          family:product_families(id, code, label),
          recipe:recipes(id, name, code),
          product_sheet:product_sheets(id, product_name, product_reference, version, net_weight, net_weight_unit),
          nutrition:nutrition_profiles(id, name)
        `)
        .order('sku_base');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useProductMasterMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['products_master'] });
    qc.invalidateQueries({ queryKey: ['erp_articles'] });
  };

  const create = useMutation({
    mutationFn: async (payload: Partial<ProductMaster>) => {
      const { data, error } = await supabase
        .from('products_master')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Produit maître créé');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ProductMaster> & { id: string }) => {
      const { error } = await supabase
        .from('products_master')
        .update(payload as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Produit maître mis à jour');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await supabase
        .from('products_master')
        .select('*')
        .eq('id', id)
        .single();
      if (e1) throw e1;
      const copy = {
        ...src,
        id: undefined,
        sku_base: src.sku_base + '-CPY',
        label: src.label + ' (copie)',
        created_at: undefined,
        updated_at: undefined,
      };
      const { data, error } = await supabase
        .from('products_master')
        .insert(copy as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Produit dupliqué');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('products_master')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Statut mis à jour');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { create, update, duplicate, setActive };
}

// ============ ERP ARTICLES ============
export function useErpArticles() {
  return useQuery({
    queryKey: ['erp_articles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('erp_articles')
        .select(`
          *,
          product:products_master(id, sku_base, label, family:product_families(code, label)),
          templates:article_templates(template:label_templates(id, template_code, template_name))
        `)
        .order('erp_code');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useErpArticleMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['erp_articles'] });

  const create = useMutation({
    mutationFn: async ({
      template_id,
      ...payload
    }: Partial<ErpArticle> & { template_id?: string | null }) => {
      const { data, error } = await supabase
        .from('erp_articles')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      if (template_id) {
        await supabase.from('article_templates').insert({
          erp_article_id: data.id,
          template_id,
        });
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Article ERP créé');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({
      id,
      template_id,
      ...payload
    }: Partial<ErpArticle> & { id: string; template_id?: string | null }) => {
      const { error } = await supabase
        .from('erp_articles')
        .update(payload as any)
        .eq('id', id);
      if (error) throw error;
      if (template_id !== undefined) {
        await supabase.from('article_templates').delete().eq('erp_article_id', id);
        if (template_id) {
          await supabase.from('article_templates').insert({
            erp_article_id: id,
            template_id,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success('Article mis à jour');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('erp_articles')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Statut mis à jour');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error: e1 } = await supabase
        .from('erp_articles')
        .select('*, templates:article_templates(template_id)')
        .eq('id', id)
        .single();
      if (e1) throw e1;
      const { templates, id: _id, created_at, updated_at, ...rest } = src as any;
      const copy = {
        ...rest,
        erp_code: `${rest.erp_code}-CPY`,
        erp_label: `${rest.erp_label} (copie)`,
        barcode_value: null,
        active: false,
      };
      const { data, error } = await supabase
        .from('erp_articles')
        .insert(copy)
        .select()
        .single();
      if (error) throw error;
      const tplId = templates?.[0]?.template_id;
      if (tplId) {
        await supabase.from('article_templates').insert({
          erp_article_id: data.id,
          template_id: tplId,
        });
      }
      return data;
    },
    onSuccess: () => {
      toast.success('Article ERP dupliqué');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('article_templates').delete().eq('erp_article_id', id);
      const { error } = await supabase.from('erp_articles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Article ERP supprimé');
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { create, update, setActive, duplicate, remove };
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
