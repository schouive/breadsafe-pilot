import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ControlStatus } from '@/types/haccp';
import { Database } from '@/integrations/supabase/types';

type ControlPointCode = Database['public']['Enums']['control_point_code'];

export interface ControlRecordFromDB {
  id: string;
  control_point_code: ControlPointCode;
  timestamp: string;
  operator_id: string;
  status: ControlStatus;
  temperature: number | null;
  notes: string | null;
  lot_number: string | null;
  supplier: string | null;
  product: string | null;
  photos: string[] | null;
  temperature_conforme: boolean | null;
  integrite_conforme: boolean | null;
  integrite_notes: string | null;
  dlc_date: string | null;
  dlc_conforme: boolean | null;
  dlc_notes: string | null;
  allergenes_conformes: boolean | null;
  allergenes_notes: string | null;
  raw_material_id: string | null;
  created_at: string;
}

export interface ReceptionFormData {
  status: ControlStatus;
  rawMaterialIds?: string[];
  products: string[];
  supplierId?: string;
  supplier: string;
  temperature?: number;
  temperatureConforme: boolean;
  integriteConforme: boolean;
  integriteNotes?: string;
  dlcDate?: string;
  dlcConforme: boolean;
  dlcNotes?: string;
  allergenesConformes: boolean;
  allergenesNotes?: string;
  notes?: string;
  photos: string[];
}

export function useControlRecords(limit: number = 20) {
  return useQuery({
    queryKey: ['control_records', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_records')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as ControlRecordFromDB[];
    },
  });
}

export function useRecentControlRecords() {
  return useQuery({
    queryKey: ['control_records', 'recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('control_records')
        .select(`
          id,
          control_point_code,
          timestamp,
          operator_id,
          status,
          temperature,
          notes,
          supplier,
          product
        `)
        .order('timestamp', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });
}

export function useCreateControlRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      control_point_code: ControlPointCode;
      operator_id: string;
      status: ControlStatus;
      temperature?: number;
      notes?: string;
      corps_etranger_detecte?: boolean;
    }) => {
      const { error } = await supabase
        .from('control_records')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_records'] });
      toast.success('Contrôle enregistré');
    },
    onError: (error) => {
      console.error('Error saving control:', error);
      toast.error('Erreur lors de l\'enregistrement');
    },
  });
}

export function useCreateReceptionControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: ReceptionFormData }) => {
      // Create one record per raw material
      const records = data.rawMaterialIds?.map((rawMaterialId, index) => ({
        control_point_code: 'CP_RECEPTION' as ControlPointCode,
        operator_id: userId,
        status: data.status,
        temperature: data.temperature,
        temperature_conforme: data.temperatureConforme,
        integrite_conforme: data.integriteConforme,
        integrite_notes: data.integriteNotes,
        dlc_date: data.dlcDate,
        dlc_conforme: data.dlcConforme,
        dlc_notes: data.dlcNotes,
        allergenes_conformes: data.allergenesConformes,
        allergenes_notes: data.allergenesNotes,
        notes: data.notes,
        supplier: data.supplier,
        product: data.products[index] || data.products.join(', '),
        photos: data.photos,
        raw_material_id: rawMaterialId,
      })) || [{
        control_point_code: 'CP_RECEPTION' as ControlPointCode,
        operator_id: userId,
        status: data.status,
        temperature: data.temperature,
        temperature_conforme: data.temperatureConforme,
        integrite_conforme: data.integriteConforme,
        integrite_notes: data.integriteNotes,
        dlc_date: data.dlcDate,
        dlc_conforme: data.dlcConforme,
        dlc_notes: data.dlcNotes,
        allergenes_conformes: data.allergenesConformes,
        allergenes_notes: data.allergenesNotes,
        notes: data.notes,
        supplier: data.supplier,
        product: data.products.join(', '),
        photos: data.photos,
      }];

      const { error, data: insertedRecords } = await supabase
        .from('control_records')
        .insert(records)
        .select('id');
      
      if (error) throw error;

      // If non-conformity, create NC record for first record
      if (data.status === 'nonconforme' && insertedRecords?.[0]) {
        await supabase
          .from('non_conformities')
          .insert({
            control_record_id: insertedRecords[0].id,
            control_point_code: 'CP_RECEPTION',
            description: `Non-conformité détectée: ${data.products.join(', ')} - ${data.supplier}`,
            severity: 'major',
            photos: data.photos,
          });
      }

      return insertedRecords;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_records'] });
      toast.success('Contrôle réception enregistré');
    },
    onError: (error) => {
      console.error('Error saving reception control:', error);
      toast.error('Erreur lors de l\'enregistrement');
    },
  });
}
