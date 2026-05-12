import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type BatchStatus = 'draft' | 'ready' | 'printing' | 'completed' | 'partial' | 'failed';
export type ItemStatus = 'pending' | 'printing' | 'printed' | 'failed';

export interface PrintBatch {
  id: string;
  batch_number: string;
  name: string | null;
  status: BatchStatus;
  global_lot: string | null;
  global_ddm: string | null;
  created_by: string;
  printed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrintBatchItem {
  id: string;
  batch_id: string;
  order_index: number;
  product_id: string;
  lot_override: string | null;
  ddm_override: string | null;
  quantity: number;
  status: ItemStatus;
  error_message: string | null;
  printed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePrintBatches() {
  return useQuery({
    queryKey: ['print_batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_batches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as PrintBatch[];
    },
  });
}

export function usePrintBatch(id: string | undefined) {
  return useQuery({
    queryKey: ['print_batch', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_batches')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as PrintBatch;
    },
  });
}

export function usePrintBatchItems(batchId: string | undefined) {
  return useQuery({
    queryKey: ['print_batch_items', batchId],
    enabled: !!batchId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_batch_items')
        .select('*')
        .eq('batch_id', batchId!)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data as PrintBatchItem[];
    },
  });
}

export function useCreatePrintBatch() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name?: string | null; global_lot?: string | null; global_ddm?: string | null }) => {
      if (!user) throw new Error('Non authentifié');
      const { data, error } = await supabase
        .from('print_batches')
        .insert({
          name: payload.name ?? null,
          global_lot: payload.global_lot ?? null,
          global_ddm: payload.global_ddm ?? null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PrintBatch;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print_batches'] });
      toast.success('Ordre créé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePrintBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PrintBatch> & { id: string }) => {
      const { error } = await supabase
        .from('print_batches')
        .update(payload as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['print_batches'] });
      qc.invalidateQueries({ queryKey: ['print_batch', vars.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePrintBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('print_batches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print_batches'] });
      toast.success('Ordre supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddBatchItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<PrintBatchItem, 'id' | 'created_at' | 'updated_at' | 'status' | 'error_message' | 'printed_at'>) => {
      const { data, error } = await supabase
        .from('print_batch_items')
        .insert(payload as any)
        .select()
        .single();
      if (error) throw error;
      return data as PrintBatchItem;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['print_batch_items', vars.batch_id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateBatchItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, batch_id, ...payload }: Partial<PrintBatchItem> & { id: string; batch_id: string }) => {
      const { error } = await supabase
        .from('print_batch_items')
        .update(payload as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['print_batch_items', vars.batch_id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteBatchItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, batch_id: _b }: { id: string; batch_id: string }) => {
      const { error } = await supabase.from('print_batch_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['print_batch_items', vars.batch_id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRecordPrintJob() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (payload: {
      batch_id: string;
      batch_item_id: string;
      zpl_payload?: string | null;
      status: 'pending' | 'success' | 'failed';
      error_message?: string | null;
      print_method?: string | null;
    }) => {
      if (!user) throw new Error('Non authentifié');
      const { error } = await supabase.from('print_jobs').insert({
        ...payload,
        operator_id: user.id,
      });
      if (error) throw error;
    },
  });
}
