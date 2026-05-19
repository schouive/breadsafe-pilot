import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppRole } from '@/types/roles';
import { AppModule } from '@/types/modules';

export interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  roles: AppRole[];
  modules: AppModule[];
}

export function useUsers() {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['users-with-roles'],
    queryFn: async (): Promise<UserWithRole[]> => {
      // Récupérer les profils
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Récupérer tous les rôles
      const { data: allRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combiner les données
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRoles = (allRoles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole);

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          is_active: profile.is_active ?? true,
          last_sign_in_at: profile.last_sign_in_at,
          created_at: profile.created_at,
          roles: userRoles.length > 0 ? userRoles : ['operator' as AppRole],
        };
      });

      return usersWithRoles;
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Supprimer les anciens rôles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Ajouter le nouveau rôle
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({
        title: 'Rôle mis à jour',
        description: 'Le rôle de l\'utilisateur a été modifié avec succès.',
      });
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le rôle.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({
        title: isActive ? 'Utilisateur activé' : 'Utilisateur désactivé',
        description: isActive 
          ? 'L\'utilisateur peut maintenant se connecter.' 
          : 'L\'utilisateur ne peut plus se connecter.',
      });
    },
    onError: (error) => {
      console.error('Error updating user status:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de modifier le statut.',
        variant: 'destructive',
      });
    },
  });
}
