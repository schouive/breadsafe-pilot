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
  ArrowLeft, Printer, Loader2, Check, X, Clock, Wand2, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePrintProgram, usePrintProgramItems } from '@/hooks/usePrintPrograms';
import { usePrintProducts, type PrintProduct, useRecordPrint } from '@/hooks/usePrintLabels';
import { buildProductZpl, computeFinalSku } from '@/lib/buildProductZpl';
import { printZpl, pickZebraPrinter, warmUpBrowserPrint } from '@/lib/zebraWebUsb';
import { cn } from '@/lib/utils';
import { computeDdm } from '@/lib/ddm';

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

const STATUS_BADGE: Record<LineStatus, { label: string; cls: string; icon: LucideIcon }> = {
  pending: { label: 'En attente', cls: 'bg-muted text-muted-foreground', icon: Clock },
  printing: { label: 'Impression…', cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: Loader2 },
  printed: { label: 'Imprimé', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: Check },
  failed: { label: 'Échec', cls: 'bg-destructive/15 text-destructive border-destructive/30', icon: X },
};

function computeLotNumber(isoDate: string): string {
  if (!isoDate) return '';
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  const d = Date.UTC(year, month - 1, day);
  const start = Date.UTC(year, 0, 0);
  const dayOfYear = Math.round((d - start) / 86400000);
  return `L${String(dayOfYear).padStart(3, '0')}${String(year).slice(-2)}`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const PRINT_CHUNK_SIZE = 10;
const PRINT_DELAY_BASE_MS = 1200;
const PRINT_DELAY_PER_LABEL_MS = 550;

function splitQuantityForPrinter(quantity: number): number[] {
  const safeQuantity = Math.max(0, Math.floor(quantity || 0));
  const chunks: number[] = [];
  let remaining = safeQuantity;
  while (remaining > 0) {
    const chunk = Math.min(PRINT_CHUNK_SIZE, remaining);
    chunks.push(chunk);
    remaining -= chunk;
  }
  return chunks;
}

function getPrinterCooldownMs(quantity: number): number {
  return PRINT_DELAY_BASE_MS + quantity * PRINT_DELAY_PER_LABEL_MS;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erreur impression';
}

function normalizeQuantityInput(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
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
  const [rawQuantities, setRawQuantities] = useState<Record<string, string>>({});
  const [printingAll, setPrintingAll] = useState(false);

  // Build lines from program + erp products
  useEffect(() => {
    if (!items.length || !products.length) return;
    setLines(prev => {
      // Preserve previous statuses by itemId
      const prevById = new Map(prev.map(l => [l.itemId, l]));
      return items
        .map(it => {
          const p = productById.get(it.packaging_id);
          if (!p) return null;
          const old = prevById.get(it.id);
          const lot = computeLotNumber(globalProductionDate);
          const autoDdm = computeDdm(globalProductionDate, p.storage_instructions);
          return {
            itemId: it.id,
            product: p,
            quantity: old?.quantity ?? 0,
            lot: old?.lot ?? lot,
            productionDate: old?.productionDate ?? globalProductionDate,
            ddm: old?.ddm ?? autoDdm,
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
      // DDM = manuelle si renseignée, sinon auto selon température produit
      ddm: globalDdm || computeDdm(globalProductionDate, l.product.storage_instructions),
      status: 'pending',
      error: null,
    })));
    toast.success('Lot et DDM appliqués à toutes les lignes');
  };

  const handleLineProductionDateChange = (itemId: string, val: string) => {
    setLines(prev => prev.map(l => l.itemId === itemId
      ? { ...l, productionDate: val, lot: computeLotNumber(val), ddm: computeDdm(val, l.product.storage_instructions) }
      : l
    ));
  };

  const handleGlobalProductionDateChange = (val: string) => {
    setGlobalProductionDate(val);
    setLines(prev => prev.map(l =>
      l.status === 'printed'
        ? l
        : { ...l, productionDate: val, lot: computeLotNumber(val), ddm: computeDdm(val, l.product.storage_instructions) }
    ));
  };

  const handleGlobalDdmChange = (val: string) => {
    setGlobalDdm(val);
    setLines(prev => prev.map(l => l.status === 'printed' ? l : { ...l, ddm: val }));
  };

  const validate = (): string | null => {
    if (lines.length === 0) return 'Aucune ligne à imprimer';
    const toPrint = lines.filter(l => l.quantity > 0);
    if (toPrint.length === 0) return 'Aucune quantité à imprimer (toutes à 0)';
    for (const l of toPrint) {
      const lot = computeLotNumber(l.productionDate);
      if (!lot.trim()) return `Date de fabrication manquante pour ${l.product.erp_code}`;
      if (!l.ddm) return `DDM manquante pour ${l.product.erp_code}`;
    }
    return null;
  };

  const handlePrint = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setPrintingAll(true);
    // Pré-chauffe Zebra Browser Print (évite l'erreur "n'est pas prêt" au 1er envoi sur Windows).
    await warmUpBrowserPrint();
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    // Sentinel : un ZPL no-op (~HS = demande de statut, ne sort pas d'étiquette)
    // pour réellement réveiller la file d'impression avant la 1ère vraie étiquette.
    // Sur certains postes Windows, les 1ers jobs envoyés trop tôt après warm-up sont silencieusement perdus.
    try { await printZpl('~HS'); } catch (e) { console.warn('warm-up sentinel skipped', e); }
    await sleep(1500);
    let ok = 0, fail = 0;
    const failures: string[] = [];
    const queue = lines.filter(l => l.status !== 'printed' && l.quantity > 0);
    for (let qi = 0; qi < queue.length; qi++) {
      const l = queue[qi];
      const lot = computeLotNumber(l.productionDate);
      updateLine(l.itemId, { status: 'printing', error: null, lot });
      try {
        const chunks = splitQuantityForPrinter(l.quantity);
        for (let ci = 0; ci < chunks.length; ci++) {
          const chunkQuantity = chunks[ci];
          const zpl = buildProductZpl({
            product: l.product, lot, ddm: l.ddm, quantity: chunkQuantity,
          });
          await printZpl(zpl);

          const hasMoreChunks = ci < chunks.length - 1;
          const hasMoreLines = qi < queue.length - 1;
          if (hasMoreChunks || hasMoreLines) await sleep(getPrinterCooldownMs(chunkQuantity));
        }
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
            template_name: l.product.template_name || 'DEFAULT',
            lot_number: lot,
            ddm: l.ddm,
            quantity: l.quantity,
          });
        } catch (e) { console.warn('print_history skipped', e); }
      } catch (e: unknown) {
        const msg = getErrorMessage(e);
        console.error('[PrintProgramRun] échec impression', l.product.erp_code, e);
        updateLine(l.itemId, { status: 'failed', error: msg });
        failures.push(`${l.product.erp_code}: ${msg}`);
        fail++;
      }
    }
    setPrintingAll(false);
    if (fail === 0) toast.success(`${ok} ligne(s) imprimée(s)`);
    else if (ok === 0) toast.error(`Échec impression — ${failures[0]}`, { duration: 8000 });
    else toast.warning(`${ok} OK · ${fail} échec(s) — ${failures[0]}`, { duration: 8000 });
  };

  const handlePickPrinter = async () => {
    try {
      const method = await pickZebraPrinter();
      toast.success(method === 'browserprint' ? 'Imprimante détectée via Zebra Browser Print (prête)' : 'Imprimante Zebra sélectionnée (WebUSB)');
    }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Sélection annulée'); }
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
            <Input type="date" value={globalProductionDate} onChange={e => handleGlobalProductionDateChange(e.target.value)} />
          </div>
          <div>
            <Label>DDM globale</Label>
            <Input type="date" value={globalDdm} onChange={e => handleGlobalDdmChange(e.target.value)} />
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
                  
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map(l => {
                  return (
                    <TableRow key={l.itemId}>
                      <TableCell className="font-mono text-xs">{l.product.erp_code}</TableCell>
                      <TableCell className="text-sm">{l.product.erp_label}</TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          autoComplete="off"
                          value={rawQuantities[l.itemId] ?? (l.quantity === 0 ? '' : String(l.quantity))}
                          onFocus={e => {
                            const input = e.currentTarget;
                            setRawQuantities(prev => ({
                              ...prev,
                              [l.itemId]: prev[l.itemId] ?? (l.quantity === 0 ? '' : String(l.quantity)),
                            }));
                            requestAnimationFrame(() => input.select());
                          }}
                          onChange={e => {
                            const val = normalizeQuantityInput(e.target.value);
                            setRawQuantities(prev => ({ ...prev, [l.itemId]: val }));
                            const num = val === '' ? 0 : parseInt(val, 10);
                            if (!isNaN(num) && num >= 0) {
                              updateLine(l.itemId, { quantity: num });
                            }
                          }}
                          onBlur={() => {
                            setRawQuantities(prev => ({
                              ...prev,
                              [l.itemId]: l.quantity === 0 ? '' : String(l.quantity),
                            }));
                          }}
                          className="h-9"
                        />
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
