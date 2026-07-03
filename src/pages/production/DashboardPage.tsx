import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProductionPlans } from '@/hooks/useProductionPlans';
import { CalendarClock, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const today = todayIso();
  const { data: plans = [] } = useProductionPlans(today);

  const stats = useMemo(() => {
    const now = Date.now();
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let late = 0;
    for (const p of plans) {
      if (p.status === 'pending') pending++;
      if (p.status === 'in_progress') inProgress++;
      if (p.status === 'completed') completed++;
      if (p.status === 'pending' && new Date(p.scheduled_time).getTime() < now) late++;
    }
    return { pending, inProgress, completed, late };
  }, [plans]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Tableau de bord — Production du jour</h1>
        <p className="text-muted-foreground mt-1">Suivi en temps réel</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Prévues" value={stats.pending} icon={CalendarClock} color="text-blue-600 bg-blue-100" />
        <StatCard label="En cours" value={stats.inProgress} icon={Loader2} color="text-orange-600 bg-orange-100" />
        <StatCard label="Terminées" value={stats.completed} icon={CheckCircle2} color="text-green-600 bg-green-100" />
        <StatCard label="En retard" value={stats.late} icon={AlertTriangle} color="text-red-600 bg-red-100" />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recette</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Heure prévue</TableHead>
              <TableHead>Heure réelle</TableHead>
              <TableHead>Retard</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Aucune production aujourd'hui.
                </TableCell>
              </TableRow>
            ) : (
              plans.map((p) => {
                const scheduled = new Date(p.scheduled_time);
                const started = p.started_at ? new Date(p.started_at) : null;
                const late =
                  p.status === 'pending' && scheduled.getTime() < Date.now()
                    ? Math.round((Date.now() - scheduled.getTime()) / 60000)
                    : null;
                const rowColor =
                  p.status === 'completed'
                    ? 'bg-green-50/60'
                    : p.status === 'in_progress'
                    ? 'bg-orange-50/60'
                    : late !== null
                    ? 'bg-red-50/60'
                    : '';
                return (
                  <TableRow
                    key={p.id}
                    className={cn('cursor-pointer', rowColor)}
                    onClick={() => navigate(`/production/journal/${p.id}`)}
                  >
                    <TableCell className="font-medium">{p.recipe_name}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'px-2 py-1 rounded text-xs font-semibold',
                          p.status === 'completed'
                            ? 'bg-green-200 text-green-800'
                            : p.status === 'in_progress'
                            ? 'bg-orange-200 text-orange-800'
                            : late !== null
                            ? 'bg-red-200 text-red-800'
                            : 'bg-slate-200 text-slate-700'
                        )}
                      >
                        {p.status === 'completed'
                          ? 'Terminée'
                          : p.status === 'in_progress'
                          ? 'En cours'
                          : late !== null
                          ? 'En retard'
                          : 'À faire'}
                      </span>
                    </TableCell>
                    <TableCell>{format(scheduled, 'HH:mm')}</TableCell>
                    <TableCell>{started ? format(started, 'HH:mm') : '—'}</TableCell>
                    <TableCell>
                      {late !== null ? <span className="text-red-700 font-semibold">+{late} min</span> : '—'}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={cn('p-3 rounded-xl', color)}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <div className="text-3xl font-bold">{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
      </div>
    </Card>
  );
}
