import { useState } from 'react';
import { Plus, Package, Edit2, Trash2, Eye, Check, X, AlertTriangle, Download, Archive, Edit3, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCartonLabels, useDeleteCartonLabel, CartonLabel } from '@/hooks/useCartonLabels';
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

export function CartonLabelManagement() {
  const { data: labels, isLoading } = useCartonLabels();
  const deleteLabel = useDeleteCartonLabel();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState<CartonLabel | null>(null);
  const [viewingLabel, setViewingLabel] = useState<CartonLabel | null>(null);
  const [deletingLabel, setDeletingLabel] = useState<CartonLabel | null>(null);

  const handleDelete = async () => {
    if (!deletingLabel) return;
    await deleteLabel.mutateAsync(deletingLabel.id);
    setDeletingLabel(null);
  };

  const isOutdated = (label: CartonLabel) => {
    const sheetVersion = label.product_sheets?.version;
    const snapshotVersion = label.snapshot_product_sheet_version;
    return sheetVersion && snapshotVersion && sheetVersion > snapshotVersion;
  };

  const validatedCount = labels?.filter(l => l.status === 'validated').length || 0;
  const draftCount = labels?.filter(l => l.status === 'draft').length || 0;

  const handleExportCSV = () => {
    if (!labels || labels.length === 0) {
      toast.error('Aucune étiquette à exporter');
      return;
    }
    
    // Only validated labels can be exported
    if (validatedCount === 0) {
      toast.error('L\'INCO doit être validé avant l\'export.', {
        description: 'Validez au moins une étiquette pour pouvoir exporter.',
      });
      return;
    }

    const result = downloadZebraCSV(labels);
    if (result.success) {
      toast.success('Export CSV généré', {
        description: `${result.count} étiquette(s) validée(s) exportée(s)`,
      });
    } else {
      toast.error(result.message);
    }
  };

  const getStatusBadge = (label: CartonLabel) => {
    if (label.status === 'archived') return (
      <Badge variant="outline" className="shrink-0 bg-muted text-muted-foreground border-muted-foreground/30">
        <Archive className="h-3 w-3 mr-1" /> Archivée
      </Badge>
    );
    if (label.status === 'validated') return (
      <Badge variant="outline" className="shrink-0 bg-success/10 text-success border-success/30">
        <Check className="h-3 w-3 mr-1" /> Validée
      </Badge>
    );
    return (
      <Badge variant="outline" className="shrink-0 bg-warning/10 text-warning border-warning/30">
        <Edit3 className="h-3 w-3 mr-1" /> Brouillon
      </Badge>
    );
  };

  // Sort: drafts first, then validated, then archived
  const sortedLabels = labels?.slice().sort((a, b) => {
    const order = { draft: 0, validated: 1, archived: 2 };
    return (order[a.status] || 3) - (order[b.status] || 3);
  });

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
                  Générez et validez les étiquettes INCO réglementaires pour vos cartons
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

          {/* Warning banner if drafts pending */}
          {draftCount > 0 && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              <p className="text-sm text-warning">
                {draftCount} étiquette(s) en attente de validation INCO
              </p>
            </div>
          )}
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
