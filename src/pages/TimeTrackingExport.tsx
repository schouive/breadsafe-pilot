import { useMemo, useState } from 'react';
import { format, startOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Download, Users } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useEmployeesWithBadges, useTimeEntries, type TimeEntry } from '@/hooks/useTimeTracking';
import { toast } from 'sonner';

type DayStats = {
  date: string; // YYYY-MM-DD
  workMs: number;
  breakMs: number;
  firstIn?: Date;
  lastOut?: Date;
};

type EmployeeReport = {
  employeeId: string;
  employeeName: string;
  badgeId: string | null;
  days: DayStats[];
  totalWorkMs: number;
  totalBreakMs: number;
};

function msToHHMM(ms: number) {
  if (ms <= 0) return '00:00';
  const total = Math.round(ms / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function msToHoursDecimal(ms: number) {
  return Math.round((ms / 3600000) * 100) / 100;
}

function computeReport(
  employees: { id: string; full_name: string; badge_id: string | null }[],
  entries: TimeEntry[],
  fromDate: Date,
  toDate: Date,
): EmployeeReport[] {
  const days = eachDayOfInterval({ start: fromDate, end: toDate }).map((d) =>
    format(d, 'yyyy-MM-dd'),
  );

  return employees.map((emp) => {
    const empEntries = entries
      .filter((e) => e.employee_id === emp.id)
      .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime());

    const dayMap = new Map<string, DayStats>();
    for (const day of days) {
      dayMap.set(day, { date: day, workMs: 0, breakMs: 0 });
    }

    // Parcours chronologique global : une vacation est rattachée au jour de son
    // entrée, même si la sortie a lieu après minuit (postes de nuit).
    let totalWork = 0;
    let totalBreak = 0;

    let clockIn: Date | null = null;
    let breakStart: Date | null = null;
    let shiftDay: string | null = null;

    const addWork = (ms: number) => {
      if (ms <= 0 || ms > 24 * 3600000) return;
      const stats = shiftDay ? dayMap.get(shiftDay) : undefined;
      if (!stats) return;
      stats.workMs += ms;
      totalWork += ms;
    };
    const addBreak = (ms: number) => {
      if (ms <= 0 || ms > 24 * 3600000) return;
      const stats = shiftDay ? dayMap.get(shiftDay) : undefined;
      if (!stats) return;
      stats.breakMs += ms;
      totalBreak += ms;
    };

    for (const e of empEntries) {
      const t = parseISO(e.recorded_at);
      switch (e.event_type) {
        case 'clock_in': {
          if (!clockIn && !breakStart) {
            shiftDay = format(t, 'yyyy-MM-dd');
            const stats = dayMap.get(shiftDay);
            if (stats && !stats.firstIn) stats.firstIn = t;
          }
          clockIn = t;
          break;
        }
        case 'break_start':
          if (clockIn) {
            addWork(t.getTime() - clockIn.getTime());
            clockIn = null;
          }
          breakStart = t;
          break;
        case 'break_end':
          if (breakStart) {
            addBreak(t.getTime() - breakStart.getTime());
            breakStart = null;
          }
          clockIn = t;
          break;
        case 'clock_out': {
          if (clockIn) {
            addWork(t.getTime() - clockIn.getTime());
            clockIn = null;
          }
          breakStart = null;
          const stats = shiftDay ? dayMap.get(shiftDay) : undefined;
          if (stats) stats.lastOut = t;
          shiftDay = null;
          break;
        }
      }
    }


    return {
      employeeId: emp.id,
      employeeName: emp.full_name,
      badgeId: emp.badge_id,
      days: Array.from(dayMap.values()),
      totalWorkMs: totalWork,
      totalBreakMs: totalBreak,
    };
  });
}

export default function TimeTrackingExport() {
  const [fromDate, setFromDate] = useState<Date>(startOfMonth(new Date()));
  const [toDate, setToDate] = useState<Date>(endOfMonth(new Date()));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: employees = [], isLoading: loadingEmps } = useEmployeesWithBadges();

  const dateFromIso = useMemo(() => {
    const d = new Date(fromDate);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [fromDate]);

  const dateToIso = useMemo(() => {
    // +1 jour : permet de récupérer la sortie d'un poste de nuit démarré le dernier jour
    const d = new Date(toDate);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, [toDate]);


  const { data: entries = [], isLoading: loadingEntries } = useTimeEntries({
    dateFrom: dateFromIso,
    dateTo: dateToIso,
    limit: 10000,
  });

  const selectedEmployees = useMemo(
    () => employees.filter((e) => selectedIds.has(e.id)),
    [employees, selectedIds],
  );

  const report = useMemo(() => {
    if (selectedEmployees.length === 0) return [];
    return computeReport(selectedEmployees, entries, fromDate, toDate);
  }, [selectedEmployees, entries, fromDate, toDate]);

  const days = useMemo(
    () => eachDayOfInterval({ start: fromDate, end: toDate }),
    [fromDate, toDate],
  );

  const toggleAll = (checked: boolean) => {
    setSelectedIds(checked ? new Set(employees.map((e) => e.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const setQuickRange = (kind: 'week' | 'month' | 'prevMonth') => {
    const now = new Date();
    if (kind === 'week') {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      setFromDate(start);
      setToDate(now);
    } else if (kind === 'month') {
      setFromDate(startOfMonth(now));
      setToDate(endOfMonth(now));
    } else {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      setFromDate(startOfMonth(prev));
      setToDate(endOfMonth(prev));
    }
  };

  const exportXLSX = () => {
    if (report.length === 0) {
      toast.error('Sélectionnez au moins un salarié');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Sheet 1: Récapitulatif
    const summaryRows = [
      ['Salarié', 'Badge', 'Heures travaillées', 'H. décimales', 'Pauses'],
      ...report.map((r) => [
        r.employeeName,
        r.badgeId || '',
        msToHHMM(r.totalWorkMs),
        msToHoursDecimal(r.totalWorkMs),
        msToHHMM(r.totalBreakMs),
      ]),
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Récapitulatif');

    // Sheet 2: Détail jour par jour (entrée / sortie / total)
    const headerTop: string[] = ['Salarié'];
    const headerSub: string[] = [''];
    for (const d of days) {
      headerTop.push(format(d, 'dd/MM EEE', { locale: fr }), '', '');
      headerSub.push('Entrée', 'Sortie', 'Total');
    }
    headerTop.push('Total période');
    headerSub.push('');
    const matrix: (string | number)[][] = [headerTop, headerSub];
    for (const r of report) {
      const row: (string | number)[] = [r.employeeName];
      for (const day of r.days) {
        row.push(
          day.firstIn ? format(day.firstIn, 'HH:mm') : '',
          day.lastOut ? format(day.lastOut, 'HH:mm') : '',
          day.workMs > 0 ? msToHHMM(day.workMs) : '',
        );
      }
      row.push(msToHHMM(r.totalWorkMs));
      matrix.push(row);
    }
    const wsDetail = XLSX.utils.aoa_to_sheet(matrix);
    wsDetail['!merges'] = days.map((_, i) => ({
      s: { r: 0, c: 1 + i * 3 },
      e: { r: 0, c: 3 + i * 3 },
    }));
    wsDetail['!cols'] = [
      { wch: 28 },
      ...days.flatMap(() => [{ wch: 8 }, { wch: 8 }, { wch: 8 }]),
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Détail par jour');


    // Sheet 3: Lignes détaillées
    const detailRows = [
      ['Salarié', 'Date', 'Jour', 'Première entrée', 'Dernière sortie', 'Travail', 'Pauses'],
    ];
    for (const r of report) {
      for (const d of r.days) {
        if (d.workMs === 0 && !d.firstIn) continue;
        detailRows.push([
          r.employeeName,
          format(parseISO(d.date + 'T00:00:00'), 'dd/MM/yyyy'),
          format(parseISO(d.date + 'T00:00:00'), 'EEEE', { locale: fr }),
          d.firstIn ? format(d.firstIn, 'HH:mm') : '',
          d.lastOut ? format(d.lastOut, 'HH:mm') : '',
          msToHHMM(d.workMs),
          msToHHMM(d.breakMs),
        ]);
      }
    }
    const wsLines = XLSX.utils.aoa_to_sheet(detailRows);
    wsLines['!cols'] = [
      { wch: 28 },
      { wch: 12 },
      { wch: 12 },
      { wch: 16 },
      { wch: 16 },
      { wch: 10 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(wb, wsLines, 'Pointages');

    const filename = `pointage_${format(fromDate, 'yyyy-MM-dd')}_${format(toDate, 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Export généré');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Export du pointage</h1>
        <p className="text-sm text-muted-foreground">
          Choisissez une période et les salariés à exporter. Le décompte des heures travaillées par
          jour et le total sur la période sont calculés automatiquement.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Période */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Période</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Du</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal mt-1')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(fromDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fromDate}
                      onSelect={(d) => d && setFromDate(d)}
                      locale={fr}
                      weekStartsOn={1}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-xs">Au</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal mt-1')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(toDate, 'dd/MM/yyyy')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={toDate}
                      onSelect={(d) => d && setToDate(d)}
                      locale={fr}
                      weekStartsOn={1}
                      initialFocus
                      className={cn('p-3 pointer-events-auto')}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Separator />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setQuickRange('week')}>
                Cette semaine
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setQuickRange('month')}>
                Ce mois
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setQuickRange('prevMonth')}>
                Mois précédent
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Salariés */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Salariés ({selectedIds.size}/{employees.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggleAll(true)}>
                Tout sélectionner
              </Button>
              <Button size="sm" variant="ghost" onClick={() => toggleAll(false)}>
                Aucun
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-56 rounded border">
              <div className="p-2 grid sm:grid-cols-2 gap-1">
                {loadingEmps && (
                  <p className="text-sm text-muted-foreground p-2">Chargement…</p>
                )}
                {employees.map((emp) => (
                  <label
                    key={emp.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/60 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedIds.has(emp.id)}
                      onCheckedChange={(c) => toggleOne(emp.id, !!c)}
                    />
                    <span className="text-sm flex-1 truncate">{emp.full_name}</span>
                    {emp.badge_id && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {emp.badge_id}
                      </span>
                    )}
                  </label>
                ))}
                {!loadingEmps && employees.length === 0 && (
                  <p className="text-sm text-muted-foreground p-2 col-span-2">
                    Aucun salarié avec badge actif.
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Aperçu + Export */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">
            Aperçu — {format(fromDate, 'dd/MM/yyyy')} au {format(toDate, 'dd/MM/yyyy')}
          </CardTitle>
          <Button onClick={exportXLSX} disabled={report.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exporter Excel
          </Button>
        </CardHeader>
        <CardContent>
          {selectedIds.size === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Sélectionnez au moins un salarié pour voir l'aperçu.
            </p>
          ) : loadingEntries ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Calcul en cours…
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">
                      Salarié
                    </TableHead>
                    {days.map((d) => (
                      <TableHead key={d.toISOString()} className="text-center min-w-[100px]">
                        <div className="text-[10px] uppercase text-muted-foreground">
                          {format(d, 'EEE', { locale: fr })}
                        </div>
                        <div>{format(d, 'dd/MM')}</div>
                      </TableHead>
                    ))}
                    <TableHead className="text-right font-bold sticky right-0 bg-background min-w-[90px]">
                      Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.map((r) => (
                    <TableRow key={r.employeeId}>
                      <TableCell className="font-medium sticky left-0 bg-background z-10">
                        {r.employeeName}
                      </TableCell>
                      {r.days.map((d) => (
                        <TableCell key={d.date} className="text-center text-xs tabular-nums">
                          {d.workMs > 0 || d.firstIn ? (
                            <div className="leading-tight">
                              <div className="text-[10px] text-muted-foreground">
                                {d.firstIn ? format(d.firstIn, 'HH:mm') : '--:--'}
                                {' → '}
                                {d.lastOut ? format(d.lastOut, 'HH:mm') : '--:--'}
                              </div>
                              <div className="font-medium text-foreground">{msToHHMM(d.workMs)}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </TableCell>
                      ))}

                      <TableCell className="text-right font-bold tabular-nums sticky right-0 bg-background">
                        {msToHHMM(r.totalWorkMs)}
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
