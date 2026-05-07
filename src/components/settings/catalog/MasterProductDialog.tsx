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
  useFamilies,
  useCatalogRecipes,
  useProductMasterMutations,
  ProductMaster,
} from '@/hooks/useProductCatalog';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product?: ProductMaster | null;
}

export function MasterProductDialog({ open, onOpenChange, product }: Props) {
  const { data: families = [] } = useFamilies();
  const { data: recipes = [] } = useCatalogRecipes();
  const { create, update } = useProductMasterMutations();

  const [form, setForm] = useState({
    sku_base: '',
    label: '',
    family_id: '',
    recipe_id: '',
    nutrition_profile_id: '',
    active: true,
  });

  useEffect(() => {
    if (product) {
      setForm({
        sku_base: product.sku_base,
        label: product.label,
        family_id: product.family_id || '',
        recipe_id: product.recipe_id || '',
        nutrition_profile_id: product.nutrition_profile_id || '',
        active: product.active,
      });
    } else {
      setForm({ sku_base: '', label: '', family_id: '', recipe_id: '', nutrition_profile_id: '', active: true });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      sku_base: form.sku_base.trim().toUpperCase(),
      label: form.label.trim(),
      family_id: form.family_id || null,
      recipe_id: form.recipe_id || null,
      nutrition_profile_id: form.nutrition_profile_id || null,
      active: form.active,
    };
    if (product) {
      await update.mutateAsync({ id: product.id, ...payload });
    } else {
      await create.mutateAsync(payload as any);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{product ? 'Modifier le produit maître' : 'Nouveau produit maître'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SKU base *</Label>
              <Input
                required
                value={form.sku_base}
                onChange={(e) => setForm({ ...form, sku_base: e.target.value })}
                placeholder="PDM001"
              />
            </div>
            <div>
              <Label>Famille</Label>
              <Select value={form.family_id} onValueChange={(v) => setForm({ ...form, family_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>
                  {families.map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>{f.code} — {f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Libellé *</Label>
            <Input
              required
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Pain de mie nature 14 cm"
            />
          </div>
          <div>
            <Label>Recette</Label>
            <Select value={form.recipe_id} onValueChange={(v) => setForm({ ...form, recipe_id: v })}>
              <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
              <SelectContent>
                {recipes.map((r: any) => (
                  <SelectItem key={r.id} value={r.id}>{r.code ? `${r.code} — ` : ''}{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Les ingrédients, allergènes et valeurs nutritionnelles sont récupérés automatiquement depuis la recette.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            <Label>Actif</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={create.isPending || update.isPending}>
              {product ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
