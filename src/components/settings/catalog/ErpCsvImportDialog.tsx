import { useState } from 'react';
import Papa from 'papaparse';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

interface CsvRow {
  erp_code: string;
  erp_label: string;
  sku_base_master: string;
  temperature: string;
  slicing: string;
  packaging: string;
  barcode?: string;
  template_code: string;
}

interface ValidatedRow extends CsvRow {
  __row: number;
  __errors: string[];
  product_id?: string;
  template_id?: string;
}

const TEMP_VALS = ['FR', 'FZ'];
const SLI_VALS = ['SLI', 'WHO'];
const PACK_VALS = ['U01', 'C05', 'C24', 'PAL'];

export function ErpCsvImportDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);

  const handleFile = (file: File) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: async (res) => {
        const { data: products } = await supabase
          .from('products_master')
          .select('id, sku_base');
        const { data: templates } = await supabase
          .from('label_templates')
          .select('id, template_code');

        const prodMap = new Map((products || []).map((p) => [p.sku_base.toUpperCase(), p.id]));
        const tplMap = new Map((templates || []).map((t) => [t.template_code.toUpperCase(), t.id]));

        const validated: ValidatedRow[] = res.data.map((r, i) => {
          const errs: string[] = [];
          if (!r.erp_code?.trim()) errs.push('code ERP manquant');
          if (!r.erp_label?.trim()) errs.push('libellé manquant');
          if (!TEMP_VALS.includes(r.temperature?.trim())) errs.push('température invalide');
          if (!SLI_VALS.includes(r.slicing?.trim())) errs.push('découpe invalide');
          if (!PACK_VALS.includes(r.packaging?.trim())) errs.push('conditionnement invalide');
          const product_id = prodMap.get(r.sku_base_master?.trim().toUpperCase());
          if (!product_id) errs.push(`produit maître "${r.sku_base_master}" introuvable`);
          const template_id = tplMap.get(r.template_code?.trim().toUpperCase());
          if (!template_id) errs.push(`template "${r.template_code}" introuvable`);
          return { ...r, __row: i + 2, __errors: errs, product_id, template_id };
        });
        setRows(validated);
      },
      error: (err) => toast.error('Erreur de parsing : ' + err.message),
    });
  };

  const validRows = rows.filter((r) => r.__errors.length === 0);
  const errorRows = rows.filter((r) => r.__errors.length > 0);

  const handleImport = async () => {
    setImporting(true);
    try {
      const articles = validRows.map((r) => ({
        erp_code: r.erp_code.trim().toUpperCase(),
        erp_label: r.erp_label.trim(),
        product_id: r.product_id!,
        temperature_state: r.temperature.trim(),
        slicing_state: r.slicing.trim(),
        packaging_code: r.packaging.trim(),
        barcode_value: r.barcode?.trim() || null,
        active: true,
      }));
      const { data: inserted, error } = await supabase
        .from('erp_articles')
        .upsert(articles, { onConflict: 'erp_code' })
        .select('id, erp_code');
      if (error) throw error;

      const codeToId = new Map((inserted || []).map((a) => [a.erp_code, a.id]));
      const links = validRows
        .map((r) => ({
          erp_article_id: codeToId.get(r.erp_code.trim().toUpperCase()),
          template_id: r.template_id!,
        }))
        .filter((l) => l.erp_article_id);
      if (links.length) {
        await supabase.from('article_templates').upsert(links, {
          onConflict: 'erp_article_id,template_id',
        });
      }
      toast.success(`${validRows.length} articles importés`);
      qc.invalidateQueries({ queryKey: ['erp_articles'] });
      onOpenChange(false);
      setRows([]);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importer un CSV d'articles ERP</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Format attendu (séparateur <code>;</code>, en-tête obligatoire) :<br />
              <code>erp_code;erp_label;sku_base_master;temperature;slicing;packaging;barcode;template_code</code>
            </AlertDescription>
          </Alert>

          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {rows.length > 0 && (
            <>
              <div className="flex gap-3">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {validRows.length} valides
                </Badge>
                {errorRows.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errorRows.length} en erreur
                  </Badge>
                )}
              </div>

              {errorRows.length > 0 && (
                <ScrollArea className="h-48 rounded border p-3">
                  <div className="space-y-1 text-xs">
                    {errorRows.map((r) => (
                      <div key={r.__row} className="text-destructive">
                        <strong>Ligne {r.__row}</strong> ({r.erp_code || '—'}) : {r.__errors.join(', ')}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            onClick={handleImport}
            disabled={validRows.length === 0 || importing}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importer {validRows.length} article(s)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
