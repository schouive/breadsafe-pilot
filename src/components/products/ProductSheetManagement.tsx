import { useMemo, useState } from 'react';
import { Plus, FileText, Edit2, Trash2, Eye, Check, X, FileCheck, Edit3, CheckCircle, Copy, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useProductSheets, useDeleteProductSheet, useDuplicateProductSheet } from '@/hooks/useRecipes';
import { useFamilies } from '@/hooks/useProductCatalog';
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
  const { data: families } = useFamilies();
  const deleteSheet = useDeleteProductSheet();
  const duplicateSheet = useDuplicateProductSheet();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<any>(null);
  const [viewingSheet, setViewingSheet] = useState<any>(null);
  const [deletingSheet, setDeletingSheet] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [familyFilter, setFamilyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const handleDelete = async () => {
    if (!deletingSheet) return;
    await deleteSheet.mutateAsync(deletingSheet.id);
    setDeletingSheet(null);
  };

  const filtered = useMemo(() => {
    if (!sheets) return [];
    const q = search.trim().toLowerCase();
    return (sheets as any[]).filter((s) => {
      if (familyFilter === 'none' && s.family_id) return false;
      if (familyFilter !== 'all' && familyFilter !== 'none' && s.family_id !== familyFilter) return false;
      if (statusFilter === 'published' && !s.is_published) return false;
      if (statusFilter === 'draft' && s.is_published) return false;
      if (q) {
        const hay = [s.product_name, s.product_reference, s.snapshot_recipe_name, s.family?.label]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sheets, search, familyFilter, statusFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { key: string; label: string; items: any[] }>();
    for (const s of filtered) {
      const key = s.family_id || '__none__';
      const label = s.family?.label || 'Sans famille';
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(s);
    }
    return Array.from(map.values()).sort((a, b) => {
      if (a.key === '__none__') return 1;
      if (b.key === '__none__') return -1;
      return a.label.localeCompare(b.label);
    });
  }, [filtered]);

  const totalCount = sheets?.length || 0;
  const visibleCount = filtered.length;

  return (
    <>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <FileCheck className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="truncate">Fiches Techniques</CardTitle>
                <CardDescription className="line-clamp-2">
                  {visibleCount} / {totalCount} fiche{totalCount > 1 ? 's' : ''} — filtrez par famille de produits
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsAddOpen(true)} className="w-full sm:w-auto shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              <span className="truncate">Générer une FT</span>
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, référence, marque…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={familyFilter} onValueChange={setFamilyFilter}>
              <SelectTrigger className="md:w-64">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Famille" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les familles</SelectItem>
                <SelectItem value="none">Sans famille</SelectItem>
                {families?.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-44">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="draft">Brouillon</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {families && families.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={familyFilter === 'all' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFamilyFilter('all')}
              >
                Toutes
              </Badge>
              {families.map((f: any) => (
                <Badge
                  key={f.id}
                  variant={familyFilter === f.id ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFamilyFilter(f.id)}
                >
                  {f.label}
                </Badge>
              ))}
              <Badge
                variant={familyFilter === 'none' ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setFamilyFilter('none')}
              >
                Sans famille
              </Badge>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : visibleCount === 0 ? (
            <div className="text-center py-12">
              <FileCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {totalCount === 0 ? 'Aucune fiche technique créée' : 'Aucune fiche ne correspond aux filtres'}
              </p>
              {totalCount === 0 && (
                <Button variant="outline" onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Générer une FT
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((group) => (
                <div key={group.key} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
                      {group.label}
                    </h3>
                    <Badge variant="secondary" className="text-xs">{group.items.length}</Badge>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  <div className="space-y-3">
                    {group.items.map((sheet: any) => (
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
                    {/* INCO status badge */}
                    {(sheet as any).inco_status === 'validated' ? (
                      <Badge variant="outline" className="shrink-0 bg-success/10 text-success border-success/30">
                        <CheckCircle className="h-3 w-3 mr-1" /> INCO
                      </Badge>
                    ) : (sheet as any).inco_html ? (
                      <Badge variant="outline" className="shrink-0 bg-warning/10 text-warning border-warning/30">
                        <Edit3 className="h-3 w-3 mr-1" /> INCO
                      </Badge>
                    ) : null}
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
                        onClick={() => duplicateSheet.mutate(sheet.id)}
                        disabled={duplicateSheet.isPending}
                        title="Dupliquer"
                      >
                        <Copy className="h-4 w-4" />
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
