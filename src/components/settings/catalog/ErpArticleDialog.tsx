import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import {
  useProductsMaster,
  useLabelTemplates,
  useErpArticleMutations,
} from '@/hooks/useProductCatalog';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  article?: any | null;
}

export function ErpArticleDialog({ open, onOpenChange, article }: Props) {
  const { data: products = [] } = useProductsMaster();
  const { data: templates = [] } = useLabelTemplates();
  const { create, update } = useErpArticleMutations();

  const [form, setForm] = useState({
    erp_code: '',
    erp_label: '',
    product_id: '',
    temperature_state: 'FR' as 'FR' | 'FZ',
    slicing_state: 'WHO' as 'SLI' | 'WHO',
    packaging_code: 'U01' as 'U01' | 'C04' | 'C05' | 'C18' | 'C24' | 'PAL',
    barcode_value: '',
    template_id: '',
    active: true,
  });

  useEffect(() => {
    if (article) {
      setForm({
        erp_code: article.erp_code,
        erp_label: article.erp_label,
        product_id: article.product_id,
        temperature_state: article.temperature_state,
        slicing_state: article.slicing_state,
        packaging_code: article.packaging_code,
        barcode_value: article.barcode_value || '',
        template_id: article.templates?.[0]?.template?.id || '',
        active: article.active,
      });
    } else {
      setForm({
        erp_code: '', erp_label: '', product_id: '',
        temperature_state: 'FR', slicing_state: 'WHO', packaging_code: 'U01',
        barcode_value: '', template_id: '', active: true,
      });
    }
  }, [article, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      erp_code: form.erp_code.trim().toUpperCase(),
      erp_label: form.erp_label.trim(),
      product_id: form.product_id,
      temperature_state: form.temperature_state,
      slicing_state: form.slicing_state,
      packaging_code: form.packaging_code,
      barcode_value: form.barcode_value.trim() || null,
      active: form.active,
      template_id: form.template_id || null,
    };
    if (article) {
      await update.mutateAsync({ id: article.id, ...payload } as any);
    } else {
      await create.mutateAsync(payload as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{article ? 'Modifier l\'article ERP' : 'Nouvel article ERP'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Code ERP *</Label>
              <Input required value={form.erp_code} onChange={(e) => setForm({ ...form, erp_code: e.target.value })} placeholder="PDM001-FR-WHO-U01" />
            </div>
            <div>
              <Label>Code-barres</Label>
              <Input value={form.barcode_value} onChange={(e) => setForm({ ...form, barcode_value: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Libellé ERP *</Label>
            <Input required value={form.erp_label} onChange={(e) => setForm({ ...form, erp_label: e.target.value })} />
          </div>
          <div>
            <Label>Produit maître *</Label>
            <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir un produit maître" /></SelectTrigger>
              <SelectContent>
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>{p.sku_base} — {p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label>Conditionnement *</Label>
              <Select value={form.packaging_code} onValueChange={(v: any) => setForm({ ...form, packaging_code: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="U01">U01 (unité)</SelectItem>
                  <SelectItem value="C04">C04 (carton 4)</SelectItem>
                  <SelectItem value="C05">C05 (carton 5)</SelectItem>
                  <SelectItem value="C18">C18 (carton 18)</SelectItem>
                  <SelectItem value="C24">C24 (carton 24)</SelectItem>
                  <SelectItem value="PAL">PAL (palette)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Template Zebra *</Label>
            <Select value={form.template_id} onValueChange={(v) => setForm({ ...form, template_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir un template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.template_code} — {t.template_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            <Label>Actif</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {article ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
