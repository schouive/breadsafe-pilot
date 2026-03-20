import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ControlStatus } from '@/types/haccp';
import { Database } from '@/integrations/supabase/types';
import { addPendingRecord, cacheData, getCachedData } from '@/lib/offlineDb';

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
  corps_etranger_detecte: boolean | null;
  created_at: string;
  order_id: string | null;
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
  linkedOrderId?: string | null;
  linkedOrderLines?: { raw_material_id: string; quantity_ordered: number; unit: string; order_line_id: string }[];
}

export function useControlRecords(limit: number = 20) {
  return useQuery({
    queryKey: ['control_records', limit],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('control_records')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limit);
        
        if (error) throw error;
        
        // Cache the data for offline use
        await cacheData(`control_records_${limit}`, data);
        
        return data as ControlRecordFromDB[];
      } catch (error) {
        // Try to get cached data if offline
        const cached = await getCachedData<ControlRecordFromDB[]>(`control_records_${limit}`);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },
  });
}

export function useRecentControlRecords() {
  return useQuery({
    queryKey: ['control_records', 'recent'],
    queryFn: async () => {
      try {
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
        
        // Cache the data
        await cacheData('control_records_recent', data);
        
        return data;
      } catch (error) {
        const cached = await getCachedData<Array<{
          id: string;
          control_point_code: string;
          timestamp: string;
          operator_id: string;
          status: string;
          temperature: number | null;
          notes: string | null;
          supplier: string | null;
          product: string | null;
        }>>('control_records_recent');
        if (cached) {
          return cached;
        }
        throw error;
      }
    },
    refetchInterval: 5000,
  });
}

export function useControlRecordsByCode(code: string) {
  return useQuery({
    queryKey: ['control_records', 'by_code', code],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('control_records')
          .select('*')
          .eq('control_point_code', code as ControlPointCode)
          .order('timestamp', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        
        // Cache the data
        await cacheData(`control_records_code_${code}`, data);
        
        return data as ControlRecordFromDB[];
      } catch (error) {
        const cached = await getCachedData<ControlRecordFromDB[]>(`control_records_code_${code}`);
        if (cached) {
          return cached;
        }
        throw error;
      }
    },
    enabled: !!code,
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
      lot_number?: string;
      supplier?: string;
      product?: string;
      dlc_date?: string;
      corps_etranger_detecte?: boolean;
    }) => {
      if (!navigator.onLine) {
        // Queue for later sync
        await addPendingRecord('control_records', 'insert', {
          ...data,
          id: `offline_${Date.now()}`,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        return;
      }

      const { error } = await supabase
        .from('control_records')
        .insert(data);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_records'] });
      toast.success(navigator.onLine ? 'Contrôle enregistré' : 'Contrôle sauvegardé (hors ligne)');
    },
    onError: async (error, variables) => {
      console.error('Error saving control:', error);
      // Try to queue offline
      try {
        await addPendingRecord('control_records', 'insert', {
          ...variables,
          id: `offline_${Date.now()}`,
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
        toast.warning('Contrôle sauvegardé localement, synchronisation en attente');
      } catch {
        toast.error('Erreur lors de l\'enregistrement');
      }
    },
  });
}

export function useCreateReceptionControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: ReceptionFormData }) => {
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
        order_id: data.linkedOrderId || null,
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
        order_id: data.linkedOrderId || null,
      }];

      if (!navigator.onLine) {
        // Queue each record for offline sync
        for (const record of records) {
          await addPendingRecord('control_records', 'insert', {
            ...record,
            id: `offline_${Date.now()}_${Math.random()}`,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        }
        return null;
      }

      const { error, data: insertedRecords } = await supabase
        .from('control_records')
        .insert(records)
        .select('id');
      
      if (error) throw error;

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

      // If linked to a supplier order, create supplier_receptions + lines to trigger status update
      if (data.linkedOrderId && data.supplierId && data.linkedOrderLines?.length) {
        const { data: reception, error: receptionError } = await supabase
          .from('supplier_receptions')
          .insert({
            supplier_id: data.supplierId,
            order_id: data.linkedOrderId,
            delivery_note_number: `CP-${new Date().toISOString().slice(0, 10)}`,
            operator_id: userId,
            notes: 'Réception via contrôle HACCP CP_RECEPTION',
          })
          .select('id')
          .single();

        if (!receptionError && reception) {
          const receptionLines = data.linkedOrderLines.map((ol) => ({
            reception_id: reception.id,
            raw_material_id: ol.raw_material_id,
            quantity_received: ol.quantity_ordered,
            unit: ol.unit,
            order_line_id: ol.order_line_id,
          }));

          await supabase
            .from('supplier_reception_lines')
            .insert(receptionLines);
        }
      }

      return insertedRecords;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_records'] });
      queryClient.invalidateQueries({ queryKey: ['supplier_orders'] });
      queryClient.invalidateQueries({ queryKey: ['received_quantities'] });
      toast.success(navigator.onLine ? 'Contrôle réception enregistré' : 'Contrôle sauvegardé (hors ligne)');
    },
    onError: async (error, variables) => {
      console.error('Error saving reception control:', error);
      try {
        const { userId, data } = variables;
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

        for (const record of records) {
          await addPendingRecord('control_records', 'insert', {
            ...record,
            id: `offline_${Date.now()}_${Math.random()}`,
            timestamp: new Date().toISOString(),
            created_at: new Date().toISOString(),
          });
        }
        toast.warning('Contrôle sauvegardé localement, synchronisation en attente');
      } catch {
        toast.error('Erreur lors de l\'enregistrement');
      }
    },
  });
}

export function useDeleteControlRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordId: string) => {
      if (!navigator.onLine) {
        await addPendingRecord('control_records', 'delete', { id: recordId });
        return;
      }

      await supabase
        .from('non_conformities')
        .delete()
        .eq('control_record_id', recordId);

      const { error } = await supabase
        .from('control_records')
        .delete()
        .eq('id', recordId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_records'] });
      toast.success('Contrôle supprimé');
    },
    onError: (error) => {
      console.error('Error deleting control:', error);
      toast.error('Erreur lors de la suppression');
    },
  });
}

export function useUpdateControlRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      recordId, 
      data 
    }: { 
      recordId: string; 
      data: Partial<{
        status: ControlStatus;
        temperature: number | null;
        notes: string | null;
        lot_number: string | null;
        supplier: string | null;
        product: string | null;
        temperature_conforme: boolean | null;
        integrite_conforme: boolean | null;
        integrite_notes: string | null;
        dlc_date: string | null;
        dlc_conforme: boolean | null;
        dlc_notes: string | null;
        allergenes_conformes: boolean | null;
        allergenes_notes: string | null;
        corps_etranger_detecte: boolean | null;
        order_id: string | null;
      }>;
    }) => {
      if (!navigator.onLine) {
        await addPendingRecord('control_records', 'update', { id: recordId, ...data });
        return;
      }

      const { error } = await supabase
        .from('control_records')
        .update(data)
        .eq('id', recordId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['control_records'] });
      queryClient.invalidateQueries({ queryKey: ['storage_temperature_records'] });
      toast.success(navigator.onLine ? 'Contrôle mis à jour' : 'Modification sauvegardée (hors ligne)');
    },
    onError: async (error, variables) => {
      console.error('Error updating control:', error);
      try {
        await addPendingRecord('control_records', 'update', { id: variables.recordId, ...variables.data });
        toast.warning('Modification sauvegardée localement');
      } catch {
        toast.error('Erreur lors de la mise à jour');
      }
    },
  });
}
