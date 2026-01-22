import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Json } from '@/integrations/supabase/types';

export interface AuditLogEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Json | null;
  new_values: Json | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user_name?: string;
}

// Hook pour enregistrer une action dans les logs d'audit
export function useLogAction() {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
    }: {
      action: string;
      entityType: string;
      entityId?: string;
      oldValues?: Record<string, unknown>;
      newValues?: Record<string, unknown>;
    }) => {
      if (!user) return;

      const { error } = await supabase.from('audit_logs').insert([{
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        old_values: oldValues as Json || null,
        new_values: newValues as Json || null,
        user_agent: navigator.userAgent,
      }]);

      if (error) {
        console.error('Failed to log action:', error);
        // Ne pas throw pour ne pas bloquer l'action principale
      }
    },
  });
}

// Hook pour récupérer les logs d'audit
export function useAuditLogs(options?: { entityType?: string; limit?: number }) {
  return useQuery({
    queryKey: ['audit-logs', options?.entityType, options?.limit],
    queryFn: async (): Promise<AuditLogEntry[]> => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (options?.entityType) {
        query = query.eq('entity_type', options.entityType);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Enrichir avec les noms d'utilisateurs
      const userIds = [...new Set((data || []).map((log) => log.user_id))];
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p.full_name]));

        return (data || []).map((log) => ({
          ...log,
          old_values: log.old_values,
          new_values: log.new_values,
          user_name: profileMap.get(log.user_id) || 'Utilisateur inconnu',
        })) as AuditLogEntry[];
      }

      return (data || []) as AuditLogEntry[];
    },
  });
}
