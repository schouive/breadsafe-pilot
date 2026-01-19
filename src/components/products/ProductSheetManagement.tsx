import { useState } from 'react';
import { Plus, FileText, Edit2, Trash2, Eye, Check, X, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useProductSheets, useDeleteProductSheet } from '@/hooks/useRecipes';
import { TechnicalSheetFormDialog } from './TechnicalSheetFormDialog';
import { TechnicalSheetDetailSheet } from './TechnicalSheetDetailSheet';
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

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Fiches Techniques</CardTitle>
                <CardDescription>Générez et gérez les fiches techniques de vos produits</CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Générer une nouvelle FT
            </Button>
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
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{sheet.product_name}</p>
                        {(sheet as any).version && (
                          <Badge variant="outline" className="text-xs">
                            v{(sheet as any).version}
                          </Badge>
                        )}
                        {(sheet as any).product_reference && (
                          <Badge variant="secondary" className="text-xs font-mono">
                            {(sheet as any).product_reference}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {(sheet as any).snapshot_recipe_name && <span>Recette: {(sheet as any).snapshot_recipe_name}</span>}
                        {sheet.brand && <span>• {sheet.brand}</span>}
                        {sheet.net_weight && (
                          <span>• {sheet.net_weight} {sheet.net_weight_unit}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={sheet.is_published ? 'bg-success/10 text-success border-success/30' : 'bg-muted'}
                    >
                      {sheet.is_published ? (
                        <><Check className="h-3 w-3 mr-1" /> Publié</>
                      ) : (
                        <><X className="h-3 w-3 mr-1" /> Brouillon</>
                      )}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingSheet(sheet)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingSheet(sheet)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingSheet(sheet)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
