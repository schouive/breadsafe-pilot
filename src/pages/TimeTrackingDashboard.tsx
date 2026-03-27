import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTimeEntries, useEmployeesWithBadges, TimeEventType } from '@/hooks/useTimeTracking';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Users, Clock, Download, AlertTriangle, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const EVENT_LABELS: Record<string, string> = {
  clock_in: 'Entrée',
  clock_out: 'Sortie',
  break_start: 'Début pause',
  break_end: 'Fin pause',
};

const EVENT_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  clock_in: 'default',
  clock_out: 'destructive',
  break_start: 'secondary',
  break_end: 'outline',
};

type PeriodFilter = 'today' | 'week' | 'month';

function getDateRange(period: PeriodFilter) {
  const now = new Date();
  switch (period) {
    case 'today':
      return {
        from: format(now, 'yyyy-MM-dd') + 'T00:00:00Z',
        to: format(now, 'yyyy-MM-dd') + 'T23:59:59Z',
      };
    case 'week':
      return {
        from: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
        to: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
      };
    case 'month':
      return {
        from: startOfMonth(now).toISOString(),
        to: endOfMonth(now).toISOString(),
      };
  }
}

function computeEmployeeStats(entries: { event_type: string; recorded_at: string; employee_id: string }[]) {
  const byEmployee = new Map<string, typeof entries>();
  for (const e of entries) {
    if (!byEmployee.has(e.employee_id)) byEmployee.set(e.employee_id, []);
    byEmployee.get(e.employee_id)!.push(e);
  }

  const stats: Record<string, { totalMinutes: number; breakMinutes: number; daysWorked: Set<string> }> = {};

  byEmployee.forEach((empEntries, empId) => {
    const sorted = [...empEntries].sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());
    let totalMin = 0;
    let breakMin = 0;
    let clockIn: Date | null = null;
    let breakStart: Date | null = null;
    const days = new Set<string>();

    for (const entry of sorted) {
      const t = new Date(entry.recorded_at);
      days.add(format(t, 'yyyy-MM-dd'));

      switch (entry.event_type) {
        case 'clock_in':
          clockIn = t;
          break;
        case 'break_start':
          if (clockIn) { totalMin += differenceInMinutes(t, clockIn); clockIn = null; }
          breakStart = t;
          break;
        case 'break_end':
          if (breakStart) { breakMin += differenceInMinutes(t, breakStart); breakStart = null; }
          clockIn = t;
          break;
        case 'clock_out':
          if (clockIn) { totalMin += differenceInMinutes(t, clockIn); clockIn = null; }
          break;
      }
    }

    stats[empId] = { totalMinutes: totalMin, breakMinutes: breakMin, daysWorked: days };
  });

  return stats;
}

export default function TimeTrackingDashboard() {
  const [period, setPeriod] = useState<PeriodFilter>('today');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  const { from, to } = getDateRange(period);
  const { data: entries = [], isLoading } = useTimeEntries({ dateFrom: from, dateTo: to });
  const { data: employees = [] } = useEmployeesWithBadges();

  const filteredEntries = useMemo(() => {
    if (selectedEmployee === 'all') return entries;
    return entries.filter((e) => e.employee_id === selectedEmployee);
  }, [entries, selectedEmployee]);

  const stats = useMemo(() => computeEmployeeStats(entries), [entries]);

  const totalPresent = useMemo(() => {
    const latest = new Map<string, string>();
    for (const e of entries) {
      const existing = latest.get(e.employee_id);
      if (!existing || new Date(e.recorded_at) > new Date(existing)) {
        latest.set(e.employee_id, e.event_type);
      }
    }
    return [...latest.values()].filter((t) => t === 'clock_in' || t === 'break_end' || t === 'break_start').length;
  }, [entries]);

  const exportCSV = () => {
    const rows = [['Employé', 'Type', 'Date/Heure', 'Badge', 'Correction'].join(';')];
    for (const e of filteredEntries) {
      rows.push([
        e.employee_name || '',
        EVENT_LABELS[e.event_type] || e.event_type,
        format(new Date(e.recorded_at), 'dd/MM/yyyy HH:mm:ss'),
        e.badge_id,
        e.is_manual_correction ? 'Oui' : 'Non',
      ].join(';'));
    }
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pointage_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export CSV téléchargé');
  };

  const getInitials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord Pointage</h1>
          <p className="text-sm text-muted-foreground">Suivi des heures de travail</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Aujourd'hui</SelectItem>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalPresent}</p>
                <p className="text-xs text-muted-foreground">Présents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{entries.length}</p>
                <p className="text-xs text-muted-foreground">Événements</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{employees.length}</p>
                <p className="text-xs text-muted-foreground">Badges actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">
                  {entries.filter((e) => e.is_manual_correction).length}
                </p>
                <p className="text-xs text-muted-foreground">Corrections</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Summary */}
      {period !== 'today' && Object.keys(stats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Résumé par employé</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employé</TableHead>
                  <TableHead>Heures travaillées</TableHead>
                  <TableHead>Pause (min)</TableHead>
                  <TableHead>Jours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(stats).map(([empId, s]) => {
                  const emp = entries.find((e) => e.employee_id === empId);
                  return (
                    <TableRow key={empId}>
                      <TableCell className="font-medium">{emp?.employee_name || 'Inconnu'}</TableCell>
                      <TableCell>{(s.totalMinutes / 60).toFixed(1)}h</TableCell>
                      <TableCell>{s.breakMinutes} min</TableCell>
                      <TableCell>{s.daysWorked.size}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Filter by employee */}
      <div className="flex items-center gap-2">
        <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Tous les employés" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les employés</SelectItem>
            {employees.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Events Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des événements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Chargement...</p>
          ) : filteredEntries.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun événement pour cette période</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employé</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Badge</TableHead>
                    <TableHead>Correction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.slice(0, 100).map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.employee_photo || ''} />
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {getInitials(entry.employee_name || '??')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{entry.employee_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={EVENT_BADGE_VARIANT[entry.event_type] || 'outline'}>
                          {EVENT_LABELS[entry.event_type] || entry.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {format(new Date(entry.recorded_at), 'dd/MM/yyyy HH:mm:ss')}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{entry.badge_id}</TableCell>
                      <TableCell>
                        {entry.is_manual_correction && (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            Corrigé
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
