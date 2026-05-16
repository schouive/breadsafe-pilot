import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Trash2, Plus, Copy, Search, Loader2, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import { usePrintProducts, type PrintProduct } from '@/hooks/usePrintLabels';
import {
  useCreatePrintProgram, useUpdatePrintProgram, useReplaceProgramItems,
  usePrintProgramItems, type PrintProgram,
} from '@/hooks/usePrintPrograms';

interface RowDraft {
  packaging_id: string;
  default_quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  program: PrintProgram | null; // null = creation
  onSaved?: () => void;
}

function ProductPicker({ value, onSelect, products }: {
  value: string; onSelect: (id: string) => void; products: PrintProduct[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const current = products.find(p => p.id === value);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return products.slice(0, 40);
    return products.filter(p =>
      p.erp_code.toLowerCase().includes(s) ||
      p.label.toLowerCase().includes(s) ||
      p.erp_label.toLowerCase().includes(s)
    ).slice(0, 40);
  }, [products, q]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start font-mono text-xs h-9">
          {current ? (
            <span className="truncate">{current.erp_code} · {current.erp_label}</span>
          ) : (
            <span className="text-muted-foreground"><Search className="inline h-3 w-3 mr-1" />Choisir un article</span>
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
              onClick={() => { onSelect(p.id); setOpen(false); setQ(''); }}>
              <div className="font-mono text-xs">{p.erp_code}</div>
              <div className="text-muted-foreground text-xs truncate">{p.erp_label}</div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function ProgramFormDialog({ open, onOpenChange, program, onSaved }: Props) {
  const isEdit = !!program;
  const { data: products = [] } = usePrintProducts();
  const { data: existingItems } = usePrintProgramItems(program?.id);
  const create = useCreatePrintProgram();
  const update = useUpdatePrintProgram();
  const replaceItems = useReplaceProgramItems();

  const [name, setName] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [rows, setRows] = useState<RowDraft[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(program?.name ?? '');
    setCustomerCode(program?.customer_code ?? '');
    setCustomerName(program?.customer_name ?? '');
  }, [open, program]);

  useEffect(() => {
    if (!open) return;
    if (!existingItems) {
      setRows([]);
      return;
    }
    setRows(existingItems.map(it => ({
      packaging_id: it.packaging_id,
      default_quantity: it.default_quantity,
    })));
  }, [open, existingItems]);

  const updateRow = (idx: number, patch: Partial<RowDraft>) =>
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r));
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));
  const duplicateRow = (idx: number) => setRows(prev => {
    const copy = [...prev];
    copy.splice(idx + 1, 0, { ...prev[idx] });
    return copy;
  });
  const moveRow = (idx: number, dir: -1 | 1) => setRows(prev => {
    const j = idx + dir;
    if (j < 0 || j >= prev.length) return prev;
    const copy = [...prev];
    [copy[idx], copy[j]] = [copy[j], copy[idx]];
    return copy;
  });
  const addRow = () => setRows(prev => [...prev, { packaging_id: '', default_quantity: 0 }]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error('Le nom est obligatoire'); return; }
    const cleanRows = rows.filter(r => r.packaging_id);
    try {
      let pid = program?.id;
      if (isEdit && program) {
        await update.mutateAsync({
          id: program.id,
          name: name.trim(),
          customer_code: customerCode.trim() || null,
          customer_name: customerName.trim() || null,
        });
      } else {
        const created = await create.mutateAsync({
          name: name.trim(),
          customer_code: customerCode.trim() || null,
          customer_name: customerName.trim() || null,
        });
        pid = created.id;
      }
      if (pid) {
        await replaceItems.mutateAsync({
          programId: pid,
          items: cleanRows.map((r, i) => ({
            packaging_id: r.packaging_id,
            print_order: i,
            default_quantity: Math.max(0, r.default_quantity || 0),
          })),
        });
      }
      toast.success(isEdit ? 'Programme mis à jour' : 'Programme créé');
      onOpenChange(false);
      onSaved?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const saving = create.isPending || update.isPending || replaceItems.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le programme' : 'Nouveau programme'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="prog-name">Nom du programme *</Label>
            <Input id="prog-name" value={name} onChange={e => setName(e.target.value)} placeholder="Ex. Livraison hebdo Carrefour" />
          </div>
        </div>

        <div className="border rounded-md">
          <div className="flex items-center justify-between p-2 border-b bg-muted/40">
            <span className="text-sm font-semibold">Produits ({rows.length})</span>
            <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-4 w-4 mr-1" />Ajouter</Button>
          </div>
          <div className="divide-y">
            {rows.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">Aucun produit. Ajoutez des articles ERP.</div>
            ) : rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2 p-2">
                <span className="text-xs text-muted-foreground w-6 shrink-0 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <ProductPicker
                    value={r.packaging_id}
                    onSelect={id => updateRow(i, { packaging_id: id })}
                    products={products}
                  />
                </div>
                <Button size="icon" variant="ghost" onClick={() => moveRow(i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => moveRow(i, 1)} disabled={i === rows.length - 1}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => duplicateRow(i)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => removeRow(i)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? 'Enregistrer' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
