import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/hooks/useAuth';
import { useTimeEntries } from '@/hooks/useTimeTracking';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Clock, Calendar, Camera, X } from 'lucide-react';
import { useState } from 'react';

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

export default function TimeTrackingHistory() {
  const { user } = useAuth();
  const now = new Date();
  const { data: entries = [], isLoading } = useTimeEntries({
    employeeId: user?.id,
    dateFrom: startOfMonth(now).toISOString(),
    dateTo: endOfMonth(now).toISOString(),
  });

  // Group by day
  const groupedByDay = useMemo(() => {
    const groups = new Map<string, typeof entries>();
    for (const e of entries) {
      const day = format(new Date(e.recorded_at), 'yyyy-MM-dd');
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(e);
    }
    return [...groups.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Mon historique de pointage</h1>
        <p className="text-sm text-muted-foreground">
          {format(now, 'MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-center py-8">Chargement...</p>
      ) : groupedByDay.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Aucun pointage ce mois-ci</p>
          </CardContent>
        </Card>
      ) : (
        groupedByDay.map(([day, dayEntries]) => (
          <Card key={day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {format(new Date(day), 'EEEE d MMMM', { locale: fr })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Heure</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayEntries
                    .sort((a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime())
                    .map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-mono tabular-nums">
                          {format(new Date(entry.recorded_at), 'HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Badge variant={EVENT_BADGE_VARIANT[entry.event_type] || 'outline'}>
                            {EVENT_LABELS[entry.event_type] || entry.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {entry.is_manual_correction && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300">
                              Correction
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
