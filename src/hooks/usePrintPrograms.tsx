import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PrintProgram {
  id: string;
  name: string;
  customer_code: string | null;
  customer_name: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PrintProgramItem {
  id: string;
  program_id: string;
  packaging_id: string;
  print_order: number;
  default_quantity: number;
  created_at: string;
  updated_at: string;
}

export function usePrintPrograms() {
  return useQuery({
    queryKey: ['print_programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_programs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PrintProgram[];
    },
  });
}

export function usePrintProgram(id: string | undefined) {
  return useQuery({
    queryKey: ['print_program', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_programs').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as PrintProgram;
    },
  });
}

export function usePrintProgramItems(programId: string | undefined) {
  return useQuery({
    queryKey: ['print_program_items', programId],
    enabled: !!programId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_program_items')
        .select('*')
        .eq('program_id', programId!)
        .order('print_order', { ascending: true });
      if (error) throw error;
      return data as PrintProgramItem[];
    },
  });
}

export function useProgramItemCounts() {
  return useQuery({
    queryKey: ['print_program_item_counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('print_program_items')
        .select('program_id');
      if (error) throw error;
      const map: Record<string, number> = {};
      for (const r of (data ?? []) as { program_id: string }[]) {
        map[r.program_id] = (map[r.program_id] ?? 0) + 1;
      }
      return map;
    },
  });
}

export function useCreatePrintProgram() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; customer_code?: string | null; customer_name?: string | null }) => {
      if (!user) throw new Error('Non authentifié');
      const { data, error } = await supabase
        .from('print_programs')
        .insert({
          name: payload.name,
          customer_code: payload.customer_code ?? null,
          customer_name: payload.customer_name ?? null,
          created_by: user.id,
        })
        .select().single();
      if (error) throw error;
      return data as PrintProgram;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['print_programs'] }),
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePrintProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<PrintProgram> & { id: string }) => {
      const { error } = await supabase.from('print_programs').update(payload as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['print_programs'] });
      qc.invalidateQueries({ queryKey: ['print_program', vars.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePrintProgram() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('print_programs').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print_programs'] });
      qc.invalidateQueries({ queryKey: ['print_program_item_counts'] });
      toast.success('Programme supprimé');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDuplicatePrintProgram() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('Non authentifié');
      const { data: src, error: e1 } = await supabase
        .from('print_programs').select('*').eq('id', id).single();
      if (e1) throw e1;
      const { data: items, error: e2 } = await supabase
        .from('print_program_items').select('*').eq('program_id', id);
      if (e2) throw e2;

      const { data: copy, error: e3 } = await supabase
        .from('print_programs')
        .insert({
          name: `${src.name} (copie)`,
          customer_code: src.customer_code,
          customer_name: src.customer_name,
          active: src.active,
          created_by: user.id,
        }).select().single();
      if (e3) throw e3;

      if (items && items.length) {
        const { error: e4 } = await supabase.from('print_program_items').insert(
          items.map((it: any) => ({
            program_id: copy.id,
            erp_article_id: it.erp_article_id,
            print_order: it.print_order,
            default_quantity: it.default_quantity,
          })),
        );
        if (e4) throw e4;
      }
      return copy as PrintProgram;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['print_programs'] });
      qc.invalidateQueries({ queryKey: ['print_program_item_counts'] });
      toast.success('Programme dupliqué');
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useReplaceProgramItems() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ programId, items }: {
      programId: string;
      items: { erp_article_id: string; print_order: number; default_quantity: number }[];
    }) => {
      const { error: delErr } = await supabase.from('print_program_items').delete().eq('program_id', programId);
      if (delErr) throw delErr;
      if (items.length) {
        const { error: insErr } = await supabase.from('print_program_items').insert(
          items.map(it => ({ ...it, program_id: programId })),
        );
        if (insErr) throw insErr;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['print_program_items', vars.programId] });
      qc.invalidateQueries({ queryKey: ['print_program_item_counts'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
