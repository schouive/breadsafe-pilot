import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface IncoChangeLog {
  id: string;
  carton_label_id: string;
  user_id: string;
  action: string;
  html_before: string | null;
  html_after: string | null;
  allergens_removed: string[];
  created_at: string;
}

export function useIncoChangeLogs(cartonLabelId: string | undefined) {
  return useQuery({
    queryKey: ['inco-change-logs', cartonLabelId],
    queryFn: async () => {
      if (!cartonLabelId) return [];
      const { data, error } = await supabase
        .from('inco_change_logs')
        .select('*')
        .eq('carton_label_id', cartonLabelId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as IncoChangeLog[];
    },
    enabled: !!cartonLabelId,
  });
}

export function useLogIncoChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: {
      carton_label_id: string;
      action: string;
      html_before?: string | null;
      html_after?: string | null;
      allergens_removed?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { error } = await supabase
        .from('inco_change_logs')
        .insert({
          carton_label_id: log.carton_label_id,
          user_id: user.id,
          action: log.action,
          html_before: log.html_before || null,
          html_after: log.html_after || null,
          allergens_removed: log.allergens_removed || [],
        } as any);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inco-change-logs', variables.carton_label_id] });
    },
  });
}
