import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ColdRoom {
  id: string;
  name: string;
  type: string;
  temp_min: number;
  temp_max: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StorageTemperatureRecord {
  id: string;
  cold_room_id: string;
  operator_id: string;
  temperature: number;
  is_conforme: boolean;
  status: 'conforme' | 'acceptable' | 'nonconforme';
  notes: string | null;
  recorded_at: string;
  created_at: string;
}

export function useColdRooms() {
  return useQuery({
    queryKey: ['cold_rooms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cold_rooms')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as ColdRoom[];
    },
  });
}

export function useAllColdRooms() {
  return useQuery({
    queryKey: ['cold_rooms_all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cold_rooms')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as ColdRoom[];
    },
  });
}

export interface StorageTemperatureRecordWithRoom extends StorageTemperatureRecord {
  cold_rooms: ColdRoom | null;
}

export function useStorageTemperatureRecords(coldRoomId?: string, limit?: number) {
  return useQuery({
    queryKey: ['storage_temperature_records', coldRoomId, limit],
    queryFn: async () => {
      let query = supabase
        .from('storage_temperature_records')
        .select('*')
        .order('recorded_at', { ascending: false });
      
      if (coldRoomId) {
        query = query.eq('cold_room_id', coldRoomId);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as StorageTemperatureRecord[];
    },
  });
}

export function useStorageTemperatureRecordsWithRooms(limit?: number) {
  return useQuery({
    queryKey: ['storage_temperature_records_with_rooms', limit],
    queryFn: async () => {
      let query = supabase
        .from('storage_temperature_records')
        .select(`
          *,
          cold_rooms (*)
        `)
        .order('recorded_at', { ascending: false });
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as StorageTemperatureRecordWithRoom[];
    },
  });
}

export function useCreateColdRoom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { name: string; type: string; temp_min: number; temp_max: number }) => {
      const { data: result, error } = await supabase
        .from('cold_rooms')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cold_rooms'] });
      queryClient.invalidateQueries({ queryKey: ['cold_rooms_all'] });
      toast.success('Chambre froide ajoutée');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'ajout: ' + error.message);
    },
  });
}

export function useUpdateColdRoom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; type?: string; temp_min?: number; temp_max?: number; is_active?: boolean }) => {
      const { data: result, error } = await supabase
        .from('cold_rooms')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cold_rooms'] });
      queryClient.invalidateQueries({ queryKey: ['cold_rooms_all'] });
      toast.success('Chambre froide mise à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour: ' + error.message);
    },
  });
}

export function useDeleteColdRoom() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('cold_rooms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cold_rooms'] });
      queryClient.invalidateQueries({ queryKey: ['cold_rooms_all'] });
      toast.success('Chambre froide supprimée');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression: ' + error.message);
    },
  });
}

export function useRecordTemperature() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { 
      cold_room_id: string; 
      operator_id: string; 
      temperature: number; 
      is_conforme: boolean;
      status: 'conforme' | 'acceptable' | 'nonconforme';
      notes?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('storage_temperature_records')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_temperature_records'] });
      queryClient.invalidateQueries({ queryKey: ['storage_temperature_records_with_rooms'] });
      toast.success('Température enregistrée');
    },
    onError: (error) => {
      toast.error('Erreur lors de l\'enregistrement: ' + error.message);
    },
  });
}
