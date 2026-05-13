import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { toast } from 'sonner';

interface Packaging {
  id: string;
  product_sheet_id: string;
  packaging_code: string;
}

interface Props {
  productSheetId: string;
  defaults?: {
    product_name?: string;
    product_reference?: string;
  };
}

export function PackagingsSection({ productSheetId, defaults }: Props) {
  const qc = useQueryClient();

  const { data: packagings = [] } = useQuery({
    queryKey: ['product_sheet_packagings', productSheetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_sheet_packagings')
        .select('id, product_sheet_id, packaging_code')
        .eq('product_sheet_id', productSheetId)
        .order('packaging_code');
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
        .order('quantity');
      if (error) throw error;
      return data;
    },
  });

  const selectedCodes = new Set(packagings.map((p) => p.packaging_code));

  const handleToggle = async (code: string) => {
    if (selectedCodes.has(code)) {
      const row = packagings.find((p) => p.packaging_code === code);
      if (!row) return;
      const { error } = await supabase
        .from('product_sheet_packagings')
        .delete()
        .eq('id', row.id);
      if (error) {
        toast.error('Erreur suppression', { description: error.message });
        return;
      }
    } else {
      const baseRef = defaults?.product_reference || 'PROD';
      const baseName = defaults?.product_name || 'Produit';
      const { error } = await supabase
        .from('product_sheet_packagings')
        .insert({
          product_sheet_id: productSheetId,
          packaging_code: code,
          erp_code: `${baseRef}-${code}`,
          erp_label: `${baseName} ${code}`,
          temperature_state: 'FR',
          slicing_state: 'WHO',
          active: true,
        });
      if (error) {
        toast.error('Erreur ajout', { description: error.message });
        return;
      }
    }
    qc.invalidateQueries({ queryKey: ['product_sheet_packagings', productSheetId] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 text-primary" />
        <h5 className="font-medium text-sm">
          Conditionnements disponibles ({packagings.length})
        </h5>
      </div>
      <p className="text-xs text-muted-foreground">
        Cliquez pour sélectionner les conditionnements proposés à l'impression d'étiquettes pour ce produit.
      </p>
      <div className="flex flex-wrap gap-2">
        {packagingTypes.map((t) => {
          const isSelected = selectedCodes.has(t.code);
          return (
            <Badge
              key={t.code}
              variant={isSelected ? 'default' : 'outline'}
              className={`cursor-pointer select-none transition-colors px-3 py-1.5 ${
                isSelected ? '' : 'opacity-60 hover:opacity-100'
              }`}
              onClick={() => handleToggle(t.code)}
            >
              {t.code} — {t.label}
            </Badge>
          );
        })}
        {packagingTypes.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            Aucun type de conditionnement défini. Créez-les dans Paramètres → Conditionnements.
          </p>
        )}
      </div>
    </div>
  );
}
