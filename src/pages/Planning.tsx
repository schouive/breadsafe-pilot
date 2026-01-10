import { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CONTROL_POINTS } from '@/types/haccp';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ScheduledControl {
  id: string;
  controlPointCode: string;
  date: Date;
  time?: string;
  status: 'pending' | 'completed' | 'overdue';
  assignedTo: string;
}

// Generate mock scheduled controls
const generateSchedule = (): ScheduledControl[] => {
  const schedule: ScheduledControl[] = [];
  const today = new Date();
  
  // Daily controls
  for (let i = -2; i <= 5; i++) {
    const date = addDays(today, i);
    
    // CP6 and CP7 - daily storage checks
    schedule.push({
      id: `sch-${date.getTime()}-cp6`,
      controlPointCode: 'CP6_STOCKAGE_POSITIF',
      date,
      time: '08:00',
      status: i < 0 ? 'completed' : i === 0 ? 'pending' : 'pending',
      assignedTo: 'Assistant Qualité',
    });
    
    schedule.push({
      id: `sch-${date.getTime()}-cp7`,
      controlPointCode: 'CP7_STOCKAGE_NEGATIF',
      date,
      time: '08:00',
      status: i < 0 ? 'completed' : i === 0 ? 'pending' : 'pending',
      assignedTo: 'Assistant Qualité',
    });
  }

  // Reception controls (example dates)
  schedule.push({
    id: 'sch-reception-1',
    controlPointCode: 'CP1_TEMPERATURE_REFRIGERE',
    date: today,
    time: '10:30',
    status: 'completed',
    assignedTo: 'Marie D.',
  });

  schedule.push({
    id: 'sch-reception-2',
    controlPointCode: 'CP2_INTEGRITE',
    date: today,
    time: '10:30',
    status: 'completed',
    assignedTo: 'Marie D.',
  });

  schedule.push({
    id: 'sch-reception-3',
    controlPointCode: 'CP1_TEMPERATURE_REFRIGERE',
    date: addDays(today, 2),
    time: '14:00',
    status: 'pending',
    assignedTo: 'Jean P.',
  });

  // Overdue example
  schedule.push({
    id: 'sch-overdue',
    controlPointCode: 'CP8_DLC_PERIMEE',
    date: addDays(today, -1),
    status: 'overdue',
    assignedTo: 'Assistant Qualité',
  });

  return schedule;
};

const mockSchedule = generateSchedule();

const statusConfig = {
  pending: { icon: Clock, color: 'text-primary', bg: 'bg-primary/10' },
  completed: { icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
  overdue: { icon: AlertCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
};

export default function Planning() {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const getControlsForDay = (date: Date) => {
    return mockSchedule.filter(s => isSameDay(s.date, date));
  };

  const overdueCount = mockSchedule.filter(s => s.status === 'overdue').length;
  const todayControls = getControlsForDay(new Date());
  const pendingToday = todayControls.filter(c => c.status === 'pending').length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planning des Contrôles</h1>
          <p className="text-muted-foreground mt-1">
            Calendrier et suivi des contrôles programmés
          </p>
        </div>
        <div className="flex items-center gap-3">
          {overdueCount > 0 && (
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {overdueCount} en retard
            </Badge>
          )}
          <Badge variant="outline" className="text-sm px-3 py-1">
            {pendingToday} contrôle{pendingToday > 1 ? 's' : ''} restant{pendingToday > 1 ? 's' : ''} aujourd'hui
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
          {format(currentWeekStart, 'd MMMM', { locale: fr })} - {format(addDays(currentWeekStart, 6), 'd MMMM yyyy', { locale: fr })}
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
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const controls = getControlsForDay(day);
          const isCurrentDay = isToday(day);
          
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "bg-card rounded-xl border p-4 min-h-[200px]",
                isCurrentDay ? "border-primary ring-1 ring-primary/20" : "border-border"
              )}
            >
              {/* Day header */}
              <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">
                  {format(day, 'EEEE', { locale: fr })}
                </p>
                <p className={cn(
                  "text-xl font-bold mt-1",
                  isCurrentDay ? "text-primary" : "text-foreground"
                )}>
                  {format(day, 'd', { locale: fr })}
                </p>
              </div>

              {/* Controls for the day */}
              <div className="space-y-2">
                {controls.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center">
                    Aucun contrôle
                  </p>
                ) : (
                  controls.map((control) => {
                    const cp = CONTROL_POINTS.find(c => c.code === control.controlPointCode);
                    const statusCfg = statusConfig[control.status];
                    const StatusIcon = statusCfg.icon;
                    
                    return (
                      <div
                        key={control.id}
                        className={cn(
                          "rounded-lg p-2 text-xs",
                          statusCfg.bg
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <StatusIcon className={cn("h-3.5 w-3.5 mt-0.5 flex-shrink-0", statusCfg.color)} />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {cp?.name.replace('CP', '').split('-')[0].trim() || control.controlPointCode}
                            </p>
                            {control.time && (
                              <p className="text-muted-foreground mt-0.5">
                                {control.time}
                              </p>
                            )}
                          </div>
                        </div>
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
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-primary/10 ring-1 ring-primary/30" />
          <span className="text-muted-foreground">En attente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-success/10 ring-1 ring-success/30" />
          <span className="text-muted-foreground">Réalisé</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-destructive/10 ring-1 ring-destructive/30" />
          <span className="text-muted-foreground">En retard</span>
        </div>
      </div>
    </div>
  );
}
