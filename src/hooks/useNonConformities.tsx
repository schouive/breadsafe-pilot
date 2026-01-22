import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type NCStatus = Database['public']['Enums']['nc_status'];
type NCSeverity = Database['public']['Enums']['nc_severity'];

export interface ControlRecordDetails {
  id: string;
  timestamp: string;
  temperature: number | null;
  temperature_conforme: boolean | null;
  product: string | null;
  supplier: string | null;
  lot_number: string | null;
  notes: string | null;
  status: string;
  integrite_conforme: boolean | null;
  integrite_notes: string | null;
  dlc_date: string | null;
  dlc_conforme: boolean | null;
  dlc_notes: string | null;
  allergenes_conformes: boolean | null;
  allergenes_notes: string | null;
  corps_etranger_detecte: boolean | null;
  raw_material_id: string | null;
}

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
  preventive_action: string | null;
  corrective_action_date: string | null;
  validated_by: string | null;
  validated_at: string | null;
  photos: string[] | null;
  updated_at: string;
  control_record?: ControlRecordDetails;
}

export function useNonConformities(statusFilter?: NCStatus | 'all') {
  return useQuery({
    queryKey: ['non_conformities', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('non_conformities')
        .select(`
          *,
          control_record:control_records(
            id,
            timestamp,
            temperature,
            temperature_conforme,
            product,
            supplier,
            lot_number,
            notes,
            status,
            integrite_conforme,
            integrite_notes,
            dlc_date,
            dlc_conforme,
            dlc_notes,
            allergenes_conformes,
            allergenes_notes,
            corps_etranger_detecte,
            raw_material_id
          )
        `)
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
        .select(`
          *,
          control_record:control_records(
            id,
            timestamp,
            temperature,
            temperature_conforme,
            product,
            supplier,
            lot_number,
            notes,
            status,
            integrite_conforme,
            integrite_notes,
            dlc_date,
            dlc_conforme,
            dlc_notes,
            allergenes_conformes,
            allergenes_notes,
            corps_etranger_detecte,
            raw_material_id
          )
        `)
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
      preventive_action?: string;
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
