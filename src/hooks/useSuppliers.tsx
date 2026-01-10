import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  supplier_id: string;
  category: string | null;
  unit: string | null;
  requires_cold_storage: boolean;
  storage_temp_min: number | null;
  storage_temp_max: number | null;
  allergens: string[] | null;
  is_active: boolean;
}

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
      return data as RawMaterial[];
    },
    enabled: !supplierId || supplierId.length > 0,
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
      return data;
    },
  });
}
