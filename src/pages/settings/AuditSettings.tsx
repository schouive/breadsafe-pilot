import { AuditLogViewer } from '@/components/settings/AuditLogViewer';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';

export default function AuditSettings() {
  const { canPerform } = useAuth();
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Journal d'audit</h1>
        <p className="text-muted-foreground mt-1">Trace horodatée des actions sensibles</p>
      </div>
      {canPerform('canViewAuditLogs') ? (
        <AuditLogViewer />
      ) : (
        <Card><CardContent className="py-8 text-center text-muted-foreground">Accès réservé</CardContent></Card>
      )}
    </div>
  );
}
