import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductionJournal {
  id: string;
  plan_id: string;
  recipe_id: string | null;
  recipe_name: string;
  chariots: number | null;
  manager_name: string | null;
  operator_name: string | null;
  kneading_start: string | null;
  kneading_end: string | null;
  dough_temperature: number | null;
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

export function useProductionJournalByPlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['production_journals', 'plan', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await client
        .from('production_journals')
        .select('*')
        .eq('plan_id', planId)
        .maybeSingle();
      if (error) throw error;
      return data as ProductionJournal | null;
    },
  });
}

export function useProductionJournals() {
  return useQuery({
    queryKey: ['production_journals', 'all'],
    queryFn: async () => {
      const { data, error } = await client
        .from('production_journals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProductionJournal[];
    },
  });
}

export function useUpdateProductionJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ProductionJournal> & { id: string }) => {
      const { data, error } = await client
        .from('production_journals')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionJournal;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['production_journals'] });
      qc.invalidateQueries({ queryKey: ['production_journals', 'plan', data.plan_id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
