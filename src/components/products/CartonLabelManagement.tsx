import { useState, useMemo } from 'react';
import { Plus, Package, Edit2, Trash2, Eye, Check, X, AlertTriangle, Download, Archive, Lock, Snowflake, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCartonLabels, useDeleteCartonLabel, CartonLabel } from '@/hooks/useCartonLabels';
import { isFrozen } from '@/lib/ddm';
import { CartonLabelFormDialog } from './CartonLabelFormDialog';
import { CartonLabelDetailSheet } from './CartonLabelDetailSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { downloadZebraCSV } from '@/lib/zebraLabelExport';
import { toast } from 'sonner';
import { getLanguageBadge } from '@/lib/cartonLabelI18n';

export function CartonLabelManagement() {
  const { data: labels, isLoading } = useCartonLabels();
  const deleteLabel = useDeleteCartonLabel();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<CartonLabel | null>(null);
  const [viewingLabel, setViewingLabel] = useState<CartonLabel | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<CartonLabel | null>(null);
  const [search, setSearch] = useState('');
  const [frozenFilter, setFrozenFilter] = useState<string>('all');

  const handleDelete = async () => {
    if (!deletingLabel) return;
    await deleteLabel.mutateAsync(deletingLabel.id);
    setDeletingLabel(null);
  };

  // Sort: drafts first, then validated, then archived
  const sortedLabels = labels?.slice().sort((a, b) => {
    const order = { draft: 0, validated: 1, archived: 2 };
    return (order[a.status] || 3) - (order[b.status] || 3);
  });

  const filteredLabels = useMemo(() => {
    if (!sortedLabels) return [];
    const q = search.trim().toLowerCase();
    return sortedLabels.filter((label) => {
      if (frozenFilter === 'frozen' && !isFrozen(label.snapshot_storage_instructions)) return false;
      if (frozenFilter === 'fresh' && isFrozen(label.snapshot_storage_instructions)) return false;
      if (q) {
        const hay = [label.label_title, label.product_sheets?.product_name]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sortedLabels, search, frozenFilter]);

  const isOutdated = (label: CartonLabel) => {
    const sheetVersion = label.product_sheets?.version;
    const snapshotVersion = label.snapshot_product_sheet_version;
    return sheetVersion && snapshotVersion && sheetVersion > snapshotVersion;
  };

  const validatedCount = labels?.filter(l => l.status === 'validated').length || 0;

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Package className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="truncate">Étiquettes Carton</CardTitle>
                <CardDescription className="line-clamp-2">
                  Générez les étiquettes INCO réglementaires pour vos cartons (FT et INCO doivent être validées)
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {validatedCount > 0 && (
                <Button variant="outline" onClick={handleExportCSV} className="w-full sm:w-auto shrink-0">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="truncate">Export Zebra ({validatedCount})</span>
                </Button>
              )}
              <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                <span className="truncate">Nouvelle étiquette</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : sortedLabels?.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucune étiquette carton créée</p>
              <Button variant="outline" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle étiquette
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedLabels?.map((label) => (
                <div
                  key={label.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
                    label.status === 'archived' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate">{label.label_title}</p>
                        <Badge variant="outline" className="text-xs shrink-0 bg-primary/10 text-primary border-primary/30">
                          {getLanguageBadge(label.language)}
                        </Badge>
                        <Badge variant="outline" className="text-xs shrink-0">v{label.version}</Badge>
                        {isOutdated(label) && label.status !== 'archived' && (
                          <Badge variant="outline" className="text-xs shrink-0 bg-warning/10 text-warning border-warning/30">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Obsolète
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="truncate">FT: {label.product_sheets?.product_name}</span>
                        {label.snapshot_net_weight && (
                          <span>• {label.snapshot_net_weight} {label.snapshot_net_weight_unit}</span>
                        )}
                        {label.validated_at && (
                          <span>• Validée le {format(new Date(label.validated_at), 'dd/MM/yyyy', { locale: fr })}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    {getStatusBadge(label)}
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8" onClick={() => setViewingLabel(label)}>
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                      {label.status !== 'archived' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingLabel(label)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {label.status !== 'archived' && (
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeletingLabel(label)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CartonLabelFormDialog open={isAddOpen} onOpenChange={setIsAddOpen} label={null} mode="create" />
      <CartonLabelFormDialog open={!!editingLabel} onOpenChange={(open) => !open && setEditingLabel(null)} label={editingLabel} mode="edit" />
      <CartonLabelDetailSheet open={!!viewingLabel} onOpenChange={(open) => !open && setViewingLabel(null)} label={viewingLabel} />

      <AlertDialog open={!!deletingLabel} onOpenChange={(open) => !open && setDeletingLabel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'étiquette carton ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'étiquette "{deletingLabel?.label_title}" sera supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
