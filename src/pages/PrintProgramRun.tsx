import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Printer, Loader2, Check, X, Clock, Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePrintProgram, usePrintProgramItems } from '@/hooks/usePrintPrograms';
import { usePrintProducts, type PrintProduct, useRecordPrint } from '@/hooks/usePrintLabels';
import { buildProductZpl, computeFinalSku } from '@/lib/buildProductZpl';
import { printZpl, isZebraSupported, pickZebraPrinter } from '@/lib/zebraWebUsb';
import { cn } from '@/lib/utils';

type LineStatus = 'pending' | 'printing' | 'printed' | 'failed';

interface Line {
  itemId: string;
  product: PrintProduct;
  quantity: number;
  lot: string;
  productionDate: string; // ISO yyyy-mm-dd
  ddm: string;            // ISO yyyy-mm-dd
  status: LineStatus;
  error?: string | null;
}

const STATUS_BADGE: Record<LineStatus, { label: string; cls: string; icon: any }> = {
  pending: { label: 'En attente', cls: 'bg-muted text-muted-foreground', icon: Clock },
  printing: { label: 'Impression…', cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: Loader2 },
  printed: { label: 'Imprimé', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: Check },
  failed: { label: 'Échec', cls: 'bg-destructive/15 text-destructive border-destructive/30', icon: X },
};

function computeLotNumber(isoDate: string): string {
  if (!isoDate) return '';
  const d = new Date(isoDate + 'T00:00:00');
  if (isNaN(d.getTime())) return '';
  const start = new Date(d.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return `L${String(dayOfYear).padStart(3, '0')}${String(d.getFullYear()).slice(-2)}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PrintProgramRun() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: program, isLoading: loadingProg } = usePrintProgram(id);
  const { data: items = [], isLoading: loadingItems } = usePrintProgramItems(id);
  const { data: products = [], isLoading: loadingProducts } = usePrintProducts();
  const recordHistory = useRecordPrint();

  const productById = useMemo(() => {
    const m = new Map<string, PrintProduct>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const initialDate = todayIso();
  const [globalProductionDate, setGlobalProductionDate] = useState(initialDate);
  const [globalDdm, setGlobalDdm] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [printingAll, setPrintingAll] = useState(false);

  // Build lines from program + erp products
  useEffect(() => {
    if (!items.length || !products.length) return;
    setLines(prev => {
      // Preserve previous statuses by itemId
      const prevById = new Map(prev.map(l => [l.itemId, l]));
      return items
        .map(it => {
          const p = productById.get(it.erp_article_id);
          if (!p) return null;
          const old = prevById.get(it.id);
          const lot = computeLotNumber(globalProductionDate);
          return {
            itemId: it.id,
            product: p,
            quantity: old?.quantity ?? it.default_quantity,
            lot: old?.lot ?? lot,
            productionDate: old?.productionDate ?? globalProductionDate,
            ddm: old?.ddm ?? globalDdm,
            status: old?.status ?? 'pending',
            error: old?.error ?? null,
          } as Line;
        })
        .filter((x): x is Line => !!x);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, products]);

  const updateLine = (itemId: string, patch: Partial<Line>) =>
    setLines(prev => prev.map(l => l.itemId === itemId ? { ...l, ...patch } : l));

  const applyGlobalsToAll = () => {
    const lot = computeLotNumber(globalProductionDate);
    setLines(prev => prev.map(l => ({
      ...l,
      productionDate: globalProductionDate,
      lot,
      ddm: globalDdm,
      status: 'pending',
      error: null,
    })));
    toast.success('Lot et DDM appliqués à toutes les lignes');
  };

  const handleLineProductionDateChange = (itemId: string, val: string) => {
    updateLine(itemId, {
      productionDate: val,
      lot: computeLotNumber(val),
    });
  };

  const validate = (): string | null => {
    if (lines.length === 0) return 'Aucune ligne à imprimer';
    for (const l of lines) {
      const lot = computeLotNumber(l.productionDate);
      if (!lot.trim()) return `Date de fabrication manquante pour ${l.product.erp_code}`;
      if (!l.ddm) return `DDM manquante pour ${l.product.erp_code}`;
      if (!l.product.template_name) return `Aucun template Zebra pour ${l.product.erp_code}`;
      if (l.quantity < 1) return `Quantité invalide pour ${l.product.erp_code}`;
    }
    return null;
  };

  const handlePrint = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    if (!isZebraSupported()) {
      toast.error('WebUSB non disponible. Utilisez Chrome/Edge en HTTPS.');
      return;
    }
    setPrintingAll(true);
    let ok = 0, fail = 0;
    const queue = lines.filter(l => l.status !== 'printed');
    for (const l of queue) {
      updateLine(l.itemId, { status: 'printing', error: null });
      try {
        const zpl = buildProductZpl({
          product: l.product, lot: l.lot, ddm: l.ddm, quantity: l.quantity,
        });
        await printZpl(zpl);
        updateLine(l.itemId, { status: 'printed', error: null });
        ok++;
        // historique best-effort
        try {
          await recordHistory.mutateAsync({
            product_id: l.product.id,
            final_sku: computeFinalSku(l.product),
            sku_base: l.product.sku_base,
            old_code: l.product.erp_code,
            temperature: l.product.temperature,
            slicing: l.product.slicing,
            packaging: l.product.packaging,
            template_name: l.product.template_name!,
            lot_number: l.lot,
            ddm: l.ddm,
            quantity: l.quantity,
          });
        } catch (e) { console.warn('print_history skipped', e); }
      } catch (e: any) {
        updateLine(l.itemId, { status: 'failed', error: e?.message || 'Erreur impression' });
        fail++;
      }
    }
    setPrintingAll(false);
    if (fail === 0) toast.success(`${ok} ligne(s) imprimée(s)`);
    else if (ok === 0) toast.error(`Échec : ${fail} ligne(s)`);
    else toast.warning(`${ok} OK · ${fail} échec(s)`);
  };

  const handlePickPrinter = async () => {
    try { await pickZebraPrinter(); toast.success('Imprimante sélectionnée'); }
    catch (e: any) { toast.error(e?.message || 'Sélection annulée'); }
  };

  if (loadingProg || loadingProducts) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (!program) {
    return <div className="text-center py-12 text-muted-foreground">Programme introuvable</div>;
  }

  const ready = !validate();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/print/programs')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary">{program.name}</h1>
            <p className="text-muted-foreground text-sm">
              {program.customer_name || '—'}{program.customer_code ? ` (${program.customer_code})` : ''} · {lines.length} ligne(s)
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePickPrinter}>
            <Printer className="h-4 w-4 mr-2" /> Imprimante
          </Button>
          <Button size="lg" onClick={handlePrint} disabled={!ready || printingAll}>
            {printingAll ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Printer className="h-5 w-5 mr-2" />}
            IMPRIMER LE PROGRAMME
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Paramètres globaux</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <Label>Date de fabrication globale</Label>
            <Input type="date" value={globalProductionDate} onChange={e => setGlobalProductionDate(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              Lot : <span className="font-mono">{computeLotNumber(globalProductionDate) || '—'}</span>
            </p>
          </div>
          <div>
            <Label>DDM globale</Label>
            <Input type="date" value={globalDdm} onChange={e => setGlobalDdm(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={applyGlobalsToAll}>
            <Wand2 className="h-4 w-4 mr-2" /> Appliquer à toutes les lignes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Lignes du programme</CardTitle></CardHeader>
        <CardContent className="p-0">
          {loadingItems ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : lines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Ce programme ne contient aucun produit. Modifiez-le pour en ajouter.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code ERP</TableHead>
                  <TableHead>Nom produit</TableHead>
                  <TableHead className="w-24">Qté</TableHead>
                  <TableHead className="w-40">Date fab.</TableHead>
                  <TableHead className="w-32">Lot</TableHead>
                  <TableHead className="w-40">DDM</TableHead>
                  <TableHead className="w-32">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(l => {
                  const s = STATUS_BADGE[l.status];
                  const Icon = s.icon;
                  return (
                    <TableRow key={l.itemId}>
                      <TableCell className="font-mono text-xs">{l.product.erp_code}</TableCell>
                      <TableCell className="text-sm">{l.product.erp_label}</TableCell>
                      <TableCell>
                        <Input type="number" min={1} value={l.quantity}
                          onChange={e => updateLine(l.itemId, { quantity: parseInt(e.target.value, 10) || 1 })}
                          className="h-9" />
                      </TableCell>
                      <TableCell>
                        <Input type="date" value={l.productionDate}
                          onChange={e => handleLineProductionDateChange(l.itemId, e.target.value)}
                          className="h-9" />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={computeLotNumber(l.productionDate)}
                          readOnly
                          tabIndex={-1}
                          className="h-9 font-mono text-xs bg-muted cursor-not-allowed"
                        />
                      </TableCell>
                      <TableCell>
                        <Input type="date" value={l.ddm} onChange={e => updateLine(l.itemId, { ddm: e.target.value })}
                          className="h-9" />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('gap-1', s.cls)}>
                          <Icon className={cn('h-3 w-3', l.status === 'printing' && 'animate-spin')} />
                          {s.label}
                        </Badge>
                        {l.error && <p className="text-xs text-destructive mt-1 truncate" title={l.error}>{l.error}</p>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
