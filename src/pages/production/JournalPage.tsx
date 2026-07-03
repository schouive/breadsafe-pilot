import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  useProductionJournalByPlan,
  useUpdateProductionJournal,
} from '@/hooks/useProductionJournals';
import { useUpdateProductionPlan, type ProductionPlan } from '@/hooks/useProductionPlans';
import {
  useProductionBatches,
  useCreateProductionBatch,
  useUpdateProductionBatch,
  useDeleteProductionBatch,
  type ProductionBatch,
} from '@/hooks/useProductionBatches';
import {
  useBatchShapings,
  useCompatibleSheets,
  useUpsertBatchShaping,
} from '@/hooks/useProductionBatchShapings';
import { computeAlerts, computeMetrics, formatDuration } from '@/lib/productionMetrics';
import { cn } from '@/lib/utils';


const STEPS: { key: keyof ProductionBatch; label: string }[] = [
  { key: 'kneading_start', label: 'Début pétrissage' },
  { key: 'kneading_end', label: 'Fin pétrissage' },
  { key: 'shaping_start', label: 'Début façonnage' },
  { key: 'line_start', label: 'Début de ligne' },
  { key: 'proofing_start', label: 'Mise en pousse' },
  { key: 'proofing_end', label: 'Sortie de pousse' },
  { key: 'oven_in', label: 'Enfournement' },
  { key: 'oven_out', label: 'Sortie du four' },
  { key: 'production_end', label: 'Fin' },
];

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function usePlan(planId: string | undefined) {
  return useQuery({
    queryKey: ['production_plans', 'one', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('production_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle();
      if (error) throw error;
      return data as ProductionPlan | null;
    },
  });
}

export default function JournalPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { data: plan } = usePlan(planId);
  const { data: journal } = useProductionJournalByPlan(planId);
  const { data: batches = [], isLoading } = useProductionBatches(planId);
  const updateJournal = useUpdateProductionJournal();
  const updatePlan = useUpdateProductionPlan();
  const createBatch = useCreateProductionBatch();

  const [comments, setComments] = useState('');

  useEffect(() => {
    if (journal) setComments(journal.comments ?? '');
  }, [journal]);

  const saveComments = async () => {
    if (journal) await updateJournal.mutateAsync({ id: journal.id, comments } as any);
  };

  const finish = async () => {
    if (plan) {
      await updatePlan.mutateAsync({
        id: plan.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }
    navigate('/production');
  };

  const addBatch = () => {
    if (!planId) return;
    createBatch.mutate({ planId });
  };

  const totalChariots = batches.reduce((s, b) => s + (b.chariots ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/production')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{plan?.recipe_name ?? journal?.recipe_name}</h1>
          <p className="text-muted-foreground">
            {plan &&
              `${format(parseISO(plan.production_date), 'EEEE d MMMM yyyy', { locale: fr })} — objectif : ${plan.chariots} chariot(s)`}
          </p>
        </div>
      </div>

      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground">Responsable</div>
          <div className="font-medium">{plan?.manager_name ?? '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Opérateur</div>
          <div className="font-medium">{plan?.operator_name ?? '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Pétrins</div>
          <div className="font-medium">{batches.length}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Chariots produits</div>
          <div className="font-medium">
            {totalChariots} / {plan?.chariots ?? '?'}
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pétrins</h2>
        <Button size="lg" onClick={addBatch} className="gap-2">
          <Plus className="h-5 w-5" /> Nouveau pétrin
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Chargement…</div>
      ) : batches.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          Aucun pétrin lancé. Cliquez sur <strong>Nouveau pétrin</strong> pour démarrer le premier.
        </Card>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <BatchCard
              key={batch.id}
              batch={batch}
              scheduledTime={plan?.scheduled_time}
              status={plan?.status}
              recipeId={plan?.recipe_id ?? undefined}
            />
          ))}

        </div>
      )}

      {journal && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-3">Commentaires généraux</h2>
          <Textarea
            rows={3}
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            onBlur={saveComments}
            placeholder="Observations sur l'ensemble de la production…"
          />
        </Card>
      )}

      <div className="flex justify-end">
        <Button size="lg" onClick={finish} className="h-14 px-8 text-base">
          Terminer la production
        </Button>
      </div>
    </div>
  );
}

function BatchCard({
  batch,
  scheduledTime,
  status,
  recipeId,
}: {
  batch: ProductionBatch;
  scheduledTime?: string | null;
  status?: string;
  recipeId?: string;
}) {

  const [open, setOpen] = useState(true);
  const [chariots, setChariots] = useState(batch.chariots?.toString() ?? '');
  const [doughTemp, setDoughTemp] = useState(batch.dough_temperature?.toString() ?? '');
  const [comments, setComments] = useState(batch.comments ?? '');

  const update = useUpdateProductionBatch();
  const remove = useDeleteProductionBatch();

  useEffect(() => {
    setChariots(batch.chariots?.toString() ?? '');
    setDoughTemp(batch.dough_temperature?.toString() ?? '');
    setComments(batch.comments ?? '');
  }, [batch.id]);

  const stamp = (key: keyof ProductionBatch) => {
    update.mutate({ id: batch.id, [key]: new Date().toISOString() } as any);
  };
  const setTime = (key: keyof ProductionBatch, local: string) => {
    const iso = local ? new Date(local).toISOString() : null;
    update.mutate({ id: batch.id, [key]: iso } as any);
  };

  const metrics = computeMetrics(batch);
  const alerts = computeAlerts(batch, { scheduledTime, status });
  const isDone = !!batch.production_end;

  return (
    <Card className={cn('overflow-hidden', isDone && 'border-green-300')}>
      <button
        className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
          <span className="text-lg font-bold">Pétrin {batch.batch_number}</span>
          {batch.chariots != null && (
            <Badge variant="outline">{batch.chariots} chariot(s)</Badge>
          )}
          {batch.dough_temperature != null && (
            <Badge variant="outline">{batch.dough_temperature}°C</Badge>
          )}
          {isDone ? (
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Terminé</Badge>
          ) : batch.kneading_start ? (
            <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">En cours</Badge>
          ) : null}
          {alerts.length > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" /> {alerts.length}
            </Badge>
          )}
        </div>
        <span
          role="button"
          tabIndex={0}
          className="p-2 rounded hover:bg-red-100 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Supprimer le pétrin ${batch.batch_number} ?`)) {
              remove.mutate({ id: batch.id, planId: batch.plan_id });
            }
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </span>
      </button>

      {open && (
        <div className="p-4 border-t space-y-4">
          {alerts.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3">
              <div className="flex items-center gap-2 font-semibold text-red-700 mb-1">
                <AlertTriangle className="h-4 w-4" /> Alertes
              </div>
              <ul className="list-disc pl-6 text-red-700 text-sm space-y-0.5">
                {alerts.map((a) => (
                  <li key={a.code}>{a.message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Chariots</Label>
              <Input
                type="number"
                value={chariots}
                onChange={(e) => setChariots(e.target.value)}
                onBlur={() =>
                  update.mutate({
                    id: batch.id,
                    chariots: chariots === '' ? null : Number(chariots),
                  } as any)
                }
              />
            </div>
            <div>
              <Label>Température de pâte (°C)</Label>
              <Input
                type="number"
                step="0.1"
                value={doughTemp}
                onChange={(e) => setDoughTemp(e.target.value)}
                onBlur={() =>
                  update.mutate({
                    id: batch.id,
                    dough_temperature: doughTemp === '' ? null : Number(doughTemp),
                  } as any)
                }
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Étapes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {STEPS.map((step) => {
                const value = batch[step.key] as string | null;
                return (
                  <div
                    key={step.key as string}
                    className={cn(
                      'rounded-lg border p-2 flex items-center gap-2',
                      value ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{step.label}</div>
                      {value ? (
                        <Input
                          type="datetime-local"
                          className="h-8 text-xs mt-1"
                          value={toLocalInput(value)}
                          onChange={(e) => setTime(step.key, e.target.value)}
                        />
                      ) : null}
                    </div>
                    {value ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                    ) : (
                      <Button size="sm" onClick={() => stamp(step.key)}>
                        <Clock className="h-4 w-4 mr-1" /> Maintenant
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Indicateurs</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Metric label="Pétrissage" value={formatDuration(metrics.kneading)} />
              <Metric label="Fin pétr. → Ligne" value={formatDuration(metrics.kneadingToLine)} />
              <Metric label="Pousse" value={formatDuration(metrics.proofing)} />
              <Metric label="Cuisson" value={formatDuration(metrics.baking)} />
              <Metric label="Total" value={formatDuration(metrics.total)} highlight />
            </div>
          </div>

          <div>
            <Label>Commentaires du pétrin</Label>
            <Textarea
              rows={2}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              onBlur={() => update.mutate({ id: batch.id, comments } as any)}
            />
          </div>
        </div>
      )}
    </Card>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border p-2 text-center',
        highlight ? 'bg-primary/10 border-primary/30' : 'bg-muted/40'
      )}
    >
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-base font-semibold mt-0.5">{value}</div>
    </div>
  );
}
