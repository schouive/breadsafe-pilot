import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveRecipes, useCreateProductSheet, useUpdateProductSheet, ProductSheet } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';

const WEIGHT_UNITS = ['g', 'kg', 'L', 'mL', 'cl'];

interface ProductSheetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: ProductSheet | null;
}

export function ProductSheetFormDialog({ open, onOpenChange, sheet }: ProductSheetFormDialogProps) {
  const { user } = useAuth();
  const { data: recipes } = useActiveRecipes();
  const createSheet = useCreateProductSheet();
  const updateSheet = useUpdateProductSheet();
  
  const [formData, setFormData] = useState({
    recipe_id: '',
    product_name: '',
    brand: '',
    barcode: '',
    net_weight: '',
    net_weight_unit: 'g',
    shelf_life_days: '',
    storage_instructions: '',
    usage_instructions: '',
    origin_country: '',
    allergen_statement: '',
    ingredients_declaration: '',
    is_published: false,
  });

  useEffect(() => {
    if (sheet) {
      setFormData({
        recipe_id: sheet.recipe_id,
        product_name: sheet.product_name,
        brand: sheet.brand || '',
        barcode: sheet.barcode || '',
        net_weight: sheet.net_weight?.toString() || '',
        net_weight_unit: sheet.net_weight_unit || 'g',
        shelf_life_days: sheet.shelf_life_days?.toString() || '',
        storage_instructions: sheet.storage_instructions || '',
        usage_instructions: sheet.usage_instructions || '',
        origin_country: sheet.origin_country || '',
        allergen_statement: sheet.allergen_statement || '',
        ingredients_declaration: sheet.ingredients_declaration || '',
        is_published: sheet.is_published,
      });
    } else {
      setFormData({
        recipe_id: '',
        product_name: '',
        brand: '',
        barcode: '',
        net_weight: '',
        net_weight_unit: 'g',
        shelf_life_days: '',
        storage_instructions: '',
        usage_instructions: '',
        origin_country: '',
        allergen_statement: '',
        ingredients_declaration: '',
        is_published: false,
      });
    }
  }, [sheet, open]);

  const handleSubmit = async () => {
    if (!formData.recipe_id || !formData.product_name.trim()) return;
    
    const data = {
      recipe_id: formData.recipe_id,
      product_name: formData.product_name.trim(),
      brand: formData.brand.trim() || null,
      barcode: formData.barcode.trim() || null,
      net_weight: formData.net_weight ? parseFloat(formData.net_weight) : null,
      net_weight_unit: formData.net_weight_unit,
      shelf_life_days: formData.shelf_life_days ? parseInt(formData.shelf_life_days) : null,
      storage_instructions: formData.storage_instructions.trim() || null,
      usage_instructions: formData.usage_instructions.trim() || null,
      origin_country: formData.origin_country.trim() || null,
      allergen_statement: formData.allergen_statement.trim() || null,
      ingredients_declaration: formData.ingredients_declaration.trim() || null,
      is_published: formData.is_published,
      published_at: formData.is_published ? new Date().toISOString() : null,
      created_by: user?.id || null,
    };

    if (sheet) {
      await updateSheet.mutateAsync({ id: sheet.id, ...data });
    } else {
      await createSheet.mutateAsync(data);
    }
    
    onOpenChange(false);
  };

  const isSubmitting = createSheet.isPending || updateSheet.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{sheet ? 'Modifier la fiche' : 'Nouvelle fiche produit'}</DialogTitle>
          <DialogDescription>
            {sheet ? 'Modifiez les informations d\'étiquetage' : 'Créez une nouvelle fiche produit pour l\'étiquetage'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Informations de base
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="recipe">Recette associée *</Label>
              <Select
                value={formData.recipe_id}
                onValueChange={(value) => setFormData({ ...formData, recipe_id: value })}
              >
                <SelectTrigger id="recipe">
                  <SelectValue placeholder="Sélectionnez une recette" />
                </SelectTrigger>
                <SelectContent>
                  {recipes?.map((recipe) => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.name}
                      {recipe.code && <span className="text-muted-foreground ml-2">({recipe.code})</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-name">Dénomination de vente *</Label>
                <Input
                  id="product-name"
                  placeholder="Ex: Pain de campagne"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marque</Label>
                <Input
                  id="brand"
                  placeholder="Ex: Breadshop"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="barcode">Code-barres</Label>
                <Input
                  id="barcode"
                  placeholder="3701234567890"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="net-weight">Poids net</Label>
                <Input
                  id="net-weight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="500"
                  value={formData.net_weight}
                  onChange={(e) => setFormData({ ...formData, net_weight: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight-unit">Unité</Label>
                <Select
                  value={formData.net_weight_unit}
                  onValueChange={(value) => setFormData({ ...formData, net_weight_unit: value })}
                >
                  <SelectTrigger id="weight-unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WEIGHT_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Conservation & Origin */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Conservation & Origine
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="shelf-life">Durée de vie (jours)</Label>
                <Input
                  id="shelf-life"
                  type="number"
                  min="0"
                  placeholder="3"
                  value={formData.shelf_life_days}
                  onChange={(e) => setFormData({ ...formData, shelf_life_days: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin">Pays d'origine</Label>
                <Input
                  id="origin"
                  placeholder="France"
                  value={formData.origin_country}
                  onChange={(e) => setFormData({ ...formData, origin_country: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage">Conditions de conservation</Label>
              <Textarea
                id="storage"
                placeholder="À conserver au sec et à l'abri de la lumière..."
                value={formData.storage_instructions}
                onChange={(e) => setFormData({ ...formData, storage_instructions: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="usage">Conseils d'utilisation</Label>
              <Textarea
                id="usage"
                placeholder="À consommer de préférence légèrement réchauffé..."
                value={formData.usage_instructions}
                onChange={(e) => setFormData({ ...formData, usage_instructions: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Labeling */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Étiquetage réglementaire
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="ingredients">Déclaration des ingrédients</Label>
              <Textarea
                id="ingredients"
                placeholder="Farine de blé (GLUTEN), eau, levure, sel..."
                value={formData.ingredients_declaration}
                onChange={(e) => setFormData({ ...formData, ingredients_declaration: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergens">Mention des allergènes</Label>
              <Textarea
                id="allergens"
                placeholder="Peut contenir des traces de fruits à coque..."
                value={formData.allergen_statement}
                onChange={(e) => setFormData({ ...formData, allergen_statement: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Publish */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Fiche publiée</p>
              <p className="text-sm text-muted-foreground">
                La fiche est validée et prête à l'utilisation
              </p>
            </div>
            <Switch
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.recipe_id || !formData.product_name.trim()}
          >
            {isSubmitting ? 'Enregistrement...' : sheet ? 'Modifier' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
