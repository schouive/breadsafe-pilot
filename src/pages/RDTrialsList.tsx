import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Copy, Archive, ArchiveRestore, Trash2, FlaskConical, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  useRDTrials, useDuplicateRDTrial, useDeleteRDTrial, useUpdateRDTrial, useCreateRDTrial,
  RD_TRIAL_STATUSES, getStatusMeta,
} from '@/hooks/useRDTrials';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type SortField = 'trial_date' | 'trial_name' | 'eval_average' | 'temp_actual_end_kneading';

export default function RDTrialsList() {
  const navigate = useNavigate();
  const [includeArchived, setIncludeArchived] = useState(false);
  const { data: trials, isLoading } = useRDTrials(includeArchived);
  const duplicate = useDuplicateRDTrial();
  const remove = useDeleteRDTrial();
  const update = useUpdateRDTrial();
  const create = useCreateRDTrial();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('trial_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = trials ?? [];
    if (statusFilter !== 'all') list = list.filter((t: any) => t.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t: any) =>
        t.trial_name?.toLowerCase().includes(q) ||
        t.trial_number?.toLowerCase().includes(q) ||
        t.recipe_name_text?.toLowerCase().includes(q) ||
        t.recipes?.name?.toLowerCase().includes(q) ||
        t.product_concerned?.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a: any, b: any) => {
      const av = a[sortField] ?? '';
      const bv = b[sortField] ?? '';
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [trials, statusFilter, search, sortField, sortAsc]);

  const handleNew = async () => {
    const t = await create.mutateAsync({ trial_name: 'Nouvel essai', status: 'preparation' });
    navigate(`/products/rd-trials/${t.id}`);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <FlaskConical className="h-6 w-6 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-primary">Essais R&D</CardTitle>
                <CardDescription>Suivi, comparaison et analyse de vos essais de recettes</CardDescription>
              </div>
            </div>
            <Button onClick={handleNew} disabled={create.isPending} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" /> Nouvel essai
            </Button>
          </div>

          {/* Filtres */}
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par nom, recette, produit, n°…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {RD_TRIAL_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="trial_date">Date</SelectItem>
                <SelectItem value="trial_name">Nom</SelectItem>
                <SelectItem value="eval_average">Note finale</SelectItem>
                <SelectItem value="temp_actual_end_kneading">Température finale</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => setSortAsc(!sortAsc)} title={sortAsc ? 'Croissant' : 'Décroissant'}>
              <ArrowUpDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => setIncludeArchived(!includeArchived)} className="shrink-0">
              {includeArchived ? 'Masquer archivés' : 'Afficher archivés'}
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Chargement…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <FlaskConical className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucun essai pour le moment</p>
              <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" /> Créer le premier essai</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filtered.map((t: any) => {
                const meta = getStatusMeta(t.status);
                return (
                  <div
                    key={t.id}
                    onClick={() => navigate(`/products/rd-trials/${t.id}`)}
                    className={cn(
                      "p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer",
                      t.is_archived && 'opacity-60'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{t.trial_number}</span>
                          <Badge variant="outline" className="text-xs">v{t.trial_version}</Badge>
                          <Badge variant="outline" className={cn('text-xs', meta.color)}>{meta.label}</Badge>
                        </div>
                        <p className="font-semibold truncate">{t.trial_name}</p>
                        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-sm text-muted-foreground mt-1">
                          {(t.recipes?.name || t.recipe_name_text) && (
                            <span className="truncate">📖 {t.recipes?.name ?? t.recipe_name_text}</span>
                          )}
                          {t.product_concerned && <span className="truncate">• {t.product_concerned}</span>}
                          <span>• {format(new Date(t.trial_date), 'dd MMM yyyy', { locale: fr })}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {t.temp_actual_end_kneading != null && <span>🌡 {t.temp_actual_end_kneading}°C</span>}
                          {t.eval_average != null && <span className="font-semibold text-primary">⭐ {Number(t.eval_average).toFixed(1)}/10</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => duplicate.mutate(t.id)} title="Dupliquer">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => update.mutate({ id: t.id, is_archived: !t.is_archived })}
                          title={t.is_archived ? 'Désarchiver' : 'Archiver'}
                        >
                          {t.is_archived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(t.id)} title="Supprimer">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet essai ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Toutes les données associées seront perdues.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) remove.mutate(deleteId); setDeleteId(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >Supprimer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
