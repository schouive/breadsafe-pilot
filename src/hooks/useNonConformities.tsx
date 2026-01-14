import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type NCStatus = Database['public']['Enums']['nc_status'];
type NCSeverity = Database['public']['Enums']['nc_severity'];

export interface NonConformityFromDB {
  id: string;
  control_record_id: string;
  control_point_code: string;
  created_at: string;
  description: string;
  severity: NCSeverity;
  status: NCStatus;
  assigned_to: string | null;
  corrective_action: string | null;
  corrective_action_date: string | null;
  validated_by: string | null;
  validated_at: string | null;
  photos: string[] | null;
  updated_at: string;
}

export function useNonConformities(statusFilter?: NCStatus | 'all') {
  return useQuery({
    queryKey: ['non_conformities', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('non_conformities')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as NonConformityFromDB[];
    },
  });
}

export function useOpenNonConformities() {
  return useQuery({
    queryKey: ['non_conformities', 'open_and_in_progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('non_conformities')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as NonConformityFromDB[];
    },
  });
}

export function useUpdateNonConformity() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      ...data 
    }: { 
      id: string; 
      status?: NCStatus;
      corrective_action?: string;
      corrective_action_date?: string;
      assigned_to?: string;
      validated_by?: string;
      validated_at?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('non_conformities')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['non_conformities'] });
      toast.success('Non-conformité mise à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour: ' + error.message);
    },
  });
}
