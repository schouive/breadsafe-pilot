import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Play, Plus, Trash2, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  useCreateProductionPlan,
  useDeleteProductionPlan,
  useLaunchProductionPlan,
  useProductionPlans,
  useUpdateProductionPlan,
  type ProductionPlan,
  type ProductionPriority,
} from '@/hooks/useProductionPlans';
import { useActiveRecipes } from '@/hooks/useRecipes';
import { cn } from '@/lib/utils';

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

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(iso: string, delta: number) {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return d.toISOString().slice(0, 10);
}

interface FormState {
  id?: string;
  recipe_id: string | null;
  recipe_name: string;
  chariots: number;
  quantity_total: string;
  scheduled_time: string;
  priority: ProductionPriority;
  manager_name: string;
  operator_name: string;
  observations: string;
}

const emptyForm = (date: string): FormState => ({
  recipe_id: null,
  recipe_name: '',
  chariots: 1,
  quantity_total: '',
  scheduled_time: `${date}T06:00`,
  priority: 'normal',
  manager_name: '',
  operator_name: '',
  observations: '',
});

export default function PlanningPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState(todayIso());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(date));

  const { data: plans = [], isLoading } = useProductionPlans(date);
  const { data: recipes = [] } = useActiveRecipes();
  const createPlan = useCreateProductionPlan();
  const updatePlan = useUpdateProductionPlan();
  const deletePlan = useDeleteProductionPlan();
  const launchPlan = useLaunchProductionPlan();

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time)),
    [plans]
  );

  const openNew = () => {
    setForm(emptyForm(date));
    setDialogOpen(true);
  };

  const openEdit = (plan: ProductionPlan) => {
    setForm({
      id: plan.id,
      recipe_id: plan.recipe_id,
      recipe_name: plan.recipe_name,
      chariots: plan.chariots,
      quantity_total: plan.quantity_total?.toString() ?? '',
      scheduled_time: plan.scheduled_time.slice(0, 16),
      priority: plan.priority,
      manager_name: plan.manager_name ?? '',
      operator_name: plan.operator_name ?? '',
      observations: plan.observations ?? '',
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.recipe_name) return;
    const payload = {
      production_date: date,
      recipe_id: form.recipe_id,
      recipe_name: form.recipe_name,
      chariots: form.chariots,
      quantity_total: form.quantity_total ? Number(form.quantity_total) : null,
      scheduled_time: new Date(form.scheduled_time).toISOString(),
      priority: form.priority,
      manager_name: form.manager_name || null,
      operator_name: form.operator_name || null,
      observations: form.observations || null,
    };
    if (form.id) {
      await updatePlan.mutateAsync({ id: form.id, ...payload });
    } else {
      await createPlan.mutateAsync(payload);
    }
    setDialogOpen(false);
  };

  const launch = async (plan: ProductionPlan) => {
    await launchPlan.mutateAsync(plan);
    navigate(`/production/journal/${plan.id}`);
  };

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
              <TableHead>Chariots</TableHead>
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
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            ) : sortedPlans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
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
                  <TableCell>{plan.chariots}</TableCell>
                  <TableCell>{plan.quantity_total ?? '—'}</TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Modifier la production' : 'Nouvelle production'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Recette *</Label>
              <Select
                value={form.recipe_id ?? ''}
                onValueChange={(v) => {
                  const rec = recipes.find((r) => r.id === v);
                  setForm({ ...form, recipe_id: v, recipe_name: rec?.name ?? '' });
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
                <Label>Chariots *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.chariots}
                  onChange={(e) => setForm({ ...form, chariots: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Quantité totale</Label>
                <Input
                  type="number"
                  value={form.quantity_total}
                  onChange={(e) => setForm({ ...form, quantity_total: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Heure prévue *</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_time}
                  onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })}
                />
              </div>
              <div>
                <Label>Priorité</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as ProductionPriority })}
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
                  value={form.manager_name}
                  onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
                />
              </div>
              <div>
                <Label>Opérateur</Label>
                <Input
                  value={form.operator_name}
                  onChange={(e) => setForm({ ...form, operator_name: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Observations</Label>
              <Textarea
                rows={2}
                value={form.observations}
                onChange={(e) => setForm({ ...form, observations: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={submit} disabled={!form.recipe_name}>
              {form.id ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
