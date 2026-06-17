import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LANGUAGES = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
];

export function AddLabelToCatalogDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [sheetId, setSheetId] = useState<string>('');
  const [packagingCode, setPackagingCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('fr');
  const [saving, setSaving] = useState(false);

  // Fiches techniques validées (INCO validé)
  const { data: sheets = [] } = useQuery({
    queryKey: ['product_sheets-validated-for-catalog'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheets')
        .select('id, product_name, product_reference, inco_status')
        .eq('inco_status', 'validated')
        .order('product_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: packagingTypes = [] } = useQuery({
    queryKey: ['packaging_types_active'],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_types')
        .select('code, label, quantity')
        .eq('active', true)
        .order('quantity');
      if (error) throw error;
      return data;
    },
  });

  // Conditionnements de la FT sélectionnée + statut catalogue
  const { data: existing = [] } = useQuery({
    queryKey: ['psp-existing', sheetId],
    enabled: open && !!sheetId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheet_packagings')
        .select('id, packaging_code, in_print_catalog, language')
        .eq('product_sheet_id', sheetId);
      if (error) throw error;
      return data as { id: string; packaging_code: string; in_print_catalog: boolean; language: string }[];
    },
  });

  const existingMap = useMemo(() => {
    const m = new Map<string, { id: string; in_print_catalog: boolean }>();
    existing.forEach((r) => m.set(`${r.packaging_code}::${r.language ?? 'fr'}`, { id: r.id, in_print_catalog: r.in_print_catalog }));
    return m;
  }, [existing]);
  const selectedSheet = sheets.find((s: any) => s.id === sheetId);

  const reset = () => {
    setSheetId('');
    setPackagingCode('');
    setLanguage('fr');
  };

  const handleSubmit = async () => {
    if (!sheetId || !packagingCode || !selectedSheet) {
      toast.error('Sélectionnez une fiche technique et un conditionnement');
      return;
    }
    const already = existingMap.get(`${packagingCode}::${language}`);
    if (already?.in_print_catalog) {
      toast.error('Cette étiquette est déjà dans le catalogue');
      return;
    }
    setSaving(true);
    try {
      const baseRef = (selectedSheet as any).product_reference || 'PROD';
      const baseName = (selectedSheet as any).product_name || 'Produit';
      let error: any = null;
      if (already) {
        // Le conditionnement existe déjà sur la FT mais pas dans le catalogue → activer le flag
        ({ error } = await supabase
          .from('product_sheet_packagings')
          .update({ in_print_catalog: true, active: true })
          .eq('id', already.id));
      } else {
        ({ error } = await supabase
          .from('product_sheet_packagings')
          .insert({
            product_sheet_id: sheetId,
            packaging_code: packagingCode,
            erp_code: `${baseRef}-${packagingCode}`,
            erp_label: `${baseName} ${packagingCode}`,
            temperature_state: 'FR',
            slicing_state: 'WHO',
            active: true,
            in_print_catalog: true,
          }));
      }
      if (error) throw error;
      toast.success('Étiquette ajoutée au catalogue');
      qc.invalidateQueries({ queryKey: ['print_products_psp'] });
      qc.invalidateQueries({ queryKey: ['product_sheet_packagings', sheetId] });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erreur lors de l'ajout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une étiquette au catalogue</DialogTitle>
          <DialogDescription>
            Choisissez une fiche technique validée et un conditionnement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Fiche technique validée *</Label>
            <Select value={sheetId} onValueChange={(v) => { setSheetId(v); setPackagingCode(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une fiche technique" />
              </SelectTrigger>
              <SelectContent>
                {sheets.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Aucune fiche technique validée
                  </div>
                )}
                {sheets.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.product_name}
                    {s.product_reference ? ` — ${s.product_reference}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Conditionnement *</Label>
            <Select value={packagingCode} onValueChange={setPackagingCode} disabled={!sheetId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un conditionnement" />
              </SelectTrigger>
              <SelectContent>
                {packagingTypes.map((t: any) => {
                  const inCatalog = existingMap.get(t.code)?.in_print_catalog;
                  return (
                    <SelectItem key={t.code} value={t.code} disabled={!!inCatalog}>
                      {t.code} — {t.label}{inCatalog ? ' (déjà dans le catalogue)' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !sheetId || !packagingCode}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Ajouter
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
