import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft, Plus, Copy, Trash2, Printer, Search,
  Loader2, Eye, Download, RefreshCw, Check, X, Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  usePrintBatch, usePrintBatchItems, useUpdatePrintBatch,
  useAddBatchItem, useUpdateBatchItem, useDeleteBatchItem,
  useRecordPrintJob,
  type ItemStatus,
} from '@/hooks/usePrintBatches';
import { usePrintProducts, useRecordPrint, type PrintProduct } from '@/hooks/usePrintLabels';
import { buildProductZpl, computeFinalSku } from '@/lib/buildProductZpl';
import { printZpl, isZebraSupported, pickZebraPrinter } from '@/lib/zebraWebUsb';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<ItemStatus, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'En attente', cls: 'bg-muted text-muted-foreground', icon: Clock },
  printing: { label: 'Impression…', cls: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: Loader2 },
  printed: { label: 'Imprimé', cls: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: Check },
  failed: { label: 'Échec', cls: 'bg-destructive/15 text-destructive border-destructive/30', icon: X },
};

function ProductPicker({
  products, value, onSelect, disabled,
}: {
  products: PrintProduct[];
  value: PrintProduct | null;
  onSelect: (p: PrintProduct) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 30);
    return products.filter(p =>
      p.erp_code.toLowerCase().includes(s) ||
      p.sku_base.toLowerCase().includes(s) ||
      p.label.toLowerCase().includes(s) ||
      p.erp_label.toLowerCase().includes(s)
    ).slice(0, 30);
  }, [products, q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="w-full justify-start font-mono text-xs h-9">
          {value ? (
            <span className="truncate">{value.erp_code} · {value.erp_label}</span>
          ) : (
            <span className="text-muted-foreground"><Search className="inline h-3 w-3 mr-1" />Choisir un produit ERP</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Code ERP, SKU, libellé…"
            className="h-9"
          />
        </div>
        <div className="max-h-72 overflow-auto">
          {filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground p-4 text-center">Aucun résultat</div>
          ) : filtered.map(p => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left p-2 hover:bg-muted text-sm border-b last:border-b-0"
              onClick={() => { onSelect(p); setOpen(false); setQ(''); }}
            >
              <div className="font-mono text-xs">{p.erp_code} · {p.sku_base}-{p.temperature}-{p.slicing}-{p.packaging}</div>
              <div className="text-muted-foreground text-xs truncate">{p.erp_label}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function PrintOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: batch, isLoading: loadingBatch } = usePrintBatch(id);
  const { data: items = [], isLoading: loadingItems } = usePrintBatchItems(id);
  const { data: products = [], isLoading: loadingProducts } = usePrintProducts();
  const updateBatch = useUpdatePrintBatch();
  const addItem = useAddBatchItem();
  const updateItem = useUpdateBatchItem();
  const deleteItem = useDeleteBatchItem();
  const recordJob = useRecordPrintJob();
  const recordHistory = useRecordPrint();

  const [name, setName] = useState('');
  const [globalLot, setGlobalLot] = useState('');
  const [productionDate, setProductionDate] = useState('');
  const [globalDdm, setGlobalDdm] = useState('');
  const [printingAll, setPrintingAll] = useState(false);
  const [previewItem, setPreviewItem] = useState<string | null>(null);

  // L + jour de l'année (3 chiffres) + 2 derniers chiffres de l'année
  // Ex: 03 janvier 2026 -> L00326
  const computeLotNumber = (isoDate: string): string => {
    if (!isoDate) return '';
    const d = new Date(isoDate + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    const start = new Date(d.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
    return `L${String(dayOfYear).padStart(3, '0')}${String(d.getFullYear()).slice(-2)}`;
  };

  // Reverse: lot "L00326" -> ISO date "2026-01-03"
  const lotToIsoDate = (lot: string | null | undefined): string => {
    if (!lot) return '';
    const m = /^L(\d{3})(\d{2})$/.exec(lot.trim());
    if (!m) return '';
    const day = parseInt(m[1], 10);
    const year = 2000 + parseInt(m[2], 10);
    const d = new Date(year, 0, day);
    if (isNaN(d.getTime())) return '';
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (!batch) return;
    setName(batch.name ?? '');
    setGlobalLot(batch.global_lot ?? '');
    setProductionDate(lotToIsoDate(batch.global_lot));
    setGlobalDdm(batch.global_ddm ?? '');
  }, [batch]);

  const handleProductionDateChange = (val: string) => {
    setProductionDate(val);
    const lot = computeLotNumber(val);
    setGlobalLot(lot);
    if (batch) {
      updateBatch.mutate({
        id: batch.id,
        name: name || null,
        global_lot: lot || null,
        global_ddm: globalDdm || null,
      });
    }
  };

  const productById = useMemo(() => {
    const map = new Map<string, PrintProduct>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const persistHeader = () => {
    if (!batch) return;
    updateBatch.mutate({
      id: batch.id,
      name: name || null,
      global_lot: globalLot || null,
      global_ddm: globalDdm || null,
    });
  };

  const handleAddRow = async () => {
    if (!id) return;
    await addItem.mutateAsync({
      batch_id: id,
      order_index: items.length,
      product_id: products[0]?.id ?? '',
      lot_override: null,
      ddm_override: null,
      quantity: 1,
    } as any);
  };

  const handleDuplicate = async (itemId: string) => {
    if (!id) return;
    const src = items.find(i => i.id === itemId);
    if (!src) return;
    await addItem.mutateAsync({
      batch_id: id,
      order_index: items.length,
      product_id: src.product_id,
      lot_override: src.lot_override,
      ddm_override: src.ddm_override,
      quantity: src.quantity,
    } as any);
  };

  const resolveLotDdm = (item: typeof items[number]) => ({
    lot: item.lot_override || globalLot || '',
    ddm: item.ddm_override || globalDdm || '',
  });

  const validateBeforePrint = (): string | null => {
    if (items.length === 0) return 'Aucune ligne à imprimer';
    for (const it of items) {
      const p = productById.get(it.product_id);
      if (!p) return `Produit introuvable pour une ligne`;
      const { lot, ddm } = resolveLotDdm(it);
      if (!lot.trim()) return `Lot manquant pour ${p.erp_code}`;
      if (!ddm) return `DDM manquante pour ${p.erp_code}`;
      if (!p.template_name) return `Aucun template Zebra pour ${p.erp_code}`;
      if (it.quantity < 1) return `Quantité invalide pour ${p.erp_code}`;
    }
    return null;
  };

  const handlePrintSession = async () => {
    if (!batch) return;
    const err = validateBeforePrint();
    if (err) { toast.error(err); return; }
    if (!isZebraSupported()) {
      toast.error('WebUSB non disponible. Utilisez Chrome/Edge en HTTPS.');
      return;
    }

    setPrintingAll(true);
    await updateBatch.mutateAsync({ id: batch.id, status: 'printing' });

    let okCount = 0;
    let failCount = 0;

    // On ne réimprime pas les lignes déjà imprimées
    const queue = items.filter(it => it.status !== 'printed');

    for (const it of queue) {
      const p = productById.get(it.product_id)!;
      const { lot, ddm } = resolveLotDdm(it);
      await updateItem.mutateAsync({ id: it.id, batch_id: batch.id, status: 'printing', error_message: null });
      try {
        const zpl = buildProductZpl({ product: p, lot, ddm, quantity: it.quantity });
        const result = await printZpl(zpl);
        await updateItem.mutateAsync({
          id: it.id, batch_id: batch.id,
          status: 'printed', printed_at: new Date().toISOString(), error_message: null,
        });
        await recordJob.mutateAsync({
          batch_id: batch.id,
          batch_item_id: it.id,
          zpl_payload: zpl,
          status: 'success',
          print_method: result.method,
        });
        // Historique global d'étiquettes
        await recordHistory.mutateAsync({
          product_id: p.id,
          final_sku: computeFinalSku(p),
          sku_base: p.sku_base,
          old_code: p.erp_code,
          temperature: p.temperature,
          slicing: p.slicing,
          packaging: p.packaging,
          template_name: p.template_name!,
          lot_number: lot,
          ddm,
          quantity: it.quantity,
        });
        okCount++;
      } catch (e: any) {
        failCount++;
        const msg = e?.message ?? 'Erreur impression';
        await updateItem.mutateAsync({
          id: it.id, batch_id: batch.id, status: 'failed', error_message: msg,
        });
        await recordJob.mutateAsync({
          batch_id: batch.id,
          batch_item_id: it.id,
          status: 'failed',
          error_message: msg,
        });
      }
    }

    const finalStatus = failCount === 0 ? 'completed' : (okCount === 0 ? 'failed' : 'partial');
    await updateBatch.mutateAsync({
      id: batch.id,
      status: finalStatus,
      printed_at: new Date().toISOString(),
    });
    setPrintingAll(false);

    if (failCount === 0) toast.success(`${okCount} ligne(s) imprimée(s)`);
    else if (okCount === 0) toast.error(`Échec : ${failCount} ligne(s)`);
    else toast.warning(`${okCount} OK · ${failCount} échec(s) — relancez pour réimprimer les échecs`);
  };

  const handleReprintFailed = async (itemId: string) => {
    const it = items.find(i => i.id === itemId);
    if (!it || !batch) return;
    await updateItem.mutateAsync({ id: itemId, batch_id: batch.id, status: 'pending', error_message: null });
    toast.info('Ligne remise en attente — cliquez sur « Imprimer la session »');
  };

  const handlePickPrinter = async () => {
    try {
      await pickZebraPrinter();
      toast.success('Imprimante sélectionnée');
    } catch (e: any) {
      toast.error(e?.message || 'Sélection annulée');
    }
  };

  const handleExportPdf = async () => {
    if (!batch) return;
    try {
      const [{ default: jsPDF }] = await Promise.all([import('jspdf')]);
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text(`Ordre d'impression ${batch.batch_number}`, 14, 16);
      doc.setFontSize(10);
      doc.text(`${batch.name || ''}`, 14, 23);
      doc.text(`Lot global : ${batch.global_lot || '—'}    DDM globale : ${batch.global_ddm || '—'}`, 14, 30);
      doc.text(`Statut : ${batch.status}`, 14, 37);

      autoTable(doc, {
        startY: 44,
        head: [['#', 'Code ERP', 'Désignation', 'Lot', 'DDM', 'Qté', 'Statut']],
        body: items.map((it, idx) => {
          const p = productById.get(it.product_id);
          const { lot, ddm } = resolveLotDdm(it);
          return [
            String(idx + 1),
            p?.erp_code || '—',
            p?.erp_label || '—',
            lot || '—',
            ddm || '—',
            String(it.quantity),
            STATUS_BADGE[it.status].label,
          ];
        }),
      });
      doc.save(`${batch.batch_number}.pdf`);
      toast.success('PDF généré');
    } catch (e: any) {
      toast.error(e?.message || 'Export PDF impossible');
    }
  };

  if (loadingBatch || loadingProducts) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!batch) {
    return <div className="text-center py-12 text-muted-foreground">Ordre introuvable</div>;
  }

  const allReady = !validateBeforePrint();
  const previewProduct = previewItem ? productById.get(items.find(i => i.id === previewItem)?.product_id || '') : null;
  const previewItemRow = previewItem ? items.find(i => i.id === previewItem) : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/print/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-primary font-mono">{batch.batch_number}</h1>
            <p className="text-muted-foreground text-sm">Ordre d'impression — {items.length} ligne(s)</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={handlePickPrinter}>
            <Printer className="h-4 w-4 mr-2" /> Imprimante
          </Button>
          <Button variant="outline" onClick={handleExportPdf} disabled={items.length === 0}>
            <Download className="h-4 w-4 mr-2" /> Export PDF
          </Button>
          <Button
            size="lg"
            onClick={handlePrintSession}
            disabled={!allReady || printingAll}
          >
            {printingAll ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Printer className="h-5 w-5 mr-2" />}
            Imprimer la session
          </Button>
        </div>
      </div>

      {/* Header form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Informations</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="batch-name">Nom (optionnel)</Label>
            <Input
              id="batch-name"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={persistHeader}
              placeholder="Ex. Production matin 12/05"
            />
          </div>
          <div>
            <Label htmlFor="production-date">Date de fabrication</Label>
            <Input
              id="production-date"
              type="date"
              value={productionDate}
              onChange={e => handleProductionDateChange(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Lot généré : <span className="font-mono">{globalLot || '—'}</span>
            </p>
          </div>
          <div>
            <Label htmlFor="global-ddm">DDM globale</Label>
            <Input
              id="global-ddm"
              type="date"
              value={globalDdm}
              onChange={e => setGlobalDdm(e.target.value)}
              onBlur={persistHeader}
            />
          </div>
          <p className="md:col-span-3 text-xs text-muted-foreground">
            Le lot et la DDM saisis par ligne remplacent les valeurs globales. Sinon, les valeurs globales s'appliquent.
          </p>
        </CardContent>
      </Card>

      {/* Items grid */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Lignes</CardTitle>
          <Button size="sm" onClick={handleAddRow} disabled={addItem.isPending}>
            <Plus className="h-4 w-4 mr-1" /> Ajouter une ligne
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loadingItems ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucune ligne. Cliquez sur « Ajouter une ligne ».
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="min-w-[260px]">Produit ERP</TableHead>
                  <TableHead className="w-32">Lot</TableHead>
                  <TableHead className="w-40">DDM</TableHead>
                  <TableHead className="w-20">Qté</TableHead>
                  <TableHead className="w-32">Statut</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((it, idx) => {
                  const p = productById.get(it.product_id);
                  const { lot, ddm } = resolveLotDdm(it);
                  const s = STATUS_BADGE[it.status];
                  const StatusIcon = s.icon;
                  return (
                    <TableRow key={it.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>
                        <ProductPicker
                          products={products}
                          value={p ?? null}
                          onSelect={(np) => updateItem.mutate({ id: it.id, batch_id: batch.id, product_id: np.id })}
                          disabled={printingAll}
                        />
                        {it.error_message && (
                          <div className="text-xs text-destructive mt-1">{it.error_message}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          defaultValue={it.lot_override ?? ''}
                          key={`lot-${it.id}-${it.updated_at}`}
                          onBlur={e => {
                            const v = e.target.value || null;
                            if (v !== it.lot_override) {
                              updateItem.mutate({ id: it.id, batch_id: batch.id, lot_override: v });
                            }
                          }}
                          placeholder={globalLot || 'Lot'}
                          className={cn('h-9 font-mono text-xs', !lot && 'border-destructive/50')}
                          disabled={printingAll}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          defaultValue={it.ddm_override ?? ''}
                          key={`ddm-${it.id}-${it.updated_at}`}
                          onBlur={e => {
                            const v = e.target.value || null;
                            if (v !== it.ddm_override) {
                              updateItem.mutate({ id: it.id, batch_id: batch.id, ddm_override: v });
                            }
                          }}
                          className={cn('h-9 text-xs', !ddm && 'border-destructive/50')}
                          disabled={printingAll}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={1}
                          defaultValue={it.quantity}
                          key={`qty-${it.id}-${it.updated_at}`}
                          onBlur={e => {
                            const v = Math.max(1, Number(e.target.value) || 1);
                            if (v !== it.quantity) {
                              updateItem.mutate({ id: it.id, batch_id: batch.id, quantity: v });
                            }
                          }}
                          className="h-9 w-20"
                          disabled={printingAll}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('gap-1 border', s.cls)}>
                          <StatusIcon className={cn('h-3 w-3', it.status === 'printing' && 'animate-spin')} />
                          {s.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {it.status === 'failed' && (
                            <Button size="icon" variant="ghost" title="Réessayer" onClick={() => handleReprintFailed(it.id)} disabled={printingAll}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" title="Aperçu" onClick={() => setPreviewItem(it.id)} disabled={!p}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" title="Dupliquer" onClick={() => handleDuplicate(it.id)} disabled={printingAll}>
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon" variant="ghost" title="Supprimer"
                            onClick={() => deleteItem.mutate({ id: it.id, batch_id: batch.id })}
                            disabled={printingAll}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Preview panel */}
      {previewItem && previewProduct && previewItemRow && (
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Prévisualisation ZPL</CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setPreviewItem(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-2">
              {previewProduct.erp_code} · {previewProduct.erp_label}
            </div>
            <Separator className="my-2" />
            <pre className="text-[10px] font-mono bg-muted/30 p-3 rounded max-h-96 overflow-auto whitespace-pre-wrap break-all">
              {(() => {
                const { lot, ddm } = resolveLotDdm(previewItemRow);
                if (!lot || !ddm) return '⚠ Lot ou DDM manquant — saisissez ces valeurs avant la prévisualisation.';
                try {
                  return buildProductZpl({ product: previewProduct, lot, ddm, quantity: previewItemRow.quantity });
                } catch (e: any) { return `Erreur : ${e?.message}`; }
              })()}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
