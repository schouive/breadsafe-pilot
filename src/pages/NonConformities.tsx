import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { CONTROL_POINTS } from '@/types/haccp';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNonConformities, NonConformityFromDB } from '@/hooks/useNonConformities';
import { CorrectiveActionSheet } from '@/components/nonconformities/CorrectiveActionSheet';
import { Skeleton } from '@/components/ui/skeleton';

const severityConfig = {
  minor: { label: 'Mineur', class: 'bg-warning/10 text-warning border-warning/30' },
  major: { label: 'Majeur', class: 'bg-orange-100 text-orange-700 border-orange-300' },
  critical: { label: 'Critique', class: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const statusConfig = {
  open: { label: 'Ouverte', class: 'bg-destructive/10 text-destructive' },
  in_progress: { label: 'En cours', class: 'bg-warning/10 text-warning' },
  resolved: { label: 'Résolue', class: 'bg-primary/10 text-primary' },
  validated: { label: 'Validée', class: 'bg-success/10 text-success' },
};

export default function NonConformities() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedNC, setSelectedNC] = useState<NonConformityFromDB | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: nonConformities, isLoading } = useNonConformities(
    statusFilter === 'all' ? 'all' : statusFilter as any
  );

  const filteredNCs = nonConformities?.filter(nc => {
    const matchesSearch = nc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nc.control_point_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }) || [];

  const openCount = nonConformities?.filter(nc => nc.status === 'open').length || 0;
  const inProgressCount = nonConformities?.filter(nc => nc.status === 'in_progress').length || 0;

  const handleTraiter = (nc: NonConformityFromDB) => {
    setSelectedNC(nc);
    setIsSheetOpen(true);
  };

  const handleCloseSheet = () => {
    setIsSheetOpen(false);
    setSelectedNC(null);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Non-Conformités</h1>
          <p className="text-muted-foreground mt-1">
            Suivi et gestion des écarts HACCP
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="destructive" className="text-sm px-3 py-1">
            {openCount} ouverte{openCount > 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="text-sm px-3 py-1 bg-warning/10 text-warning border-warning/30">
            {inProgressCount} en cours
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une non-conformité..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="open">Ouvertes</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
            <SelectItem value="resolved">Résolues</SelectItem>
            <SelectItem value="validated">Validées</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card rounded-xl border border-border p-5">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NC List */}
      {!isLoading && (
        <div className="space-y-4">
          {filteredNCs.map((nc) => {
            const cp = CONTROL_POINTS.find(c => c.code === nc.control_point_code);
            const severity = severityConfig[nc.severity];
            const status = statusConfig[nc.status];
            
            return (
              <div 
                key={nc.id} 
                className="bg-card rounded-xl border border-border p-5 card-interactive"
              >
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 space-y-3">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={cn("font-medium", severity.class)}>
                        {severity.label}
                      </Badge>
                      <Badge className={status.class}>
                        {status.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {cp?.name || nc.control_point_code}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-foreground">{nc.description}</p>

                    {/* Corrective action if exists */}
                    {nc.corrective_action && (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <p className="text-sm font-medium text-foreground">Action corrective:</p>
                        <p className="text-sm text-muted-foreground mt-1">{nc.corrective_action}</p>
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Créée {formatDistanceToNow(new Date(nc.created_at), { addSuffix: true, locale: fr })}
                      </span>
                      {nc.assigned_to && (
                        <>
                          <span>•</span>
                          <span>Assignée à: {nc.assigned_to}</span>
                        </>
                      )}
                      {nc.validated_at && (
                        <>
                          <span>•</span>
                          <span className="text-success">
                            Validée le {format(new Date(nc.validated_at), 'dd/MM/yyyy', { locale: fr })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  {(nc.status === 'open' || nc.status === 'in_progress' || nc.status === 'resolved') && (
                    <Button 
                      variant="outline" 
                      className="flex-shrink-0 touch-target"
                      onClick={() => handleTraiter(nc)}
                    >
                      {nc.status === 'resolved' ? 'Valider' : 'Traiter'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && filteredNCs.length === 0 && (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">Aucune non-conformité trouvée</p>
        </div>
      )}

      {/* Corrective Action Sheet */}
      <CorrectiveActionSheet
        nonConformity={selectedNC}
        isOpen={isSheetOpen}
        onClose={handleCloseSheet}
      />
    </div>
  );
}
