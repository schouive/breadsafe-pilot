import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, XCircle, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, addDays, startOfWeek, isToday, isBefore, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { usePlanningData, type DayControlStatus } from '@/hooks/usePlanningData';
import { Skeleton } from '@/components/ui/skeleton';

const statusConfig: Record<DayControlStatus['status'], { icon: typeof CheckCircle2; className: string; bg: string }> = {
  done_conforme: {
    icon: CheckCircle2,
    className: 'text-[hsl(var(--status-conforme))]',
    bg: 'bg-[hsl(var(--status-conforme-light))]',
  },
  done_acceptable: {
    icon: AlertTriangle,
    className: 'text-[hsl(var(--status-acceptable))]',
    bg: 'bg-[hsl(var(--status-acceptable-light))]',
  },
  done_nonconforme: {
    icon: XCircle,
    className: 'text-[hsl(var(--status-nonconforme))]',
    bg: 'bg-[hsl(var(--status-nonconforme-light))]',
  },
  overdue: {
    icon: AlertTriangle,
    className: 'text-[hsl(var(--status-nonconforme))]',
    bg: 'bg-[hsl(var(--status-nonconforme-light))] ring-1 ring-[hsl(var(--status-nonconforme)/0.4)]',
  },
  pending: {
    icon: Clock,
    className: 'text-primary',
    bg: 'bg-primary/10',
  },
  not_required: {
    icon: Minus,
    className: 'text-muted-foreground',
    bg: 'bg-muted/50',
  },
};

export default function Planning() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const { getControlsForDay, isLoading } = usePlanningData(currentWeekStart);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  // Compute summary stats for the week
  const allControls = weekDays.flatMap(d => getControlsForDay(d));
  const overdueCount = allControls.filter(c => c.status === 'overdue').length;
  const todayControls = getControlsForDay(new Date());
  const pendingToday = todayControls.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planning des Contrôles</h1>
          <p className="text-muted-foreground mt-1">
            Calendrier et suivi des contrôles HACCP
          </p>
        </div>
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1 pulse-alert">
              {overdueCount} en retard
            </Badge>
          )}
          <Badge variant="outline" className="text-sm px-3 py-1">
            {pendingToday} restant{pendingToday > 1 ? 's' : ''} aujourd'hui
          </Badge>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <h2 className="text-lg font-semibold">
          {format(currentWeekStart, 'd MMMM', { locale: fr })} – {format(addDays(currentWeekStart, 6), 'd MMMM yyyy', { locale: fr })}
        </h2>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const controls = getControlsForDay(day);
          const isCurrentDay = isToday(day);
          const isPast = isBefore(startOfDay(day), startOfDay(new Date()));

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'bg-card rounded-xl border p-3 min-h-[220px] transition-shadow',
                isCurrentDay ? 'border-primary ring-1 ring-primary/20 shadow-md' : 'border-border',
                isPast && !isCurrentDay && 'opacity-80'
              )}
            >
              {/* Day header */}
              <div className="text-center mb-3 pb-2 border-b border-border">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {format(day, 'EEE', { locale: fr })}
                </p>
                <p className={cn(
                  'text-xl font-bold mt-0.5',
                  isCurrentDay ? 'text-primary' : 'text-foreground'
                )}>
                  {format(day, 'd', { locale: fr })}
                </p>
              </div>

              {/* Controls list */}
              <div className="space-y-1.5">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-7 w-full rounded-md" />
                  ))
                ) : (
                  controls
                    .filter(c => c.status !== 'not_required')
                    .map((control) => {
                      const cfg = statusConfig[control.status];
                      const Icon = cfg.icon;

                      return (
                        <div
                          key={control.code}
                          className={cn('rounded-md px-2 py-1.5 text-xs flex items-center gap-1.5', cfg.bg)}
                        >
                          <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', cfg.className)} />
                          <span className="truncate font-medium">
                            {control.label}
                          </span>
                          {control.count! > 0 && (
                            <span className="ml-auto text-[10px] font-semibold opacity-70">
                              ×{control.count}
                            </span>
                          )}
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-5 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[hsl(var(--status-conforme))]" />
          <span className="text-muted-foreground">Conforme</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[hsl(var(--status-acceptable))]" />
          <span className="text-muted-foreground">Acceptable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[hsl(var(--status-nonconforme))]" />
          <span className="text-muted-foreground">Non conforme</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-[hsl(var(--status-nonconforme))] ring-2 ring-[hsl(var(--status-nonconforme)/0.4)] ring-offset-1" />
          <span className="text-muted-foreground">En retard</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary/30" />
          <span className="text-muted-foreground">En attente</span>
        </div>
      </div>
    </div>
  );
}
