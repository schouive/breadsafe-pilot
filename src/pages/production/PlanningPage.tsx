import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Play, Plus, Trash2, Pencil, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import {
  useCreateProductionPlan,
  useDeleteProductionPlan,
  useLaunchProductionPlan,
  useProductionPlans,
  useUpdateProductionPlan,
  type ProductionPlan,
  type ProductionPriority,
  type ProductionQuantityUnit,
} from '@/hooks/useProductionPlans';
import { useFinishedRecipes } from '@/hooks/useRecipes';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Variant {
  key: string; // weight+unit
  label: string; // e.g. "90 g"
  product_name: string;
}

const priorityLabels: Record<ProductionPriority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
};

const priorityColors: Record<ProductionPriority, string> = {
  low: 'bg-slate-100 text-slate-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const statusLabels = {
  pending: 'À faire',
  in_progress: 'En cours',
  completed: 'Terminée',
} as const;

const statusColors = {
  pending: 'bg-slate-100 text-slate-700 border-slate-200',
  in_progress: 'bg-orange-100 text-orange-700 border-orange-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
} as const;

const unitLabels: Record<ProductionQuantityUnit, string> = {
  chariots: 'Chariots',
  piece: 'Pièce',
  run: 'Run',
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, delta: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

interface RowEntry {
  quantity: string;
  unit: ProductionQuantityUnit;
}

interface BatchShared {
  scheduled_time: string;
  priority: ProductionPriority;
  manager_name: string;
  operator_name: string;
  observations: string;
}

interface EditState {
  id: string;
  recipe_id: string | null;
  recipe_name: string;
  quantity_total: string;
  quantity_unit: ProductionQuantityUnit;
  chariots: number;
  scheduled_time: string;
  priority: ProductionPriority;
  manager_name: string;
  operator_name: string;
  observations: string;
}

export default function PlanningPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso());
  const [newOpen, setNewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditState | null>(null);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Record<string, RowEntry>>({});
  const [shared, setShared] = useState<BatchShared>({
    scheduled_time: `${todayIso()}T06:00`,
    priority: 'normal',
    manager_name: '',
    operator_name: '',
    observations: '',
  });

  const { data: plans = [], isLoading } = useProductionPlans(date);
  const { data: recipes = [] } = useFinishedRecipes();
  const { data: sheets = [] } = useQuery({
    queryKey: ['product_sheets', 'planning-variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheets')
        .select('recipe_id, product_name, net_weight, net_weight_unit, is_published');
      if (error) throw error;
      return (data ?? []) as { recipe_id: string | null; product_name: string; net_weight: number | null; net_weight_unit: string | null; is_published: boolean }[];
    },
  });
  const createPlan = useCreateProductionPlan();
  const updatePlan = useUpdateProductionPlan();
  const deletePlan = useDeleteProductionPlan();
  const launchPlan = useLaunchProductionPlan();

  // Group variants by recipe_id, dedupe by weight+unit
  const variantsByRecipe = useMemo(() => {
    const map = new Map<string, Variant[]>();
    for (const s of sheets) {
      if (!s.recipe_id || !s.is_published || s.net_weight == null) continue;
      const unit = s.net_weight_unit ?? 'g';
      const key = `${s.net_weight}${unit}`;
      const list = map.get(s.recipe_id) ?? [];
      if (!list.some((v) => v.key === key)) {
        list.push({ key, label: `${s.net_weight} ${unit}`, product_name: s.product_name });
        map.set(s.recipe_id, list);
      }
    }
    for (const [k, list] of map) {
      list.sort((a, b) => parseFloat(a.label) - parseFloat(b.label));
      map.set(k, list);
    }
    return map;
  }, [sheets]);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)),
    [plans]
  );

  const filteredRecipes = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return recipes;
    return recipes.filter((r) => r.name.toLowerCase().includes(s));
  }, [recipes, search]);

  useEffect(() => {
    if (newOpen) {
      setShared((s) => ({ ...s, scheduled_time: `${date}T06:00` }));
    }
  }, [newOpen, date]);

  const openNew = () => {
    setRows({});
    setSearch('');
    setShared({
      scheduled_time: `${date}T06:00`,
      priority: 'normal',
      manager_name: '',
      operator_name: '',
      observations: '',
    });
    setNewOpen(true);
  };

  const openEdit = (plan: ProductionPlan) => {
    setEditForm({
      id: plan.id,
      recipe_id: plan.recipe_id,
      recipe_name: plan.recipe_name,
      quantity_total: plan.quantity_total?.toString() ?? '',
      quantity_unit: plan.quantity_unit,
      chariots: plan.chariots,
      scheduled_time: plan.scheduled_time.slice(0, 16),
      priority: plan.priority,
      manager_name: plan.manager_name ?? '',
      operator_name: plan.operator_name ?? '',
      observations: plan.observations ?? '',
    });
    setEditOpen(true);
  };

  const updateRow = (recipeId: string, patch: Partial<RowEntry>) => {
    setRows((prev) => {
      const current: RowEntry = prev[recipeId] ?? { quantity: '', unit: 'chariots' };
      return { ...prev, [recipeId]: { ...current, ...patch } };
    });
  };

  const submitBatch = async () => {
    const entries = Object.entries(rows)
      .map(([key, r]) => ({ key, qty: Number(r.quantity), unit: r.unit }))
      .filter((e) => e.qty > 0 && !Number.isNaN(e.qty));

    if (entries.length === 0) {
      toast.error('Renseigne au moins une quantité');
      return;
    }

    for (const e of entries) {
      const [recipeId, variantKey] = e.key.split('::');
      const recipe = recipes.find((r) => r.id === recipeId);
      if (!recipe) continue;
      let name = recipe.name;
      if (variantKey) {
        const v = variantsByRecipe.get(recipeId)?.find((vv) => vv.key === variantKey);
        if (v) name = `${recipe.name} — ${v.label}`;
      }
      await createPlan.mutateAsync({
        production_date: date,
        recipe_id: recipe.id,
        recipe_name: name,
        chariots: e.unit === 'chariots' ? e.qty : 1,
        quantity_total: e.qty,
        quantity_unit: e.unit,
        scheduled_time: new Date(shared.scheduled_time).toISOString(),
        priority: shared.priority,
        manager_name: shared.manager_name || null,
        operator_name: shared.operator_name || null,
        observations: shared.observations || null,
      } as Partial<ProductionPlan>);
    }
    setNewOpen(false);
  };

  const submitEdit = async () => {
    if (!editForm) return;
    const qty = editForm.quantity_total ? Number(editForm.quantity_total) : null;
    await updatePlan.mutateAsync({
      id: editForm.id,
      recipe_id: editForm.recipe_id,
      recipe_name: editForm.recipe_name,
      chariots: editForm.quantity_unit === 'chariots' && qty ? qty : editForm.chariots,
      quantity_total: qty,
      quantity_unit: editForm.quantity_unit,
      scheduled_time: new Date(editForm.scheduled_time).toISOString(),
      priority: editForm.priority,
      manager_name: editForm.manager_name || null,
      operator_name: editForm.operator_name || null,
      observations: editForm.observations || null,
    });
    setEditOpen(false);
  };

  const launch = async (plan: ProductionPlan) => {
    await launchPlan.mutateAsync(plan);
    navigate(`/production/journal/${plan.id}`);
  };

  const totalSelected = Object.values(rows).filter((r) => Number(r.quantity) > 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planning de production</h1>
          <p className="text-muted-foreground mt-1">Organisation de la fabrication du jour</p>
        </div>
        <Button size="lg" onClick={openNew} className="gap-2">
          <Plus className="h-5 w-5" /> Nouvelle production
        </Button>
      </div>

      <Card className="p-4 flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={() => setDate(addDaysIso(date, -1))}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <span className="font-semibold text-lg capitalize">
            {format(parseISO(date), 'EEEE d MMMM yyyy', { locale: fr })}
          </span>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={() => setDate(addDaysIso(date, 1))}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Heure</TableHead>
              <TableHead>Recette</TableHead>
              <TableHead>Quantité</TableHead>
              <TableHead>Priorité</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : sortedPlans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  Aucune production planifiée pour ce jour.
                </TableCell>
              </TableRow>
            ) : (
              sortedPlans.map((plan) => (
                <TableRow key={plan.id} className="text-base">
                  <TableCell className="font-mono font-semibold">
                    {format(parseISO(plan.scheduled_time), 'HH:mm')}
                  </TableCell>
                  <TableCell className="font-medium">{plan.recipe_name}</TableCell>
                  <TableCell>
                    {plan.quantity_total ?? '—'}{' '}
                    <span className="text-muted-foreground text-sm">
                      {unitLabels[plan.quantity_unit] ?? ''}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', priorityColors[plan.priority])}>
                      {priorityLabels[plan.priority]}
                    </span>
                  </TableCell>
                  <TableCell>{plan.manager_name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn('border', statusColors[plan.status])}>
                      {statusLabels[plan.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {plan.status === 'pending' ? (
                        <Button size="lg" onClick={() => launch(plan)} className="gap-2">
                          <Play className="h-4 w-4" /> Lancer
                        </Button>
                      ) : (
                        <Button
                          size="lg"
                          variant="secondary"
                          onClick={() => navigate(`/production/journal/${plan.id}`)}
                        >
                          Ouvrir la fiche
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => openEdit(plan)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Supprimer cette production ?')) deletePlan.mutate(plan.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* NEW BATCH DIALOG */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nouvelle production — saisie par produit</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Heure prévue *</Label>
              <Input
                type="datetime-local"
                value={shared.scheduled_time}
                onChange={(e) => setShared({ ...shared, scheduled_time: e.target.value })}
              />
            </div>
            <div>
              <Label>Priorité</Label>
              <Select
                value={shared.priority}
                onValueChange={(v) => setShared({ ...shared, priority: v as ProductionPriority })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(priorityLabels) as ProductionPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {priorityLabels[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsable</Label>
              <Input
                value={shared.manager_name}
                onChange={(e) => setShared({ ...shared, manager_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Opérateur</Label>
              <Input
                value={shared.operator_name}
                onChange={(e) => setShared({ ...shared, operator_name: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Observations</Label>
              <Textarea
                rows={2}
                value={shared.observations}
                onChange={(e) => setShared({ ...shared, observations: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label className="text-base">Produits à fabriquer</Label>
              <div className="relative w-64">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un produit…"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <ScrollArea className="h-[360px] rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead className="w-32">Quantité</TableHead>
                    <TableHead className="w-40">Unité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecipes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                        Aucun produit
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRecipes.map((r) => {
                      const row = rows[r.id] ?? { quantity: '', unit: 'chariots' as ProductionQuantityUnit };
                      const active = Number(row.quantity) > 0;
                      return (
                        <TableRow key={r.id} className={active ? 'bg-primary/5' : ''}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              step="1"
                              inputMode="numeric"
                              placeholder="0"
                              value={row.quantity}
                              onChange={(e) => updateRow(r.id, { quantity: e.target.value })}
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={row.unit}
                              onValueChange={(v) => updateRow(r.id, { unit: v as ProductionQuantityUnit })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="chariots">Chariots</SelectItem>
                                <SelectItem value="piece">Pièce</SelectItem>
                                <SelectItem value="run">Run</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          <DialogFooter className="items-center">
            <span className="text-sm text-muted-foreground mr-auto">
              {totalSelected} produit(s) sélectionné(s)
            </span>
            <Button variant="ghost" onClick={() => setNewOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submitBatch} disabled={totalSelected === 0 || createPlan.isPending}>
              Créer les productions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Modifier la production</DialogTitle>
          </DialogHeader>
          {editForm && (
            <div className="space-y-4">
              <div>
                <Label>Recette *</Label>
                <Select
                  value={editForm.recipe_id ?? ''}
                  onValueChange={(v) => {
                    const rec = recipes.find((r) => r.id === v);
                    setEditForm({ ...editForm, recipe_id: v, recipe_name: rec?.name ?? editForm.recipe_name });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une recette" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipes.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.quantity_total}
                    onChange={(e) => setEditForm({ ...editForm, quantity_total: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Unité</Label>
                  <Select
                    value={editForm.quantity_unit}
                    onValueChange={(v) => setEditForm({ ...editForm, quantity_unit: v as ProductionQuantityUnit })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chariots">Chariots</SelectItem>
                      <SelectItem value="piece">Pièce</SelectItem>
                      <SelectItem value="run">Run</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Heure prévue *</Label>
                  <Input
                    type="datetime-local"
                    value={editForm.scheduled_time}
                    onChange={(e) => setEditForm({ ...editForm, scheduled_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Priorité</Label>
                  <Select
                    value={editForm.priority}
                    onValueChange={(v) => setEditForm({ ...editForm, priority: v as ProductionPriority })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(priorityLabels) as ProductionPriority[]).map((p) => (
                        <SelectItem key={p} value={p}>
                          {priorityLabels[p]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Responsable</Label>
                  <Input
                    value={editForm.manager_name}
                    onChange={(e) => setEditForm({ ...editForm, manager_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Opérateur</Label>
                  <Input
                    value={editForm.operator_name}
                    onChange={(e) => setEditForm({ ...editForm, operator_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Observations</Label>
                <Textarea
                  rows={2}
                  value={editForm.observations}
                  onChange={(e) => setEditForm({ ...editForm, observations: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submitEdit} disabled={!editForm?.recipe_name}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
