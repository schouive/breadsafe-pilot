import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface NCAuditLog {
  id: string;
  non_conformity_id: string;
  user_id: string;
  action: string;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  user_name?: string;
}

export function useNCAuditLogs(nonConformityId: string | undefined) {
  return useQuery({
    queryKey: ['nc_audit_logs', nonConformityId],
    queryFn: async () => {
      if (!nonConformityId) return [];
      
      // Fetch audit logs
      const { data: logs, error } = await supabase
        .from('nc_audit_logs')
        .select('*')
        .eq('non_conformity_id', nonConformityId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (!logs || logs.length === 0) return [];

      // Get unique user IDs
      const userIds = [...new Set(logs.map(log => log.user_id))];
      
      // Fetch profiles for these users
      const { data: profiles } = await supabase
        .from('profiles_public')
        .select('id, full_name')
        .in('id', userIds);

      // Map profiles to logs
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      return logs.map(log => ({
        ...log,
        old_values: log.old_values as Record<string, unknown> | null,
        new_values: log.new_values as Record<string, unknown> | null,
        user_name: profileMap.get(log.user_id)?.full_name || 'Utilisateur inconnu',
      })) as NCAuditLog[];
    },
    enabled: !!nonConformityId,
  });
}

export function useCreateNCAuditLog() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      non_conformity_id,
      action,
      old_values,
      new_values,
    }: {
      non_conformity_id: string;
      action: string;
      old_values?: Record<string, unknown> | null;
      new_values?: Record<string, unknown> | null;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('nc_audit_logs')
        .insert([{
          non_conformity_id,
          user_id: user.id,
          action,
          old_values: old_values ? JSON.parse(JSON.stringify(old_values)) : null,
          new_values: new_values ? JSON.parse(JSON.stringify(new_values)) : null,
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nc_audit_logs', variables.non_conformity_id] });
    },
  });
}

// Helper to get human-readable action labels
export function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'status_change': 'Changement de statut',
    'corrective_action_added': 'Action corrective ajoutée',
    'corrective_action_updated': 'Action corrective modifiée',
    'action_updated': 'Mise à jour des actions',
    'assigned': 'Assignation',
    'validated': 'Validation',
    'created': 'Création',
  };
  return labels[action] || action;
}

// Helper to format status for display
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'open': 'Ouverte',
    'in_progress': 'En cours',
    'resolved': 'Résolue',
    'validated': 'Validée',
  };
  return labels[status] || status;
}
