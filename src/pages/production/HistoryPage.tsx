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
import { useAllProductionBatches, type ProductionBatch } from '@/hooks/useProductionBatches';
import { computeMetrics, formatDuration } from '@/lib/productionMetrics';

function formatDT(iso: string | null | undefined) {
  if (!iso) return '';
  return format(parseISO(iso), 'dd/MM/yyyy HH:mm');
}

function aggregate(batches: ProductionBatch[]) {
  if (batches.length === 0) {
    return { kneading: null, proofing: null, baking: null, total: null, chariots: 0 };
  }
  const sums = { kneading: 0, proofing: 0, baking: 0, kCount: 0, pCount: 0, bCount: 0 };
  let earliest: number | null = null;
  let latest: number | null = null;
  let chariots = 0;
  for (const b of batches) {
    chariots += b.chariots ?? 0;
    const m = computeMetrics(b);
    if (m.kneading != null) { sums.kneading += m.kneading; sums.kCount++; }
    if (m.proofing != null) { sums.proofing += m.proofing; sums.pCount++; }
    if (m.baking != null)   { sums.baking   += m.baking;   sums.bCount++; }
    if (b.kneading_start) {
      const t = new Date(b.kneading_start).getTime();
      earliest = earliest == null ? t : Math.min(earliest, t);
    }
    if (b.production_end) {
      const t = new Date(b.production_end).getTime();
      latest = latest == null ? t : Math.max(latest, t);
    }
  }
  return {
    kneading: sums.kCount ? Math.round(sums.kneading / sums.kCount) : null,
    proofing: sums.pCount ? Math.round(sums.proofing / sums.pCount) : null,
    baking:   sums.bCount ? Math.round(sums.baking / sums.bCount)   : null,
    total:    earliest && latest ? Math.round((latest - earliest) / 60000) : null,
    chariots,
  };
}

export default function HistoryPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recipeFilter, setRecipeFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');

  const { data: plans = [] } = useProductionPlans();
  const { data: allBatches = [] } = useAllProductionBatches();

  const batchesByPlan = useMemo(() => {
    const m = new Map<string, ProductionBatch[]>();
    for (const b of allBatches) {
      const arr = m.get(b.plan_id) ?? [];
      arr.push(b);
      m.set(b.plan_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.batch_number - b.batch_number);
    return m;
  }, [allBatches]);

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
        const batches = batchesByPlan.get(p.id) ?? [];
        return { plan: p, batches, agg: aggregate(batches) };
      })
      .sort((a, b) => b.plan.scheduled_time.localeCompare(a.plan.scheduled_time));
  }, [plans, batchesByPlan, dateFrom, dateTo, recipeFilter, managerFilter, operatorFilter]);

  const exportExcel = () => {
    const data: Record<string, unknown>[] = [];
    for (const r of rows) {
      if (r.batches.length === 0) {
        data.push({
          Date: r.plan.production_date,
          Recette: r.plan.recipe_name,
          Pétrin: '—',
          Chariots: '',
          Responsable: r.plan.manager_name ?? '',
          Opérateur: r.plan.operator_name ?? '',
          'Heure prévue': formatDT(r.plan.scheduled_time),
          Statut: r.plan.status,
        });
      } else {
        for (const b of r.batches) {
          const m = computeMetrics(b);
          data.push({
            Date: r.plan.production_date,
            Recette: r.plan.recipe_name,
            Pétrin: b.batch_number,
            Chariots: b.chariots ?? '',
            Responsable: r.plan.manager_name ?? '',
            Opérateur: r.plan.operator_name ?? '',
            'Heure prévue': formatDT(r.plan.scheduled_time),
            Statut: r.plan.status,
            'Début pétrissage': formatDT(b.kneading_start),
            'Fin pétrissage': formatDT(b.kneading_end),
            'T° pâte (°C)': b.dough_temperature ?? '',
            'Début façonnage': formatDT(b.shaping_start),
            'Début ligne': formatDT(b.line_start),
            'Mise en pousse': formatDT(b.proofing_start),
            'Sortie pousse': formatDT(b.proofing_end),
            Enfournement: formatDT(b.oven_in),
            'Sortie four': formatDT(b.oven_out),
            'Fin': formatDT(b.production_end),
            'Durée pétrissage': formatDuration(m.kneading),
            'Temps pousse': formatDuration(m.proofing),
            'Temps cuisson': formatDuration(m.baking),
            'Temps total': formatDuration(m.total),
            Commentaires: b.comments ?? '',
          });
        }
      }
    }
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pétrins');
    XLSX.writeFile(wb, `production_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('Historique des productions', 14, 15);
    autoTable(doc, {
      startY: 22,
      styles: { fontSize: 8 },
      head: [['Date', 'Recette', 'Pétrins', 'Chariots', 'Responsable', 'Opérateur', 'Pétr. moy.', 'Pousse moy.', 'Cuisson moy.', 'Total']],
      body: rows.map((r) => [
        format(parseISO(r.plan.production_date), 'dd/MM/yy'),
        r.plan.recipe_name,
        r.batches.length,
        r.agg.chariots,
        r.plan.manager_name ?? '',
        r.plan.operator_name ?? '',
        formatDuration(r.agg.kneading),
        formatDuration(r.agg.proofing),
        formatDuration(r.agg.baking),
        formatDuration(r.agg.total),
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
              <TableHead>Pétrins</TableHead>
              <TableHead>Chariots</TableHead>
              <TableHead>Responsable</TableHead>
              <TableHead>Opérateur</TableHead>
              <TableHead>Pétr. moy.</TableHead>
              <TableHead>Pousse moy.</TableHead>
              <TableHead>Cuisson moy.</TableHead>
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
                  <TableCell>{r.batches.length}</TableCell>
                  <TableCell>{r.agg.chariots}</TableCell>
                  <TableCell>{r.plan.manager_name ?? '—'}</TableCell>
                  <TableCell>{r.plan.operator_name ?? '—'}</TableCell>
                  <TableCell>{formatDuration(r.agg.kneading)}</TableCell>
                  <TableCell>{formatDuration(r.agg.proofing)}</TableCell>
                  <TableCell>{formatDuration(r.agg.baking)}</TableCell>
                  <TableCell className="font-semibold">{formatDuration(r.agg.total)}</TableCell>
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
