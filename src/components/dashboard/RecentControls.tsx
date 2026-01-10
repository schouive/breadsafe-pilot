import { cn } from '@/lib/utils';
import { ControlRecord, CONTROL_POINTS } from '@/types/haccp';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';

interface RecentControlsProps {
  controls: ControlRecord[];
}

const statusIcons = {
  conforme: CheckCircle2,
  acceptable: AlertCircle,
  nonconforme: XCircle,
  pending: AlertCircle,
};

const statusStyles = {
  conforme: 'text-success bg-success/10',
  acceptable: 'text-warning bg-warning/10',
  nonconforme: 'text-destructive bg-destructive/10',
  pending: 'text-muted-foreground bg-muted',
};

export function RecentControls({ controls }: RecentControlsProps) {
  return (
    <div className="bg-card rounded-xl border border-border">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Contrôles récents</h3>
      </div>
      <div className="divide-y divide-border">
        {controls.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground">
            Aucun contrôle enregistré aujourd'hui
          </div>
        ) : (
          controls.slice(0, 5).map((control) => {
            const cp = CONTROL_POINTS.find(c => c.code === control.controlPointCode);
            const StatusIcon = statusIcons[control.status];
            
            return (
              <div key={control.id} className="px-5 py-4 flex items-center gap-4 hover:bg-muted/50 transition-colors">
                <div className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-lg flex-shrink-0",
                  statusStyles[control.status]
                )}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {cp?.name || control.controlPointCode}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {control.operatorName} • {formatDistanceToNow(control.timestamp, { 
                      addSuffix: true, 
                      locale: fr 
                    })}
                  </p>
                </div>

                {control.value !== undefined && (
                  <span className="text-sm font-medium">
                    {control.value}°C
                  </span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
