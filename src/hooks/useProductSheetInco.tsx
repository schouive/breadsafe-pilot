import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Update INCO HTML content (manual edit - only for drafts)
export function useUpdateProductSheetIncoHtml() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, html }: { id: string; html: string }) => {
      const { data: sheet, error: sheetError } = await supabase
        .from('product_sheets')
        .select('inco_status, inco_html, inco_html_original')
        .eq('id', id)
        .single();

      if (sheetError) throw sheetError;
      if ((sheet as any).inco_status !== 'draft') throw new Error('Seuls les brouillons INCO peuvent être modifiés');

      const updates: Record<string, unknown> = { inco_html: html };
      if (!(sheet as any).inco_html_original) {
        updates.inco_html_original = (sheet as any).inco_html;
      }

      const { data, error } = await supabase
        .from('product_sheets')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-sheets'] });
      toast({ title: 'Liste INCO modifiée', description: 'Les modifications ont été enregistrées.' });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// Validate INCO on product sheet
export function useValidateProductSheetInco() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilisateur non connecté');

      const { data: sheet, error: sheetError } = await supabase
        .from('product_sheets')
        .select('inco_version, inco_status')
        .eq('id', id)
        .single();

      if (sheetError) throw sheetError;
      if ((sheet as any).inco_status !== 'draft') throw new Error('Seul un brouillon INCO peut être validé');


      const { data, error } = await supabase
        .from('product_sheets')
        .update({
          inco_status: 'validated',
          inco_validated_at: new Date().toISOString(),
          inco_validated_by: user.id,
          inco_validation_comment: comment || null,
          inco_version: ((sheet as any).inco_version || 0) + 1,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-sheets'] });
      toast({ title: 'INCO validée', description: 'La liste INCO est maintenant verrouillée.' });
    },
    onError: (error) => {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    },
  });
}

// Log INCO change for product sheet
export function useLogProductSheetIncoChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (log: {
      product_sheet_id: string;
      action: string;
      html_before?: string | null;
      html_after?: string | null;
      allergens_removed?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non connecté');

      const { error } = await supabase
        .from('inco_change_logs')
        .insert({
          product_sheet_id: log.product_sheet_id,
          user_id: user.id,
          action: log.action,
          html_before: log.html_before || null,
          html_after: log.html_after || null,
          allergens_removed: log.allergens_removed || [],
        } as any);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inco-change-logs-ft', variables.product_sheet_id] });
    },
  });
}
