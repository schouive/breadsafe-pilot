import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductSheetIncoLog {
  id: string;
  product_sheet_id: string;
  user_id: string;
  action: string;
  html_before: string | null;
  html_after: string | null;
  allergens_removed: string[];
  created_at: string;
}

export function useProductSheetIncoLogs(productSheetId: string | undefined) {
  return useQuery({
    queryKey: ['inco-change-logs-ft', productSheetId],
    queryFn: async () => {
      if (!productSheetId) return [];
      const { data, error } = await supabase
        .from('inco_change_logs')
        .select('*')
        .eq('product_sheet_id', productSheetId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductSheetIncoLog[];
    },
    enabled: !!productSheetId,
  });
}
