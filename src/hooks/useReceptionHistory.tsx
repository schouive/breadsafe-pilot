import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ControlRecordFromDB } from '@/hooks/useControlRecords';
import { toast } from 'sonner';

interface ReceptionHistoryFilters {
  supplierId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ReceptionRecordWithOrder extends ControlRecordFromDB {
  order_number?: string | null;
}

export function useReceptionHistory(filters: ReceptionHistoryFilters) {
  return useQuery({
    queryKey: ['reception_history', filters],
    queryFn: async () => {
      let query = supabase
        .from('control_records')
        .select('*, supplier_orders!control_records_order_id_fkey(order_number)')
        .eq('control_point_code', 'CP_RECEPTION')
        .order('timestamp', { ascending: false })
        .limit(200);

      // Filter by supplier: we need to resolve supplier name from supplier_id
      if (filters.supplierId) {
        const { data: supplier } = await supabase
          .from('suppliers')
          .select('name')
          .eq('id', filters.supplierId)
          .maybeSingle();

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

      return (data || []).map((r: any) => ({
        ...r,
        order_number: r.supplier_orders?.order_number || null,
      })) as ReceptionRecordWithOrder[];
    },
  });
}

export function useLinkOrderToReception() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ recordId, orderId }: { recordId: string; orderId: string }) => {
      const { error } = await supabase
        .from('control_records')
        .update({ order_id: orderId } as any)
        .eq('id', recordId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reception_history'] });
      toast.success('Commande associée avec succès');
    },
    onError: () => {
      toast.error("Erreur lors de l'association de la commande");
    },
  });
}
