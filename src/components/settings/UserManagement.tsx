import { useState } from 'react';
import { 
  User, 
  Users, 
  Shield, 
  Edit2, 
  Check, 
  X, 
  Clock,
  UserCheck,
  UserX
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useUsers, useUpdateUserRole, useUpdateUserStatus, UserWithRole } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useLogAction } from '@/hooks/useAuditLog';
import { AppRole, ROLE_DEFINITIONS, getRoleLabel, getRoleColorClasses } from '@/types/roles';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function UserManagement() {
  const { data: users, isLoading } = useUsers();
  const updateRole = useUpdateUserRole();
  const updateStatus = useUpdateUserStatus();
  const logAction = useLogAction();
  const { user: currentUser } = useAuth();
  
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('operator');

  const handleOpenEdit = (user: UserWithRole) => {
    setEditingUser(user);
    setSelectedRole(user.roles[0] || 'operator');
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;

    const oldRole = editingUser.roles[0];
    await updateRole.mutateAsync({
      userId: editingUser.id,
      role: selectedRole,
    });

    // Log l'action
    await logAction.mutateAsync({
      action: 'update_user_role',
      entityType: 'user',
      entityId: editingUser.id,
      oldValues: { role: oldRole },
      newValues: { role: selectedRole },
    });

    setEditingUser(null);
  };

  const handleToggleStatus = async (user: UserWithRole) => {
    await updateStatus.mutateAsync({
      userId: user.id,
      isActive: !user.is_active,
    });

    // Log l'action
    await logAction.mutateAsync({
      action: user.is_active ? 'deactivate_user' : 'activate_user',
      entityType: 'user',
      entityId: user.id,
      oldValues: { is_active: user.is_active },
      newValues: { is_active: !user.is_active },
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatLastSignIn = (date: string | null) => {
    if (!date) return 'Jamais connecté';
    return `Dernière connexion ${formatDistanceToNow(new Date(date), { 
      addSuffix: true, 
      locale: fr 
    })}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Utilisateurs</CardTitle>
              <CardDescription>Gérez les accès et les rôles des utilisateurs</CardDescription>
            </div>
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
            {users?.map((user) => (
              <div
                key={user.id}
                className={cn(
                  "flex items-center justify-between p-4 rounded-lg border transition-colors",
                  user.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                )}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={user.avatar_url || ''} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{user.full_name}</p>
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="text-xs">Vous</Badge>
                      )}
                      {!user.is_active && (
                        <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                          Inactif
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatLastSignIn(user.last_sign_in_at)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge 
                    variant="outline" 
                    className={cn("border", getRoleColorClasses(user.roles[0]))}
                  >
                    {getRoleLabel(user.roles[0])}
                  </Badge>
                  
                  {user.id !== currentUser?.id && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(user)}
                        title="Modifier le rôle"
                      >
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
            ))}
          </div>
        )}

        {/* Légende des rôles */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Légende des rôles
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.values(ROLE_DEFINITIONS).map((role) => (
              <div key={role.id} className="flex items-center gap-2 text-sm">
                <Badge 
                  variant="outline" 
                  className={cn("border text-xs", role.color)}
                >
                  {role.label}
                </Badge>
                <span className="text-muted-foreground text-xs truncate">
                  {role.description}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>

      {/* Dialog de modification du rôle */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le rôle</DialogTitle>
            <DialogDescription>
              Changer le rôle de {editingUser?.full_name}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nouveau rôle</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(ROLE_DEFINITIONS).map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{role.label}</span>
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aperçu des permissions */}
            <div className="rounded-lg border p-3 bg-muted/50">
              <h5 className="text-sm font-medium mb-2">Permissions du rôle</h5>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">HACCP:</span>
                  <Badge variant="outline" className="text-xs">
                    {ROLE_DEFINITIONS[selectedRole].permissions.modules.haccp}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Produits:</span>
                  <Badge variant="outline" className="text-xs">
                    {ROLE_DEFINITIONS[selectedRole].permissions.modules.products}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20">Paramètres:</span>
                  <Badge variant="outline" className="text-xs">
                    {ROLE_DEFINITIONS[selectedRole].permissions.modules.settings}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Annuler
            </Button>
            <Button 
              onClick={handleSaveRole}
              disabled={updateRole.isPending}
            >
              {updateRole.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
