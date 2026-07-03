import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useProductionPlans } from '@/hooks/useProductionPlans';
import { useProductionJournals } from '@/hooks/useProductionJournals';
import { computeMetrics, formatDuration } from '@/lib/productionMetrics';

function formatDT(iso: string | null | undefined) {
  if (!iso) return '';
  return format(parseISO(iso), 'dd/MM/yyyy HH:mm');
}

export default function HistoryPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recipeFilter, setRecipeFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');

  const { data: plans = [] } = useProductionPlans();
  const { data: journals = [] } = useProductionJournals();

  const journalByPlan = useMemo(() => {
    const m = new Map<string, (typeof journals)[number]>();
    for (const j of journals) m.set(j.plan_id, j);
    return m;
  }, [journals]);

  const rows = useMemo(() => {
    return plans
      .filter((p) => {
        if (dateFrom && p.production_date < dateFrom) return false;
        if (dateTo && p.production_date > dateTo) return false;
        if (recipeFilter && !p.recipe_name.toLowerCase().includes(recipeFilter.toLowerCase())) return false;
        if (managerFilter && !(p.manager_name ?? '').toLowerCase().includes(managerFilter.toLowerCase())) return false;
        if (operatorFilter && !(p.operator_name ?? '').toLowerCase().includes(operatorFilter.toLowerCase())) return false;
        return true;
      })
      .map((p) => {
        const j = journalByPlan.get(p.id);
        const metrics = j ? computeMetrics(j) : null;
        return { plan: p, journal: j, metrics };
      })
      .sort((a, b) => b.plan.scheduled_time.localeCompare(a.plan.scheduled_time));
  }, [plans, journalByPlan, dateFrom, dateTo, recipeFilter, managerFilter, operatorFilter]);

  const exportExcel = () => {
    const data = rows.map((r) => ({
      Date: r.plan.production_date,
      Recette: r.plan.recipe_name,
      Chariots: r.plan.chariots,
      Responsable: r.plan.manager_name ?? '',
      Opérateur: r.plan.operator_name ?? '',
      'Heure prévue': formatDT(r.plan.scheduled_time),
      Statut: r.plan.status,
      'Début pétrissage': formatDT(r.journal?.kneading_start),
      'Fin pétrissage': formatDT(r.journal?.kneading_end),
      'Température pâte (°C)': r.journal?.dough_temperature ?? '',
      'Début façonnage': formatDT(r.journal?.shaping_start),
      'Début ligne': formatDT(r.journal?.line_start),
      'Mise en pousse': formatDT(r.journal?.proofing_start),
      'Sortie pousse': formatDT(r.journal?.proofing_end),
      Enfournement: formatDT(r.journal?.oven_in),
      'Sortie four': formatDT(r.journal?.oven_out),
      'Fin production': formatDT(r.journal?.production_end),
      'Durée pétrissage': formatDuration(r.metrics?.kneading ?? null),
      'Temps pousse': formatDuration(r.metrics?.proofing ?? null),
      'Temps cuisson': formatDuration(r.metrics?.baking ?? null),
      'Temps total': formatDuration(r.metrics?.total ?? null),
      Commentaires: r.journal?.comments ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Productions');
    XLSX.writeFile(wb, `production_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Historique des productions', 14, 15);
    autoTable(doc, {
      startY: 22,
      styles: { fontSize: 8 },
      head: [['Date', 'Recette', 'Chariots', 'Responsable', 'Opérateur', 'Statut', 'Pétrissage', 'Pousse', 'Cuisson', 'Total']],
      body: rows.map((r) => [
        format(parseISO(r.plan.production_date), 'dd/MM/yy'),
        r.plan.recipe_name,
        r.plan.chariots,
        r.plan.manager_name ?? '',
        r.plan.operator_name ?? '',
        r.plan.status,
        formatDuration(r.metrics?.kneading ?? null),
        formatDuration(r.metrics?.proofing ?? null),
        formatDuration(r.metrics?.baking ?? null),
        formatDuration(r.metrics?.total ?? null),
      ]),
    });
    doc.save(`production_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Historique des productions</h1>
          <p className="text-muted-foreground mt-1">Recherche, filtres et exports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportPdf} className="gap-2">
            <Download className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={exportExcel} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <Label>Du</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div>
          <Label>Au</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
        <div>
          <Label>Recette</Label>
          <Input value={recipeFilter} onChange={(e) => setRecipeFilter(e.target.value)} />
        </div>
        <div>
          <Label>Responsable</Label>
          <Input value={managerFilter} onChange={(e) => setManagerFilter(e.target.value)} />
        </div>
        <div>
          <Label>Opérateur</Label>
          <Input value={operatorFilter} onChange={(e) => setOperatorFilter(e.target.value)} />
        </div>
      </Card>

      <Card className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Recette</TableHead>
              <TableHead>Chariots</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Opérateur</TableHead>
              <TableHead>T° pâte</TableHead>
              <TableHead>Pétrissage</TableHead>
              <TableHead>Pousse</TableHead>
              <TableHead>Cuisson</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                  Aucun résultat.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.plan.id}>
                  <TableCell>{format(parseISO(r.plan.production_date), 'dd MMM yyyy', { locale: fr })}</TableCell>
                  <TableCell className="font-medium">{r.plan.recipe_name}</TableCell>
                  <TableCell>{r.plan.chariots}</TableCell>
                  <TableCell>{r.plan.manager_name ?? '—'}</TableCell>
                  <TableCell>{r.plan.operator_name ?? '—'}</TableCell>
                  <TableCell>{r.journal?.dough_temperature != null ? `${r.journal.dough_temperature}°C` : '—'}</TableCell>
                  <TableCell>{formatDuration(r.metrics?.kneading ?? null)}</TableCell>
                  <TableCell>{formatDuration(r.metrics?.proofing ?? null)}</TableCell>
                  <TableCell>{formatDuration(r.metrics?.baking ?? null)}</TableCell>
                  <TableCell className="font-semibold">{formatDuration(r.metrics?.total ?? null)}</TableCell>
                  <TableCell>{r.plan.status}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
