import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Package } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface Packaging {
  id: string;
  product_sheet_id: string;
  packaging_code: string;
  erp_code: string;
  erp_label: string;
  barcode_value: string | null;
  temperature_state: string;
  slicing_state: string;
  pieces_per_carton: number | null;
  carton_weight: number | null;
  carton_dimensions: string | null;
  template_id: string | null;
  active: boolean;
  print_order: number;
}

interface Defaults {
  pieces_per_carton?: string;
  carton_weight?: string;
  carton_dimensions?: string;
  product_name?: string;
  product_reference?: string;
}

interface Props {
  productSheetId: string;
  defaults?: Defaults;
}

export function PackagingsSection({ productSheetId, defaults }: Props) {
  const qc = useQueryClient();

  const { data: packagings = [], isLoading } = useQuery({
    queryKey: ['product_sheet_packagings', productSheetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheet_packagings')
        .select('*')
        .eq('product_sheet_id', productSheetId)
        .order('print_order');
      if (error) throw error;
      return data as Packaging[];
    },
    enabled: !!productSheetId,
  });

  const { data: packagingTypes = [] } = useQuery({
    queryKey: ['packaging_types_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packaging_types')
        .select('code, label, quantity')
        .eq('active', true)
        .order('code');
      if (error) throw error;
      return data;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['label_templates_active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('label_templates')
        .select('id, template_name, template_code')
        .eq('active', true)
        .order('template_name');
      if (error) throw error;
      return data;
    },
  });

  const [drafts, setDrafts] = useState<Record<string, Packaging>>({});

  useEffect(() => {
    const map: Record<string, Packaging> = {};
    packagings.forEach((p) => (map[p.id] = p));
    setDrafts(map);
  }, [packagings]);

  const update = (id: string, patch: Partial<Packaging>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const handleAdd = async () => {
    const baseCode = defaults?.product_reference || 'PROD';
    const nextOrder = packagings.length;
    const firstCode = packagingTypes[0]?.code || 'U01';
    const { data, error } = await supabase
      .from('product_sheet_packagings')
      .insert({
        product_sheet_id: productSheetId,
        packaging_code: firstCode,
        erp_code: `${baseCode}-${firstCode}`,
        erp_label: defaults?.product_name
          ? `${defaults.product_name} ${firstCode}`
          : `Conditionnement ${firstCode}`,
        temperature_state: 'FR',
        slicing_state: 'WHO',
        pieces_per_carton: defaults?.pieces_per_carton
          ? parseInt(defaults.pieces_per_carton)
          : null,
        carton_weight: defaults?.carton_weight
          ? parseFloat(defaults.carton_weight)
          : null,
        carton_dimensions: defaults?.carton_dimensions || null,
        active: true,
        print_order: nextOrder,
      })
      .select()
      .single();
    if (error) {
      toast.error('Erreur ajout conditionnement', { description: error.message });
      return;
    }
    qc.invalidateQueries({ queryKey: ['product_sheet_packagings', productSheetId] });
  };

  const handleSave = async (id: string) => {
    const d = drafts[id];
    if (!d) return;
    const { error } = await supabase
      .from('product_sheet_packagings')
      .update({
        packaging_code: d.packaging_code,
        erp_code: d.erp_code,
        erp_label: d.erp_label,
        barcode_value: d.barcode_value || null,
        temperature_state: d.temperature_state,
        slicing_state: d.slicing_state,
        pieces_per_carton: d.pieces_per_carton ?? null,
        carton_weight: d.carton_weight ?? null,
        carton_dimensions: d.carton_dimensions || null,
        template_id: d.template_id || null,
        active: d.active,
        print_order: d.print_order,
      })
      .eq('id', id);
    if (error) {
      toast.error('Erreur enregistrement', { description: error.message });
      return;
    }
    toast.success('Conditionnement enregistré');
    qc.invalidateQueries({ queryKey: ['product_sheet_packagings', productSheetId] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce conditionnement ?')) return;
    const { error } = await supabase
      .from('product_sheet_packagings')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Erreur suppression', { description: error.message });
      return;
    }
    qc.invalidateQueries({ queryKey: ['product_sheet_packagings', productSheetId] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          <h5 className="font-medium text-sm">
            Conditionnements ({packagings.length})
          </h5>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
      {!isLoading && packagings.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          Aucun conditionnement. Ajoutez-en un pour générer des étiquettes (U01, C04, C05, C18, C24, PAL).
        </p>
      )}

      <div className="space-y-3">
        {packagings.map((p) => {
          const d = drafts[p.id] || p;
          return (
            <div
              key={p.id}
              className="p-3 border rounded-lg bg-muted/20 space-y-3"
            >
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Code</Label>
                  <Select
                    value={d.packaging_code}
                    onValueChange={(v) => update(p.id, { packaging_code: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {packagingTypes.map((t) => (
                        <SelectItem key={t.code} value={t.code}>
                          {t.code} — {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Code ERP</Label>
                  <Input
                    className="h-9"
                    value={d.erp_code}
                    onChange={(e) => update(p.id, { erp_code: e.target.value })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Libellé ERP</Label>
                  <Input
                    className="h-9"
                    value={d.erp_label}
                    onChange={(e) => update(p.id, { erp_label: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Code-barres</Label>
                  <Input
                    className="h-9"
                    placeholder="EAN13"
                    value={d.barcode_value || ''}
                    onChange={(e) => update(p.id, { barcode_value: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pcs / carton</Label>
                  <Input
                    className="h-9"
                    type="number"
                    min="0"
                    value={d.pieces_per_carton ?? ''}
                    onChange={(e) =>
                      update(p.id, {
                        pieces_per_carton: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Poids carton (kg)</Label>
                  <Input
                    className="h-9"
                    type="number"
                    step="0.01"
                    min="0"
                    value={d.carton_weight ?? ''}
                    onChange={(e) =>
                      update(p.id, {
                        carton_weight: e.target.value ? parseFloat(e.target.value) : null,
                      })
                    }
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Dimensions carton</Label>
                  <Input
                    className="h-9"
                    placeholder="L x l x H cm"
                    value={d.carton_dimensions || ''}
                    onChange={(e) => update(p.id, { carton_dimensions: e.target.value })}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Template ZPL</Label>
                  <Select
                    value={d.template_id || 'none'}
                    onValueChange={(v) =>
                      update(p.id, { template_id: v === 'none' ? null : v })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Aucun template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucun —</SelectItem>
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.template_name} ({t.template_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={d.active}
                    onCheckedChange={(c) => update(p.id, { active: c })}
                  />
                  <span className="text-xs text-muted-foreground">
                    {d.active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSave(p.id)}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
