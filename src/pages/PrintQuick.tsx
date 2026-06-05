import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Zap, Search, Printer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePrintProducts, type PrintProduct, useRecordPrint } from '@/hooks/usePrintLabels';
import { PrintBridgeDialog } from '@/components/print/PrintBridgeDialog';
import { buildProductZpl, computeFinalSku } from '@/lib/buildProductZpl';
import { printZpl, pickZebraPrinter } from '@/lib/zebraWebUsb';

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

interface SessionEntry {
  id: string;
  at: string;
  erp: string;
  label: string;
  qty: number;
  lot: string;
}

export default function PrintQuick() {
  const { data: products = [], isLoading } = usePrintProducts();
  const recordHistory = useRecordPrint();

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [product, setProduct] = useState<PrintProduct | null>(null);
  const [productionDate, setProductionDate] = useState(todayIso());
  const [lot, setLot] = useState(computeLotNumber(todayIso()));
  const [ddm, setDdm] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [printing, setPrinting] = useState(false);
  const [history, setHistory] = useState<SessionEntry[]>([]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 30);
    return products.filter(p =>
      p.erp_code.toLowerCase().includes(s) ||
      p.label.toLowerCase().includes(s) ||
      p.erp_label.toLowerCase().includes(s)
    ).slice(0, 30);
  }, [products, q]);

  const onProductionDateChange = (val: string) => {
    setProductionDate(val);
    setLot(computeLotNumber(val));
  };

  const handlePickPrinter = async () => {
    try { await pickZebraPrinter(); toast.success('Imprimante sélectionnée'); }
    catch (e: any) { toast.error(e?.message || 'Sélection annulée'); }
  };

  const handlePrint = async () => {
    if (!product) { toast.error('Sélectionnez un article'); return; }
    if (!lot.trim()) { toast.error('Lot manquant'); return; }
    if (!ddm) { toast.error('DDM manquante'); return; }
    if (quantity < 1) { toast.error('Quantité invalide'); return; }
    setPrinting(true);
    try {
      const zpl = buildProductZpl({ product, lot, ddm, quantity });
      await printZpl(zpl);
      toast.success(`Imprimé : ${product.erp_code} × ${quantity}`);
      setHistory(h => [{
        id: crypto.randomUUID(),
        at: new Date().toLocaleTimeString('fr-FR'),
        erp: product.erp_code, label: product.erp_label,
        qty: quantity, lot,
      }, ...h].slice(0, 10));
      try {
        await recordHistory.mutateAsync({
          product_id: product.id,
          final_sku: computeFinalSku(product),
          sku_base: product.sku_base,
          old_code: product.erp_code,
          temperature: product.temperature,
          slicing: product.slicing,
          packaging: product.packaging,
          template_name: product.template_name || 'DEFAULT',
          lot_number: lot,
          ddm,
          quantity,
        });
      } catch (e) { console.warn('print_history skipped', e); }
    } catch (e: any) {
      toast.error(e?.message || 'Erreur impression');
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-primary flex items-center gap-3">
            <Zap className="h-8 w-8" />
            Impression rapide
          </h1>
          <p className="text-muted-foreground mt-1">
            Une étiquette, sans sauvegarde
          </p>
        </div>
        <div className="flex gap-2">
          <PrintBridgeDialog />
          <Button variant="outline" onClick={handlePickPrinter}>
            <Printer className="h-4 w-4 mr-2" /> Imprimante
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Article et paramètres</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Article ERP</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-mono text-xs h-10" disabled={isLoading}>
                  {product ? (
                    <span className="truncate">{product.erp_code} · {product.erp_label}</span>
                  ) : (
                    <span className="text-muted-foreground"><Search className="inline h-3 w-3 mr-1" />Rechercher un article…</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[420px] p-0" align="start">
                <div className="p-2 border-b">
                  <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Code ERP, libellé…" className="h-9" />
                </div>
                <div className="max-h-72 overflow-auto">
                  {filtered.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-4 text-center">Aucun résultat</div>
                  ) : filtered.map(p => (
                    <button key={p.id} type="button"
                      className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-b-0"
                      onClick={() => { setProduct(p); setOpen(false); setQ(''); }}>
                      <div className="font-mono text-xs">{p.erp_code}</div>
                      <div className="text-muted-foreground text-xs truncate">{p.erp_label}</div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date de fabrication</Label>
              <Input type="date" value={productionDate} onChange={e => onProductionDateChange(e.target.value)} />
            </div>
            <div>
              <Label>Lot</Label>
              <Input value={lot} onChange={e => setLot(e.target.value)} className="font-mono" />
            </div>
            <div>
              <Label>DDM</Label>
              <Input type="date" value={ddm} onChange={e => setDdm(e.target.value)} />
            </div>
            <div>
              <Label>Quantité</Label>
              <Input type="number" min={1} value={quantity} onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)} />
            </div>
          </div>

          <Button size="lg" className="w-full" onClick={handlePrint} disabled={printing}>
            {printing ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Printer className="h-5 w-5 mr-2" />}
            Imprimer
          </Button>
        </CardContent>
      </Card>

      {history.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Historique de la session</CardTitle></CardHeader>
          <CardContent className="divide-y">
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-mono text-xs">{h.erp}</div>
                  <div className="text-muted-foreground truncate">{h.label}</div>
                </div>
                <div className="text-right text-xs text-muted-foreground shrink-0 ml-3">
                  <div>× {h.qty} · {h.lot}</div>
                  <div>{h.at}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
