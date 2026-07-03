import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ProductionPriority = 'low' | 'normal' | 'high' | 'urgent';
export type ProductionStatus = 'pending' | 'in_progress' | 'completed';

export interface ProductionPlan {
  id: string;
  production_date: string;
  recipe_id: string | null;
  recipe_name: string;
  chariots: number;
  quantity_total: number | null;
  scheduled_time: string;
  priority: ProductionPriority;
  manager_name: string | null;
  operator_name: string | null;
  observations: string | null;
  status: ProductionStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

const client = supabase as any;

export function useProductionPlans(date?: string) {
  return useQuery({
    queryKey: ['production_plans', date ?? 'all'],
    queryFn: async () => {
      let q = client.from('production_plans').select('*').order('scheduled_time', { ascending: true });
      if (date) q = q.eq('production_date', date);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ProductionPlan[];
    },
  });
}

export function useCreateProductionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ProductionPlan>) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await client
        .from('production_plans')
        .insert({ ...payload, created_by: userData.user?.id })
        .select()
        .single();
      if (error) throw error;
      return data as ProductionPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production_plans'] });
      toast.success('Production créée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateProductionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<ProductionPlan> & { id: string }) => {
      const { data, error } = await client
        .from('production_plans')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as ProductionPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production_plans'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteProductionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await client.from('production_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production_plans'] });
      toast.success('Production supprimée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useLaunchProductionPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: ProductionPlan) => {
      const now = new Date().toISOString();
      // Update plan status
      const { error: upErr } = await client
        .from('production_plans')
        .update({ status: 'in_progress', started_at: now })
        .eq('id', plan.id);
      if (upErr) throw upErr;

      // Create journal if missing
      const { data: existing } = await client
        .from('production_journals')
        .select('id')
        .eq('plan_id', plan.id)
        .maybeSingle();

      if (!existing) {
        const { data: userData } = await supabase.auth.getUser();
        const { error: insErr } = await client.from('production_journals').insert({
          plan_id: plan.id,
          recipe_id: plan.recipe_id,
          recipe_name: plan.recipe_name,
          chariots: plan.chariots,
          manager_name: plan.manager_name,
          operator_name: plan.operator_name,
          created_by: userData.user?.id,
        });
        if (insErr) throw insErr;
      }
      return plan.id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['production_plans'] });
      qc.invalidateQueries({ queryKey: ['production_journals'] });
      toast.success('Production lancée');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
