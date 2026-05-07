import { UserManagement } from '@/components/settings/UserManagement';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';

export default function UsersSettings() {
  const { canPerform } = useAuth();
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
        <p className="text-muted-foreground mt-1">Comptes et rôles</p>
      </div>
      {canPerform('canManageUsers') ? (
        <UserManagement />
      ) : (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Accès réservé aux administrateurs</CardContent></Card>
      )}
    </div>
  );
}
