import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ControlRecordFromDB } from '@/hooks/useControlRecords';

interface ReceptionHistoryFilters {
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useReceptionHistory(filters: ReceptionHistoryFilters) {
  return useQuery({
    queryKey: ['reception_history', filters],
    queryFn: async () => {
      let query = supabase
        .from('control_records')
        .select('*')
        .eq('control_point_code', 'CP_RECEPTION')
        .order('timestamp', { ascending: false })
        .limit(200);

      // Filter by supplier: we need to resolve supplier name from supplier_id
      if (filters.supplierId) {
        // Fetch supplier name first
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('name')
          .eq('id', filters.supplierId)
          .single();

        if (supplier) {
          query = query.eq('supplier', supplier.name);
        }
      }

      if (filters.dateFrom) {
        query = query.gte('timestamp', `${filters.dateFrom}T00:00:00`);
      }

      if (filters.dateTo) {
        query = query.lte('timestamp', `${filters.dateTo}T23:59:59`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as ControlRecordFromDB[];
    },
  });
}
