import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  useProductionJournalByPlan,
  useUpdateProductionJournal,
  type ProductionJournal,
} from '@/hooks/useProductionJournals';
import { useUpdateProductionPlan, type ProductionPlan } from '@/hooks/useProductionPlans';
import { computeAlerts, computeMetrics, formatDuration } from '@/lib/productionMetrics';
import { cn } from '@/lib/utils';

const STEPS: { key: keyof ProductionJournal; label: string }[] = [
  { key: 'kneading_start', label: 'Début du pétrissage' },
  { key: 'kneading_end', label: 'Fin du pétrissage' },
  { key: 'shaping_start', label: 'Début façonnage' },
  { key: 'line_start', label: 'Début de ligne' },
  { key: 'proofing_start', label: 'Mise en pousse' },
  { key: 'proofing_end', label: 'Sortie de pousse' },
  { key: 'oven_in', label: 'Enfournement' },
  { key: 'oven_out', label: 'Sortie du four' },
  { key: 'production_end', label: 'Fin de production' },
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
  const { data: journal, isLoading } = useProductionJournalByPlan(planId);
  const updateJournal = useUpdateProductionJournal();
  const updatePlan = useUpdateProductionPlan();

  const [comments, setComments] = useState('');
  const [doughTemp, setDoughTemp] = useState<string>('');

  useEffect(() => {
    if (journal) {
      setComments(journal.comments ?? '');
      setDoughTemp(journal.dough_temperature?.toString() ?? '');
    }
  }, [journal]);

  if (isLoading || !journal) {
    return (
      <div className="p-8 text-center text-muted-foreground">Chargement de la fiche…</div>
    );
  }

  const stamp = async (key: keyof ProductionJournal) => {
    await updateJournal.mutateAsync({ id: journal.id, [key]: new Date().toISOString() } as any);
  };

  const setTime = async (key: keyof ProductionJournal, local: string) => {
    const iso = local ? new Date(local).toISOString() : null;
    await updateJournal.mutateAsync({ id: journal.id, [key]: iso } as any);
  };

  const saveDoughTemp = async () => {
    const v = doughTemp === '' ? null : Number(doughTemp);
    await updateJournal.mutateAsync({ id: journal.id, dough_temperature: v } as any);
  };

  const saveComments = async () => {
    await updateJournal.mutateAsync({ id: journal.id, comments } as any);
  };

  const finish = async () => {
    if (!journal.production_end) {
      await updateJournal.mutateAsync({
        id: journal.id,
        production_end: new Date().toISOString(),
      } as any);
    }
    if (plan) {
      await updatePlan.mutateAsync({
        id: plan.id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }
    navigate('/production');
  };

  const metrics = computeMetrics(journal);
  const alerts = computeAlerts(journal, {
    scheduledTime: plan?.scheduled_time,
    status: plan?.status,
  });

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/production')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{journal.recipe_name}</h1>
          <p className="text-muted-foreground">
            {plan &&
              `${format(parseISO(plan.production_date), 'EEEE d MMMM yyyy', { locale: fr })} — ${journal.chariots ?? plan.chariots} chariot(s)`}
          </p>
        </div>
      </div>

      {alerts.length > 0 && (
        <Card className="p-4 border-red-300 bg-red-50">
          <div className="flex items-center gap-2 font-semibold text-red-700 mb-2">
            <AlertTriangle className="h-5 w-5" /> Alertes
          </div>
          <ul className="list-disc pl-6 text-red-700 space-y-1">
            {alerts.map((a) => (
              <li key={a.code}>{a.message}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground">Responsable</div>
          <div className="font-medium">{journal.manager_name ?? '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Opérateur</div>
          <div className="font-medium">{journal.operator_name ?? '—'}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Chariots</div>
          <div className="font-medium">{journal.chariots ?? '—'}</div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Étapes</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STEPS.map((step) => {
            const value = journal[step.key] as string | null;
            return (
              <div
                key={step.key as string}
                className={cn(
                  'rounded-lg border p-3 flex flex-col gap-2',
                  value ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{step.label}</span>
                  {value ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                {value ? (
                  <Input
                    type="datetime-local"
                    value={toLocalInput(value)}
                    onChange={(e) => setTime(step.key, e.target.value)}
                  />
                ) : (
                  <Button size="lg" className="w-full h-14 text-base" onClick={() => stamp(step.key)}>
                    Enregistrer maintenant
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Température de pâte</h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1 max-w-xs">
            <Label>Température (°C)</Label>
            <Input
              type="number"
              step="0.1"
              value={doughTemp}
              onChange={(e) => setDoughTemp(e.target.value)}
              onBlur={saveDoughTemp}
            />
          </div>
          <Button variant="secondary" onClick={saveDoughTemp}>
            Enregistrer
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-4">Indicateurs</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Metric label="Pétrissage" value={formatDuration(metrics.kneading)} />
          <Metric label="Fin pétrissage → Ligne" value={formatDuration(metrics.kneadingToLine)} />
          <Metric label="Pousse" value={formatDuration(metrics.proofing)} />
          <Metric label="Cuisson" value={formatDuration(metrics.baking)} />
          <Metric label="Total" value={formatDuration(metrics.total)} highlight />
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-3">Commentaires</h2>
        <Textarea
          rows={4}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          onBlur={saveComments}
          placeholder="Observations sur cette production…"
        />
      </Card>

      <div className="flex justify-end">
        <Button size="lg" onClick={finish} className="h-14 px-8 text-base">
          Terminer la production
        </Button>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border p-3 text-center',
        highlight ? 'bg-primary/10 border-primary/30' : 'bg-muted/40'
      )}
    >
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
