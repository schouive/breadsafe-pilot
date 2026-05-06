import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type RDTrial = Tables<'rd_trials'>;
export type RDTrialIngredient = Tables<'rd_trial_ingredients'>;
export type RDTrialRabat = Tables<'rd_trial_rabats'>;
export type RDTrialJournal = Tables<'rd_trial_journal'>;

export const RD_TRIAL_STATUSES = [
  { value: 'preparation', label: 'En préparation', color: 'bg-slate-500/10 text-slate-700 border-slate-500/30' },
  { value: 'in_progress', label: 'En cours', color: 'bg-blue-500/10 text-blue-700 border-blue-500/30' },
  { value: 'completed', label: 'Terminé', color: 'bg-amber-500/10 text-amber-700 border-amber-500/30' },
  { value: 'validated', label: 'Validé', color: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30' },
  { value: 'abandoned', label: 'Abandonné', color: 'bg-red-500/10 text-red-700 border-red-500/30' },
] as const;

export const RD_TRIAL_DECISIONS = [
  { value: 'redo', label: 'À refaire' },
  { value: 'adjust', label: 'À ajuster' },
  { value: 'validated', label: 'Validé' },
] as const;

export function getStatusMeta(status: string) {
  return RD_TRIAL_STATUSES.find((s) => s.value === status) ?? RD_TRIAL_STATUSES[0];
}

// List trials
export function useRDTrials(includeArchived = false) {
  return useQuery({
    queryKey: ['rd_trials', { includeArchived }],
    queryFn: async () => {
      let q = supabase
        .from('rd_trials')
        .select('*, recipes(name, code)')
        .order('trial_date', { ascending: false });
      if (!includeArchived) q = q.eq('is_archived', false);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
}

// Single trial with relations
export function useRDTrial(id: string | undefined) {
  return useQuery({
    queryKey: ['rd_trial', id],
    queryFn: async () => {
      if (!id) return null;
      const [trialRes, ingRes, rabRes, jrnRes] = await Promise.all([
        supabase.from('rd_trials').select('*, recipes(name, code)').eq('id', id).single(),
        supabase.from('rd_trial_ingredients').select('*').eq('trial_id', id).order('order_index'),
        supabase.from('rd_trial_rabats').select('*').eq('trial_id', id).order('order_index'),
        supabase.from('rd_trial_journal').select('*').eq('trial_id', id).order('entry_time', { ascending: false }),
      ]);
      if (trialRes.error) throw trialRes.error;
      return {
        trial: trialRes.data as any,
        ingredients: (ingRes.data ?? []) as RDTrialIngredient[],
        rabats: (rabRes.data ?? []) as RDTrialRabat[],
        journal: (jrnRes.data ?? []) as RDTrialJournal[],
      };
    },
    enabled: !!id,
  });
}

export function useCreateRDTrial() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: Partial<TablesInsert<'rd_trials'>>) => {
      const { data: userRes } = await supabase.auth.getUser();
      const payload: TablesInsert<'rd_trials'> = {
        trial_name: input.trial_name ?? 'Nouvel essai',
        ...input,
        created_by: userRes.user?.id,
      };
      const { data, error } = await supabase.from('rd_trials').insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rd_trials'] });
      toast({ title: 'Essai créé', description: "L'essai a été enregistré." });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateRDTrial() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'rd_trials'> & { id: string }) => {
      const { data, error } = await supabase.from('rd_trials').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['rd_trials'] });
      qc.invalidateQueries({ queryKey: ['rd_trial', vars.id] });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteRDTrial() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('rd_trials').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rd_trials'] });
      toast({ title: 'Essai supprimé' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

export function useDuplicateRDTrial() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { data: src, error: e1 } = await supabase.from('rd_trials').select('*').eq('id', sourceId).single();
      if (e1) throw e1;
      const { data: ings } = await supabase.from('rd_trial_ingredients').select('*').eq('trial_id', sourceId);

      const { id, trial_number, created_at, updated_at, created_by, ...rest } = src as any;
      const { data: userRes } = await supabase.auth.getUser();
      const { data: created, error: e2 } = await supabase
        .from('rd_trials')
        .insert({
          ...rest,
          trial_name: `${rest.trial_name} (copie)`,
          trial_version: (rest.trial_version ?? 1) + 1,
          status: 'preparation',
          is_archived: false,
          created_by: userRes.user?.id,
        })
        .select()
        .single();
      if (e2) throw e2;

      if (ings && ings.length) {
        const rows = ings.map(({ id: _, created_at: __, trial_id: ___, ...r }: any) => ({ ...r, trial_id: created.id }));
        await supabase.from('rd_trial_ingredients').insert(rows);
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rd_trials'] });
      toast({ title: 'Essai dupliqué' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}

// Ingredients
export function useUpsertTrialIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: TablesInsert<'rd_trial_ingredients'> & { id?: string }) => {
      const { data, error } = await supabase.from('rd_trial_ingredients').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['rd_trial', (d as any).trial_id] }),
  });
}
export function useDeleteTrialIngredient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trialId }: { id: string; trialId: string }) => {
      const { error } = await supabase.from('rd_trial_ingredients').delete().eq('id', id);
      if (error) throw error;
      return trialId;
    },
    onSuccess: (trialId) => qc.invalidateQueries({ queryKey: ['rd_trial', trialId] }),
  });
}

// Rabats
export function useUpsertTrialRabat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: TablesInsert<'rd_trial_rabats'> & { id?: string }) => {
      const { data, error } = await supabase.from('rd_trial_rabats').upsert(row).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => qc.invalidateQueries({ queryKey: ['rd_trial', (d as any).trial_id] }),
  });
}
export function useDeleteTrialRabat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trialId }: { id: string; trialId: string }) => {
      const { error } = await supabase.from('rd_trial_rabats').delete().eq('id', id);
      if (error) throw error;
      return trialId;
    },
    onSuccess: (trialId) => qc.invalidateQueries({ queryKey: ['rd_trial', trialId] }),
  });
}

// Journal
export function useAddJournalEntry() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ trialId, comment, authorName }: { trialId: string; comment: string; authorName?: string }) => {
      const { data: userRes } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('rd_trial_journal')
        .insert({ trial_id: trialId, comment, author_id: userRes.user?.id, author_name: authorName })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['rd_trial', (d as any).trial_id] });
      toast({ title: 'Entrée ajoutée' });
    },
    onError: (e: any) => toast({ title: 'Erreur', description: e.message, variant: 'destructive' }),
  });
}
export function useDeleteJournalEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, trialId }: { id: string; trialId: string }) => {
      const { error } = await supabase.from('rd_trial_journal').delete().eq('id', id);
      if (error) throw error;
      return trialId;
    },
    onSuccess: (trialId) => qc.invalidateQueries({ queryKey: ['rd_trial', trialId] }),
  });
}
