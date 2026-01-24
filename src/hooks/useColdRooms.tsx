import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addPendingRecord, cacheData, getCachedData } from '@/lib/offlineDb';

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
      try {
        const { data, error } = await supabase
          .from('cold_rooms')
          .select('*')
          .eq('is_active', true)
          .order('name');
        
        if (error) throw error;
        
        // Cache for offline
        await cacheData('cold_rooms_active', data);
        
        return data as ColdRoom[];
      } catch (error) {
        const cached = await getCachedData<ColdRoom[]>('cold_rooms_active');
        if (cached) return cached;
        throw error;
      }
    },
  });
}

export function useAllColdRooms() {
  return useQuery({
    queryKey: ['cold_rooms_all'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('cold_rooms')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        await cacheData('cold_rooms_all', data);
        
        return data as ColdRoom[];
      } catch (error) {
        const cached = await getCachedData<ColdRoom[]>('cold_rooms_all');
        if (cached) return cached;
        throw error;
      }
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
      const cacheKey = `storage_records_${coldRoomId || 'all'}_${limit || 'all'}`;
      
      try {
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
        
        await cacheData(cacheKey, data);
        
        return data as StorageTemperatureRecord[];
      } catch (error) {
        const cached = await getCachedData<StorageTemperatureRecord[]>(cacheKey);
        if (cached) return cached;
        throw error;
      }
    },
  });
}

export function useStorageTemperatureRecordsWithRooms(limit?: number) {
  return useQuery({
    queryKey: ['storage_temperature_records_with_rooms', limit],
    queryFn: async () => {
      const cacheKey = `storage_records_with_rooms_${limit || 'all'}`;
      
      try {
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
        
        await cacheData(cacheKey, data);
        
        return data as StorageTemperatureRecordWithRoom[];
      } catch (error) {
        const cached = await getCachedData<StorageTemperatureRecordWithRoom[]>(cacheKey);
        if (cached) return cached;
        throw error;
      }
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
      if (!navigator.onLine) {
        await addPendingRecord('storage_temperature_records', 'insert', {
          ...data,
          id: `offline_${Date.now()}`,
          recorded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        return null;
      }

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
      toast.success(navigator.onLine ? 'Température enregistrée' : 'Température sauvegardée (hors ligne)');
    },
    onError: async (error, variables) => {
      console.error('Error recording temperature:', error);
      try {
        await addPendingRecord('storage_temperature_records', 'insert', {
          ...variables,
          id: `offline_${Date.now()}`,
          recorded_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        toast.warning('Température sauvegardée localement');
      } catch {
        toast.error('Erreur lors de l\'enregistrement: ' + error.message);
      }
    },
  });
}

export function useUpdateStorageTemperatureRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { 
      id: string; 
      data: { 
        temperature?: number; 
        is_conforme?: boolean;
        status?: 'conforme' | 'acceptable' | 'nonconforme';
        notes?: string | null;
        cold_room_id?: string;
      } 
    }) => {
      if (!navigator.onLine) {
        await addPendingRecord('storage_temperature_records', 'update', { id, ...data });
        return null;
      }

      const { data: result, error } = await supabase
        .from('storage_temperature_records')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_temperature_records'] });
      queryClient.invalidateQueries({ queryKey: ['storage_temperature_records_with_rooms'] });
      toast.success(navigator.onLine ? 'Relevé de température modifié' : 'Modification sauvegardée (hors ligne)');
    },
    onError: async (error, variables) => {
      console.error('Error updating temperature:', error);
      try {
        await addPendingRecord('storage_temperature_records', 'update', { id: variables.id, ...variables.data });
        toast.warning('Modification sauvegardée localement');
      } catch {
        toast.error('Erreur lors de la modification: ' + error.message);
      }
    },
  });
}

export function useDeleteStorageTemperatureRecord() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        await addPendingRecord('storage_temperature_records', 'delete', { id });
        return;
      }

      const { error } = await supabase
        .from('storage_temperature_records')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_temperature_records'] });
      queryClient.invalidateQueries({ queryKey: ['storage_temperature_records_with_rooms'] });
      toast.success('Relevé de température supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression: ' + error.message);
    },
  });
}
