import { NonConformity, CONTROL_POINTS } from '@/types/haccp';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface NonConformityAlertProps {
  nonConformities: NonConformity[];
  onViewAll: () => void;
}

const severityConfig = {
  minor: { label: 'Mineur', class: 'bg-warning/10 text-warning border-warning/30' },
  major: { label: 'Majeur', class: 'bg-orange-100 text-orange-700 border-orange-300' },
  critical: { label: 'Critique', class: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const statusLabels = {
  open: 'Ouverte',
  in_progress: 'En cours',
  resolved: 'Résolue',
  validated: 'Validée',
};

export function NonConformityAlert({ nonConformities, onViewAll }: NonConformityAlertProps) {
  const openNCs = nonConformities.filter(nc => nc.status === 'open' || nc.status === 'in_progress');

  if (openNCs.length === 0) {
    return (
      <div className="bg-conforme-light rounded-xl border border-success/20 p-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/20 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-success">Aucune non-conformité ouverte</h3>
            <p className="text-sm text-success/80">Toutes les NC sont traitées</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-nonconforme-light rounded-xl border border-destructive/20">
      <div className="px-5 py-4 border-b border-destructive/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center pulse-alert">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold text-destructive">
              {openNCs.length} Non-conformité{openNCs.length > 1 ? 's' : ''} à traiter
            </h3>
            <p className="text-sm text-destructive/70">Action requise</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onViewAll} className="border-destructive/30 text-destructive hover:bg-destructive/10">
          Voir tout
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
      
      <div className="divide-y divide-destructive/10">
        {openNCs.slice(0, 3).map((nc) => {
          const cp = CONTROL_POINTS.find(c => c.code === nc.controlPointCode);
          const severity = severityConfig[nc.severity];
          
          return (
            <div key={nc.id} className="px-5 py-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">
                    {cp?.name || nc.controlPointCode}
                  </p>
                  <Badge className={cn("text-xs", severity.class)}>
                    {severity.label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {nc.description}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(nc.createdAt, { addSuffix: true, locale: fr })} • {statusLabels[nc.status]}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
