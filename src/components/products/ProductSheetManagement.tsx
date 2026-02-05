import { useState } from 'react';
import { Plus, FileText, Edit2, Trash2, Eye, Check, X, FileCheck, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProductSheets, useDeleteProductSheet } from '@/hooks/useRecipes';
import { TechnicalSheetFormDialog } from './TechnicalSheetFormDialog';
import { TechnicalSheetDetailSheet } from './TechnicalSheetDetailSheet';
import { toast } from 'sonner';
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

// Helper to strip HTML tags for clean CSV export
function stripHtml(html: string | null): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

export function ProductSheetManagement() {
  const { data: sheets, isLoading } = useProductSheets();
  const deleteSheet = useDeleteProductSheet();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<any>(null);
  const [viewingSheet, setViewingSheet] = useState<any>(null);
  const [deletingSheet, setDeletingSheet] = useState<any>(null);

  const handleDelete = async () => {
    if (!deletingSheet) return;
    await deleteSheet.mutateAsync(deletingSheet.id);
    setDeletingSheet(null);
  };

  const handleExportCSV = () => {
    if (!sheets || sheets.length === 0) {
      toast.error('Aucune fiche à exporter');
      return;
    }

    const headers = [
      'Nom produit',
      'Référence',
      'Code recette',
      'Marque',
      'Code-barres',
      'Poids net',
      'Unité poids',
      'Description',
      'Liste ingrédients INCO',
      'Mention allergènes',
      'Conditions de conservation',
      'Mode de décongélation',
      'Conseils de mise en œuvre',
      'Type date limite',
      'Durée (jours)',
      'Pièces/carton',
      'Cartons/couche',
      'Couches/palette',
      'Poids carton (kg)',
      'Dimensions carton',
      'Pays d\'origine',
      'Version',
      'Statut',
      'Commentaire qualité'
    ];

    const rows = sheets.map((sheet: any) => [
      sheet.product_name || '',
      sheet.product_reference || '',
      sheet.snapshot_recipe_code || '',
      sheet.brand || '',
      sheet.barcode || '',
      sheet.net_weight || '',
      sheet.net_weight_unit || '',
      sheet.description || '',
      stripHtml(sheet.ingredients_declaration),
      sheet.allergen_statement || '',
      sheet.storage_instructions || '',
      sheet.thawing_instructions || '',
      sheet.usage_instructions || '',
      sheet.dlc_ddm_type || '',
      sheet.dlc_ddm_days || '',
      sheet.pieces_per_carton || '',
      sheet.cartons_per_layer || '',
      sheet.layers_per_pallet || '',
      sheet.carton_weight || '',
      sheet.carton_dimensions || '',
      sheet.origin_country || '',
      sheet.version || '',
      sheet.is_published ? 'Validée' : 'Brouillon',
      sheet.quality_comment || ''
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => 
        row.map(cell => {
          const str = String(cell);
          if (str.includes(';') || str.includes('\n') || str.includes('"')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(';')
      )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fiches_techniques_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`${sheets.length} fiches techniques exportées`);
  };

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileCheck className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="truncate">Fiches Techniques</CardTitle>
                <CardDescription className="line-clamp-2">Générez et gérez les fiches techniques de vos produits</CardDescription>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              {sheets && sheets.length > 0 && (
                <Button variant="outline" onClick={handleExportCSV} className="shrink-0">
                  <Download className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              )}
              <Button onClick={() => setIsAddOpen(true)} className="flex-1 sm:flex-none shrink-0">
                <Plus className="h-4 w-4 mr-2" />
                <span className="truncate">Générer une FT</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : sheets?.length === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucune fiche technique créée</p>
              <Button variant="outline" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Générer une FT
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sheets?.map((sheet: any) => (
                <div
                  key={sheet.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileCheck className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium truncate">{sheet.product_name}</p>
                        {(sheet as any).version && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            v{(sheet as any).version}
                          </Badge>
                        )}
                        {(sheet as any).product_reference && (
                          <Badge variant="secondary" className="text-xs font-mono shrink-0">
                            {(sheet as any).product_reference}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        {(sheet as any).snapshot_recipe_name && <span className="truncate">Recette: {(sheet as any).snapshot_recipe_name}</span>}
                        {sheet.brand && <span>• {sheet.brand}</span>}
                        {sheet.net_weight && (
                          <span>• {sheet.net_weight} {sheet.net_weight_unit}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                    <Badge
                      variant="outline"
                      className={`shrink-0 ${sheet.is_published ? 'bg-success/10 text-success border-success/30' : 'bg-muted'}`}
                    >
                      {sheet.is_published ? (
                        <><Check className="h-3 w-3 mr-1" /> Publié</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" /> Brouillon</>
                      )}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => setViewingSheet(sheet)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Voir
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingSheet(sheet)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setDeletingSheet(sheet)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <TechnicalSheetFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        sheet={null}
        mode="create"
      />

      {/* Edit Dialog */}
      <TechnicalSheetFormDialog
        open={!!editingSheet}
        onOpenChange={(open) => !open && setEditingSheet(null)}
        sheet={editingSheet}
        mode="edit"
      />

      {/* View Sheet */}
      <TechnicalSheetDetailSheet
        open={!!viewingSheet}
        onOpenChange={(open) => !open && setViewingSheet(null)}
        sheet={viewingSheet}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingSheet} onOpenChange={(open) => !open && setDeletingSheet(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la fiche produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La fiche "{deletingSheet?.product_name}" sera supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
