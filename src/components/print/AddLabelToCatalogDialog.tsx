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
        const langSuffix = language === 'fr' ? '' : `-${language.toUpperCase()}`;
        let translated: Record<string, string | null> = {
          translated_product_name: null,
          translated_ingredients_html: null,
          translated_allergen_statement: null,
          translated_traces_statement: null,
          translated_storage_instructions: null,
          translated_thawing_instructions: null,
          translated_at: null as any,
        };
        if (language !== 'fr') {
          // Récupère les textes source de la FT
          const { data: sheet, error: sErr } = await supabase
            .from('product_sheets')
            .select('product_name, inco_html, allergen_statement, snapshot_allergens, storage_instructions, thawing_instructions')
            .eq('id', sheetId)
            .single();
          if (sErr) throw sErr;
          const traces = (sheet as any)?.snapshot_allergens?.secondary?.join(', ') ?? '';
          toast.info('Traduction en cours…');
          const { data: tr, error: tErr } = await supabase.functions.invoke('translate-label', {
            body: {
              language,
              product_name: (sheet as any)?.product_name ?? '',
              ingredients_html: (sheet as any)?.inco_html ?? '',
              allergen_statement: (sheet as any)?.allergen_statement ?? '',
              traces_statement: traces,
              storage_instructions: (sheet as any)?.storage_instructions ?? '',
              thawing_instructions: (sheet as any)?.thawing_instructions ?? '',
            },
          });
          if (tErr) throw new Error(`Traduction échouée : ${tErr.message}`);
          translated = {
            translated_product_name: tr?.product_name ?? null,
            translated_ingredients_html: tr?.ingredients_html ?? null,
            translated_allergen_statement: tr?.allergen_statement ?? null,
            translated_traces_statement: tr?.traces_statement ?? null,
            translated_storage_instructions: tr?.storage_instructions ?? null,
            translated_thawing_instructions: tr?.thawing_instructions ?? null,
            translated_at: new Date().toISOString() as any,
          };
        }
        ({ error } = await supabase
          .from('product_sheet_packagings')
          .insert({
            product_sheet_id: sheetId,
            packaging_code: packagingCode,
            erp_code: `${baseRef}-${packagingCode}${langSuffix}`,
            erp_label: `${baseName} ${packagingCode}${langSuffix}`,
            temperature_state: 'FR',
            slicing_state: 'WHO',
            language,
            active: true,
            in_print_catalog: true,
            ...translated,
          } as any));
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
                  const inCatalog = existingMap.get(`${t.code}::${language}`)?.in_print_catalog;
                  return (
                    <SelectItem key={t.code} value={t.code} disabled={!!inCatalog}>
                      {t.code} — {t.label}{inCatalog ? ' (déjà dans le catalogue)' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Langue *</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Langue d'impression de l'étiquette. Une variante par langue est créée dans le catalogue.
            </p>
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
