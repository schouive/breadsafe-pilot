import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductionBatch {
  id: string;
  plan_id: string;
  batch_number: number;
  chariots: number | null;
  dough_temperature: number | null;
  kneading_start: string | null;
  kneading_end: string | null;
  shaping_start: string | null;
  line_start: string | null;
  proofing_start: string | null;
  proofing_end: string | null;
  oven_in: string | null;
  oven_out: string | null;
  production_end: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
}

const client = supabase as any;

export function useProductionBatches(planId: string | undefined) {
  return useQuery({
    queryKey: ['production_batches', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await client
        .from('production_batches')
        .select('*')
        .eq('plan_id', planId)
        .order('batch_number', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ProductionBatch[];
    },
  });
}

export function useAllProductionBatches() {
  return useQuery({
    queryKey: ['production_batches', 'all'],
    queryFn: async () => {
      const { data, error } = await client
        .from('production_batches')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductionBatch[];
    },
  });
}

export function useCreateProductionBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planId, chariots }: { planId: string; chariots?: number | null }) => {
      const { data: existing } = await client
        .from('production_batches')
        .select('batch_number')
        .eq('plan_id', planId)
        .order('batch_number', { ascending: false })
        .limit(1);
      const next = ((existing?.[0]?.batch_number as number | undefined) ?? 0) + 1;
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await client
        .from('production_batches')
        .insert({
          plan_id: planId,
          batch_number: next,
          chariots: chariots ?? null,
          kneading_start: new Date().toISOString(),
          created_by: userData.user?.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as ProductionBatch;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['production_batches', data.plan_id] });
      qc.invalidateQueries({ queryKey: ['production_batches', 'all'] });
      toast.success(`Pétrin ${data.batch_number} créé`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProductionBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ProductionBatch> & { id: string }) => {
      const { data, error } = await client
        .from('production_batches')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionBatch;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['production_batches', data.plan_id] });
      qc.invalidateQueries({ queryKey: ['production_batches', 'all'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProductionBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) => {
      const { error } = await client.from('production_batches').delete().eq('id', id);
      if (error) throw error;
      return { planId };
    },
    onSuccess: ({ planId }) => {
      qc.invalidateQueries({ queryKey: ['production_batches', planId] });
      qc.invalidateQueries({ queryKey: ['production_batches', 'all'] });
      toast.success('Pétrin supprimé');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
