import { useState } from 'react';
import { Search, Filter, Plus, ArrowRight } from 'lucide-react';
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
import { NonConformity, CONTROL_POINTS } from '@/types/haccp';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// Mock data
const mockNonConformities: NonConformity[] = [
  {
    id: 'nc1',
    controlRecordId: 'ctrl5',
    controlPointCode: 'CP1_TEMPERATURE_REFRIGERE',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2),
    description: 'Température à réception: 8.5°C - Dépassement limite acceptable pour le lot de beurre',
    severity: 'major',
    status: 'open',
    assignedTo: 'DG',
    photos: [],
  },
  {
    id: 'nc2',
    controlRecordId: 'ctrl6',
    controlPointCode: 'CP4_ALLERGENES',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
    description: 'Nouvelle composition margarine non conforme à la référence - Présence lait non déclarée',
    severity: 'critical',
    status: 'in_progress',
    assignedTo: 'Assistant Qualité',
    correctiveAction: 'Contact fournisseur en cours pour obtenir la nouvelle fiche technique',
    photos: [],
  },
  {
    id: 'nc3',
    controlRecordId: 'ctrl7',
    controlPointCode: 'CP5_CORPS_ETRANGER',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    description: 'Détection corps étranger métallique lors du contrôle final - Lot LT2025-0703 éjecté',
    severity: 'critical',
    status: 'open',
    assignedTo: 'DG',
    photos: [],
  },
  {
    id: 'nc4',
    controlRecordId: 'ctrl8',
    controlPointCode: 'CP2_INTEGRITE',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    description: 'Emballage percé sur 3 sacs de farine - Lot refusé',
    severity: 'minor',
    status: 'resolved',
    assignedTo: 'Assistant Qualité',
    correctiveAction: 'Marchandise refusée, fournisseur averti',
    correctiveActionDate: new Date(Date.now() - 1000 * 60 * 60 * 24),
    photos: [],
  },
  {
    id: 'nc5',
    controlRecordId: 'ctrl9',
    controlPointCode: 'CP7_STOCKAGE_NEGATIF',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72),
    description: 'Température chambre froide: -10°C pendant 6h suite à panne compresseur',
    severity: 'major',
    status: 'validated',
    assignedTo: 'DG',
    correctiveAction: 'Réparation compresseur, stock vérifié et partiellement détruit',
    correctiveActionDate: new Date(Date.now() - 1000 * 60 * 60 * 60),
    validatedBy: 'Direction Générale',
    validatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    photos: [],
  },
];

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

  const filteredNCs = mockNonConformities.filter(nc => {
    const matchesSearch = nc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nc.controlPointCode.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || nc.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCount = mockNonConformities.filter(nc => nc.status === 'open').length;
  const inProgressCount = mockNonConformities.filter(nc => nc.status === 'in_progress').length;

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

      {/* NC List */}
      <div className="space-y-4">
        {filteredNCs.map((nc) => {
          const cp = CONTROL_POINTS.find(c => c.code === nc.controlPointCode);
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
                      {cp?.name || nc.controlPointCode}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-foreground">{nc.description}</p>

                  {/* Corrective action if exists */}
                  {nc.correctiveAction && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium text-foreground">Action corrective:</p>
                      <p className="text-sm text-muted-foreground mt-1">{nc.correctiveAction}</p>
                    </div>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Créée {formatDistanceToNow(nc.createdAt, { addSuffix: true, locale: fr })}
                    </span>
                    <span>•</span>
                    <span>Assignée à: {nc.assignedTo}</span>
                    {nc.validatedAt && (
                      <>
                        <span>•</span>
                        <span className="text-success">
                          Validée le {format(nc.validatedAt, 'dd/MM/yyyy', { locale: fr })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Action button */}
                {(nc.status === 'open' || nc.status === 'in_progress') && (
                  <Button variant="outline" className="flex-shrink-0 touch-target">
                    Traiter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredNCs.length === 0 && (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <p className="text-muted-foreground">Aucune non-conformité trouvée</p>
        </div>
      )}
    </div>
  );
}
