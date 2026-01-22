import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Supplier {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
}

export interface RawMaterial {
  id: string;
  name: string;
  type: 'farine' | 'ingredient';
  supplier_id: string | null;
  category: string | null;
  unit: string | null;
  description: string | null;
  composition: string | null;
  requires_cold_storage: boolean;
  requires_dlc_check: boolean;
  storage_temp_min: number | null;
  storage_temp_max: number | null;
  allergens: string[] | null;
  allergens_secondary: string[] | null;
  energy_kcal: number | null;
  energy_kj: number | null;
  fat: number | null;
  saturated_fat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
  price: number | null;
  price_unit: string | null;
  // New fields for purchase unit management
  purchase_unit: string | null;
  purchase_price: number | null;
  density: number | null;
  is_active: boolean;
}

export interface RawMaterialWithSupplier extends RawMaterial {
  suppliers: {
    id: string;
    name: string;
  } | null;
}

// Suppliers hooks
export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Supplier[];
    },
  });
}

export function useAllSuppliers() {
  return useQuery({
    queryKey: ['suppliers', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as Supplier[];
    },
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (supplier: Omit<Supplier, 'id' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert(supplier)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur ajouté');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'ajout du fournisseur');
      console.error(error);
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Fournisseur supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression. Ce fournisseur est peut-être utilisé par des matières premières.');
      console.error(error);
    },
  });
}

// Raw Materials hooks
export function useRawMaterials(supplierId?: string) {
  return useQuery({
    queryKey: ['raw_materials', supplierId],
    queryFn: async () => {
      let query = supabase
        .from('raw_materials')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (supplierId) {
        query = query.eq('supplier_id', supplierId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as unknown as RawMaterial[];
    },
    enabled: !supplierId || supplierId.length > 0,
  });
}

export function useAllRawMaterials() {
  return useQuery({
    queryKey: ['raw_materials', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select(`
          *,
          suppliers (
            id,
            name
          )
        `)
        .order('name');
      
      if (error) throw error;
      return data as unknown as RawMaterialWithSupplier[];
    },
  });
}

export function useRawMaterialsBySupplier() {
  return useQuery({
    queryKey: ['raw_materials_with_suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raw_materials')
        .select(`
          *,
          suppliers (
            id,
            name
          )
        `)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as unknown as RawMaterialWithSupplier[];
    },
  });
}

export function useCreateRawMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (material: Omit<RawMaterial, 'id' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('raw_materials')
        .insert(material)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast.success('Matière première ajoutée');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'ajout de la matière première');
      console.error(error);
    },
  });
}

export function useUpdateRawMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RawMaterial> & { id: string }) => {
      const { data, error } = await supabase
        .from('raw_materials')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast.success('Matière première mise à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });
}

export function useDeleteRawMaterial() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('raw_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['raw_materials'] });
      toast.success('Matière première supprimée');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression. Cette matière première est peut-être utilisée dans des recettes.');
      console.error(error);
    },
  });
}
