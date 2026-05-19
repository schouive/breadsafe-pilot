import { useState } from 'react';
import { Users, Edit2, Clock, UserCheck, UserX, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers, useUpdateUserAccess, useUpdateUserStatus, UserWithRole } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useLogAction } from '@/hooks/useAuditLog';
import { ALL_MODULES, AppModule, getModuleLabel } from '@/types/modules';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const updateAccess = useUpdateUserAccess();
  const updateStatus = useUpdateUserStatus();
  const logAction = useLogAction();
  const { user: currentUser } = useAuth();

  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedModules, setSelectedModules] = useState<AppModule[]>([]);

  const handleOpenEdit = (user: UserWithRole) => {
    setEditingUser(user);
    setIsAdmin(user.roles.includes('admin'));
    setSelectedModules(user.modules);
  };

  const toggleModule = (m: AppModule) => {
    setSelectedModules((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );
  };

  const handleSave = async () => {
    if (!editingUser) return;
    await updateAccess.mutateAsync({
      userId: editingUser.id,
      isAdmin,
      modules: isAdmin ? [] : selectedModules,
    });

    await logAction.mutateAsync({
      action: 'update_user_access',
      entityType: 'user',
      entityId: editingUser.id,
      oldValues: { isAdmin: editingUser.roles.includes('admin'), modules: editingUser.modules },
      newValues: { isAdmin, modules: isAdmin ? 'all' : selectedModules },
    });

    setEditingUser(null);
  };

  const handleToggleStatus = async (user: UserWithRole) => {
    await updateStatus.mutateAsync({ userId: user.id, isActive: !user.is_active });
    await logAction.mutateAsync({
      action: user.is_active ? 'deactivate_user' : 'activate_user',
      entityType: 'user',
      entityId: user.id,
      oldValues: { is_active: user.is_active },
      newValues: { is_active: !user.is_active },
    });
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  const formatLastSignIn = (date: string | null) => {
    if (!date) return 'Jamais connecté';
    return `Dernière connexion ${formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr })}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Utilisateurs</CardTitle>
            <CardDescription>Associez chaque utilisateur aux modules auxquels il a accès</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        ) : users?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun utilisateur trouvé</p>
          </div>
        ) : (
          <div className="space-y-3">
            {users?.map((user) => {
              const userIsAdmin = user.roles.includes('admin');
              return (
                <div
                  key={user.id}
                  className={cn(
                    'flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4 rounded-lg border transition-colors',
                    user.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                  )}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{user.full_name}</p>
                        {user.id === currentUser?.id && (
                          <Badge variant="outline" className="text-xs">Vous</Badge>
                        )}
                        {!user.is_active && (
                          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                            Inactif
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatLastSignIn(user.last_sign_in_at)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col md:items-end gap-2">
                    <div className="flex items-center gap-2 flex-wrap justify-start md:justify-end">
                      {userIsAdmin ? (
                        <Badge className="bg-primary/15 text-primary border-primary/30 border">
                          <ShieldCheck className="h-3 w-3 mr-1" /> Administrateur · tous les modules
                        </Badge>
                      ) : user.modules.length === 0 ? (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Aucun module
                        </Badge>
                      ) : (
                        user.modules.map((m) => (
                          <Badge key={m} variant="secondary" className="text-xs">
                            {getModuleLabel(m)}
                          </Badge>
                        ))
                      )}
                    </div>

                    {user.id !== currentUser?.id && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(user)} title="Modifier les accès">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleStatus(user)}
                          title={user.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {user.is_active ? (
                            <UserX className="h-4 w-4 text-destructive" />
                          ) : (
                            <UserCheck className="h-4 w-4 text-success" />
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Dialog d'édition des accès */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accès de {editingUser?.full_name}</DialogTitle>
            <DialogDescription>
              Choisissez les modules accessibles à cet utilisateur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="flex items-center justify-between rounded-lg border p-3 bg-primary/5">
              <div className="space-y-0.5 pr-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Administrateur
                </Label>
                <p className="text-xs text-muted-foreground">
                  Accès total à tous les modules et à la gestion des utilisateurs
                </p>
              </div>
              <Switch checked={isAdmin} onCheckedChange={setIsAdmin} />
            </div>

            <div className={cn('space-y-2 transition-opacity', isAdmin && 'opacity-40 pointer-events-none')}>
              <Label className="text-sm font-medium">Modules autorisés</Label>
              <div className="grid gap-2">
                {ALL_MODULES.map((m) => (
                  <label
                    key={m.id}
                    className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={isAdmin || selectedModules.includes(m.id)}
                      onCheckedChange={() => toggleModule(m.id)}
                      disabled={isAdmin}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Annuler</Button>
            <Button onClick={handleSave} disabled={updateAccess.isPending}>
              {updateAccess.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
