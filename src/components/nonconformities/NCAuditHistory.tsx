import { useNCAuditLogs, getActionLabel, getStatusLabel } from '@/hooks/useNCAuditLogs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { History, User, ArrowRight, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface NCAuditHistoryProps {
  nonConformityId: string | undefined;
}

export function NCAuditHistory({ nonConformityId }: NCAuditHistoryProps) {
  const { data: logs, isLoading } = useNCAuditLogs(nonConformityId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Aucun historique disponible</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {logs.map((log, index) => (
        <div 
          key={log.id} 
          className={cn(
            "relative pl-6 pb-4",
            index !== logs.length - 1 && "border-l-2 border-muted ml-2"
          )}
        >
          {/* Timeline dot */}
          <div className="absolute -left-[5px] top-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
          
          <div className="bg-muted/30 rounded-lg p-3 space-y-2">
            {/* Action header */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-sm text-foreground">
                {getActionLabel(log.action)}
              </span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
              </div>
            </div>

            {/* User info */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{log.user_name}</span>
            </div>

            {/* Status change details */}
            {log.action === 'status_change' && log.old_values?.status && log.new_values?.status && (
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground">
                  {getStatusLabel(log.old_values.status as string)}
                </span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">
                  {getStatusLabel(log.new_values.status as string)}
                </span>
              </div>
            )}

            {/* Action details - displayed for all log types */}
            {log.new_values && (() => {
              console.log('NCAuditHistory log.new_values:', JSON.stringify(log.new_values));
              return (
                <div className="text-xs text-muted-foreground space-y-1">
                  {typeof log.new_values.corrective_action === 'string' && log.new_values.corrective_action.trim() !== '' && (
                    <p className="line-clamp-2">
                      <span className="font-medium text-foreground">Correction:</span> {log.new_values.corrective_action}
                    </p>
                  )}
                  {typeof log.new_values.preventive_action === 'string' && log.new_values.preventive_action.trim() !== '' && (
                    <p className="line-clamp-2">
                      <span className="font-medium text-foreground">Action corrective:</span> {log.new_values.preventive_action}
                    </p>
                  )}
                  {typeof log.new_values.assigned_to === 'string' && log.new_values.assigned_to.trim() !== '' && (
                    <p>
                      <span className="font-medium text-foreground">Assigné à:</span> {log.new_values.assigned_to}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      ))}
    </div>
  );
}
