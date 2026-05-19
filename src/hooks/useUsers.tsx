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

      // Récupérer les accès modules
      const { data: allModules, error: modulesError } = await supabase
        .from('user_module_access')
        .select('user_id, module');

      if (modulesError) throw modulesError;

      // Combiner les données
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRoles = (allRoles || [])
          .filter((r) => r.user_id === profile.id)
          .map((r) => r.role as AppRole);

        const userModules = (allModules || [])
          .filter((m) => m.user_id === profile.id)
          .map((m) => m.module as AppModule);

        return {
          id: profile.id,
          full_name: profile.full_name,
          email: profile.email,
          avatar_url: profile.avatar_url,
          is_active: profile.is_active ?? true,
          last_sign_in_at: profile.last_sign_in_at,
          created_at: profile.created_at,
          roles: userRoles.length > 0 ? userRoles : ['operator' as AppRole],
          modules: userModules,
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

/**
 * Met à jour les modules accessibles pour un utilisateur + définit s'il est admin.
 * Si admin = true → on lui donne le rôle 'admin' (les modules sont implicites).
 * Sinon → rôle 'operator' + liste de modules cochés.
 */
export function useUpdateUserAccess() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      userId,
      isAdmin,
      modules,
    }: {
      userId: string;
      isAdmin: boolean;
      modules: AppModule[];
    }) => {
      // 1. Reset des rôles
      const { error: delRolesErr } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
      if (delRolesErr) throw delRolesErr;

      const { error: insRoleErr } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: isAdmin ? 'admin' : 'operator' });
      if (insRoleErr) throw insRoleErr;

      // 2. Reset des modules
      const { error: delModErr } = await supabase
        .from('user_module_access')
        .delete()
        .eq('user_id', userId);
      if (delModErr) throw delModErr;

      // 3. Insertion des modules (uniquement si pas admin — admin a tout)
      if (!isAdmin && modules.length > 0) {
        const rows = modules.map((m) => ({ user_id: userId, module: m }));
        const { error: insModErr } = await supabase
          .from('user_module_access')
          .insert(rows);
        if (insModErr) throw insModErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast({
        title: 'Accès mis à jour',
        description: 'Les accès de l\'utilisateur ont été modifiés.',
      });
    },
    onError: (error: any) => {
      console.error('Error updating access:', error);
      toast({
        title: 'Erreur',
        description: error?.message || 'Impossible de modifier les accès.',
        variant: 'destructive',
      });
    },
  });
}
