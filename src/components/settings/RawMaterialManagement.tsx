import { useState } from 'react';
import { Package, Plus, Edit2, X, Check, Thermometer, AlertTriangle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  useAllRawMaterials, 
  useCreateRawMaterial, 
  useUpdateRawMaterial, 
  useDeleteRawMaterial,
  useSuppliers,
  RawMaterial 
} from '@/hooks/useSuppliers';
import { cn } from '@/lib/utils';
import { TemperatureInput } from '@/components/ui/TemperatureInput';

const ALLERGEN_LIST = [
  'Gluten', 'Œufs', 'Lait', 'Fruits à coque', 'Arachides', 
  'Soja', 'Sésame', 'Moutarde', 'Céleri', 'Lupin',
  'Mollusques', 'Crustacés', 'Poisson', 'Sulfites'
];

const PURCHASE_UNITS = [
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'L', label: 'Litre (L)' },
  { value: 'piece', label: 'Pièce' },
];

const ORDER_UNITS = [
  { value: 'bidon', label: 'Bidon(s)' },
  { value: 'carton', label: 'Carton(s)' },
  { value: 'kg', label: 'kg' },
  { value: 'L', label: 'L' },
  { value: 'palette', label: 'Palette(s)' },
  { value: 'piece', label: 'Pièce(s)' },
  { value: 'ramette', label: 'Ramette(s)' },
  { value: 'sac', label: 'Sac(s)' },
  { value: 'seau', label: 'Sceau(x)' },
];

const MATERIAL_TYPES = [
  { value: 'farine', label: 'Farine' },
  { value: 'ingredient', label: 'Autre ingrédient' },
];

interface FormData {
  name: string;
  type: 'farine' | 'ingredient';
  supplier_id: string;
  category: string;
  unit: string;
  description: string;
  composition: string;
  allergens: string[];
  allergens_secondary: string[];
  energy_kcal: string;
  energy_kj: string;
  fat: string;
  saturated_fat: string;
  carbohydrates: string;
  sugars: string;
  fiber: string;
  protein: string;
  salt: string;
  // New purchase fields
  purchase_unit: string;
  purchase_price: string;
  density: string;
  order_unit: string;
  requires_cold_storage: boolean;
  requires_dlc_check: boolean;
  storage_temp_min: string;
  storage_temp_max: string;
}

const initialFormData: FormData = {
  name: '',
  type: 'ingredient',
  supplier_id: '',
  category: '',
  unit: 'kg',
  description: '',
  composition: '',
  allergens: [],
  allergens_secondary: [],
  energy_kcal: '',
  energy_kj: '',
  fat: '',
  saturated_fat: '',
  carbohydrates: '',
  sugars: '',
  fiber: '',
  protein: '',
  salt: '',
  purchase_unit: 'kg',
  purchase_price: '',
  density: '',
  order_unit: '',
  requires_cold_storage: false,
  requires_dlc_check: false,
  storage_temp_min: '',
  storage_temp_max: '',
};

// Calculate price in €/kg based on purchase unit and density
function calculatePricePerKg(purchasePrice: number | null, purchaseUnit: string, density: number | null): number | null {
  if (!purchasePrice) return null;
  
  switch (purchaseUnit) {
    case 'kg':
      return purchasePrice;
    case 'L':
      // Price per liter -> price per kg using density
      // density = mass/volume (kg/L), so price_kg = price_L / density
      if (density && density > 0) {
        return purchasePrice / density;
      }
      return null;
    case 'piece':
      // For piece, we need weight info - for now just store the price
      return purchasePrice;
    default:
      return purchasePrice;
  }
}

export function RawMaterialManagement() {
  const { data: allMaterials, isLoading } = useAllRawMaterials();
  const materials = allMaterials?.filter(m => (m as any).type_produit !== 'non_alimentaire');
  const { data: suppliers } = useSuppliers();
  const createMaterial = useCreateRawMaterial();
  const updateMaterial = useUpdateRawMaterial();
  const deleteMaterial = useDeleteRawMaterial();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<RawMaterial | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const resetForm = () => {
    setFormData(initialFormData);
  };

  const openEditDialog = (material: RawMaterial) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      type: material.type || 'ingredient',
      supplier_id: material.supplier_id || '',
      category: material.category || '',
      unit: material.unit || 'kg',
      description: material.description || '',
      composition: material.composition || '',
      allergens: material.allergens || [],
      allergens_secondary: material.allergens_secondary || [],
      energy_kcal: material.energy_kcal?.toString() || '',
      energy_kj: material.energy_kj?.toString() || '',
      fat: material.fat?.toString() || '',
      saturated_fat: material.saturated_fat?.toString() || '',
      carbohydrates: material.carbohydrates?.toString() || '',
      sugars: material.sugars?.toString() || '',
      fiber: material.fiber?.toString() || '',
      protein: material.protein?.toString() || '',
      salt: material.salt?.toString() || '',
      purchase_unit: material.purchase_unit || 'kg',
      purchase_price: material.purchase_price?.toString() || '',
      density: material.density?.toString() || '',
      order_unit: material.order_unit || '',
      requires_cold_storage: material.requires_cold_storage,
      requires_dlc_check: material.requires_dlc_check,
      storage_temp_min: material.storage_temp_min?.toString() || '',
      storage_temp_max: material.storage_temp_max?.toString() || '',
    });
  };

  const handleAdd = async () => {
    if (!formData.name.trim()) return;
    
    // Calculate the reference price in €/kg
    const purchasePrice = formData.purchase_price ? parseFloat(formData.purchase_price) : null;
    const density = formData.density ? parseFloat(formData.density) : null;
    const pricePerKg = calculatePricePerKg(purchasePrice, formData.purchase_unit, density);
    
    await createMaterial.mutateAsync({
      name: formData.name.trim(),
      type: formData.type,
      type_produit: 'alimentaire_MP',
      supplier_id: formData.supplier_id || null,
      category: formData.category || null,
      unit: formData.unit || null,
      description: formData.description.trim() || null,
      composition: formData.composition.trim() || null,
      allergens: formData.allergens.length > 0 ? formData.allergens : null,
      allergens_secondary: formData.allergens_secondary.length > 0 ? formData.allergens_secondary : null,
      energy_kcal: formData.energy_kcal ? parseFloat(formData.energy_kcal) : null,
      energy_kj: formData.energy_kj ? parseFloat(formData.energy_kj) : null,
      fat: formData.fat ? parseFloat(formData.fat) : null,
      saturated_fat: formData.saturated_fat ? parseFloat(formData.saturated_fat) : null,
      carbohydrates: formData.carbohydrates ? parseFloat(formData.carbohydrates) : null,
      sugars: formData.sugars ? parseFloat(formData.sugars) : null,
      fiber: formData.fiber ? parseFloat(formData.fiber) : null,
      protein: formData.protein ? parseFloat(formData.protein) : null,
      salt: formData.salt ? parseFloat(formData.salt) : null,
      price: pricePerKg,
      price_unit: 'kg',
      purchase_unit: formData.purchase_unit || null,
      purchase_price: purchasePrice,
      density: density,
      order_unit: formData.order_unit || null,
      supplier_reference: null,
      internal_comment: null,
      fds_url: null,
      requires_cold_storage: formData.requires_cold_storage,
      requires_dlc_check: formData.requires_dlc_check,
      storage_temp_min: formData.storage_temp_min ? parseFloat(formData.storage_temp_min) : null,
      storage_temp_max: formData.storage_temp_max ? parseFloat(formData.storage_temp_max) : null,
    });
    
    setIsAddOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingMaterial) return;
    
    // Calculate the reference price in €/kg
    const purchasePrice = formData.purchase_price ? parseFloat(formData.purchase_price) : null;
    const density = formData.density ? parseFloat(formData.density) : null;
    const pricePerKg = calculatePricePerKg(purchasePrice, formData.purchase_unit, density);
    
    await updateMaterial.mutateAsync({
      id: editingMaterial.id,
      name: formData.name.trim(),
      type: formData.type,
      supplier_id: formData.supplier_id || null,
      category: formData.category || null,
      unit: formData.unit || null,
      description: formData.description.trim() || null,
      composition: formData.composition.trim() || null,
      allergens: formData.allergens.length > 0 ? formData.allergens : null,
      allergens_secondary: formData.allergens_secondary.length > 0 ? formData.allergens_secondary : null,
      energy_kcal: formData.energy_kcal ? parseFloat(formData.energy_kcal) : null,
      energy_kj: formData.energy_kj ? parseFloat(formData.energy_kj) : null,
      fat: formData.fat ? parseFloat(formData.fat) : null,
      saturated_fat: formData.saturated_fat ? parseFloat(formData.saturated_fat) : null,
      carbohydrates: formData.carbohydrates ? parseFloat(formData.carbohydrates) : null,
      sugars: formData.sugars ? parseFloat(formData.sugars) : null,
      fiber: formData.fiber ? parseFloat(formData.fiber) : null,
      protein: formData.protein ? parseFloat(formData.protein) : null,
      salt: formData.salt ? parseFloat(formData.salt) : null,
      price: pricePerKg,
      price_unit: 'kg', // Always store reference price in €/kg
      purchase_unit: formData.purchase_unit || null,
      purchase_price: purchasePrice,
      density: density,
      order_unit: formData.order_unit || null,
      requires_cold_storage: formData.requires_cold_storage,
      requires_dlc_check: formData.requires_dlc_check,
      storage_temp_min: formData.storage_temp_min ? parseFloat(formData.storage_temp_min) : null,
      storage_temp_max: formData.storage_temp_max ? parseFloat(formData.storage_temp_max) : null,
    });
    
    setEditingMaterial(null);
    resetForm();
  };

  const handleToggleActive = async (material: RawMaterial) => {
    await updateMaterial.mutateAsync({
      id: material.id,
      is_active: !material.is_active,
    });
  };

  const toggleAllergen = (allergen: string, type: 'primary' | 'secondary') => {
    const field = type === 'primary' ? 'allergens' : 'allergens_secondary';
    const current = formData[field];
    const updated = current.includes(allergen)
      ? current.filter(a => a !== allergen)
      : [...current, allergen];
    setFormData({ ...formData, [field]: updated });
  };

  const closeEditDialog = () => {
    setEditingMaterial(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!deletingMaterial) return;
    await deleteMaterial.mutateAsync(deletingMaterial.id);
    setDeletingMaterial(null);
  };

  const renderFormFields = () => (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nom *</Label>
          <Input
            id="name"
            placeholder="Ex: Farine T55"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type de matière première *</Label>
          <Select 
            value={formData.type} 
            onValueChange={(value: 'farine' | 'ingredient') => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger id="type">
              <SelectValue placeholder="Sélectionnez le type" />
            </SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Les farines constituent la base de calcul (100%) des recettes
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="supplier">Fournisseur</Label>
          <Select 
            value={formData.supplier_id || '_none_'} 
            onValueChange={(value) => setFormData({ ...formData, supplier_id: value === '_none_' ? '' : value })}
          >
            <SelectTrigger id="supplier">
              <SelectValue placeholder="Sélectionnez un fournisseur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none_">
                <span className="text-muted-foreground italic">Aucun fournisseur</span>
              </SelectItem>
              {suppliers?.map(supplier => (
                <SelectItem key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Purchase Unit and Price Section */}
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          <Label className="text-base font-semibold">Prix d'achat</Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="purchase_unit">Unité d'achat</Label>
              <Select 
                value={formData.purchase_unit} 
                onValueChange={(value) => setFormData({ ...formData, purchase_unit: value })}
              >
                <SelectTrigger id="purchase_unit">
                  <SelectValue placeholder="Sélectionnez l'unité" />
                </SelectTrigger>
                <SelectContent>
                  {PURCHASE_UNITS.map(unit => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="purchase_price">Prix d'achat (€/{formData.purchase_unit})</Label>
              <Input
                id="purchase_price"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
              />
            </div>
          </div>

          {/* Density field - shown only when purchase_unit is 'L' */}
          {formData.purchase_unit === 'L' && (
            <div className="space-y-2">
              <Label htmlFor="density">Densité (kg/L) *</Label>
              <Input
                id="density"
                type="number"
                step="0.001"
                min="0.001"
                placeholder="Ex: 1.0 pour l'eau, 0.92 pour l'huile"
                value={formData.density}
                onChange={(e) => setFormData({ ...formData, density: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                La densité est obligatoire pour les matières achetées au litre. Elle permet de convertir le prix en €/kg.
              </p>
            </div>
          )}

          {/* Order Unit */}
          <div className="space-y-2">
            <Label htmlFor="order_unit">Unité de commande</Label>
            <Select 
              value={formData.order_unit || '_none_'} 
              onValueChange={(value) => setFormData({ ...formData, order_unit: value === '_none_' ? '' : value })}
            >
              <SelectTrigger id="order_unit">
                <SelectValue placeholder="Sélectionnez l'unité de commande" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none_">
                  <span className="text-muted-foreground italic">Non définie</span>
                </SelectItem>
                {ORDER_UNITS.map(unit => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Unité utilisée par défaut lors de la commande fournisseur
            </p>
          </div>

          {/* Calculated price display */}
          {formData.purchase_price && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-foreground">
                Prix de référence (€/kg) :{' '}
                <span className="text-primary font-bold">
                  {(() => {
                    const purchasePrice = parseFloat(formData.purchase_price);
                    const density = formData.density ? parseFloat(formData.density) : null;
                    const priceKg = calculatePricePerKg(purchasePrice, formData.purchase_unit, density);
                    if (priceKg !== null) {
                      return `${priceKg.toFixed(2)} €/kg`;
                    }
                    if (formData.purchase_unit === 'L' && !density) {
                      return 'Densité requise';
                    }
                    return `${purchasePrice.toFixed(2)} €/${formData.purchase_unit}`;
                  })()}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Ce prix sera utilisé pour tous les calculs de coût des recettes.
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Description de l'ingrédient..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="composition">Composition</Label>
          <Textarea
            id="composition"
            placeholder="Composition détaillée..."
            value={formData.composition}
            onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
            rows={3}
          />
        </div>
      </div>

      <Separator />

      {/* Allergens */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Allergènes Primaires</Label>
          <p className="text-xs text-muted-foreground">Allergènes présents dans l'ingrédient</p>
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            {ALLERGEN_LIST.map(allergen => (
              <Badge
                key={allergen}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors",
                  formData.allergens.includes(allergen)
                    ? "bg-destructive/20 text-destructive border-destructive"
                    : "hover:bg-muted"
                )}
                onClick={() => toggleAllergen(allergen, 'primary')}
              >
                {allergen}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Allergènes Secondaires</Label>
          <p className="text-xs text-muted-foreground">Traces possibles (contamination croisée)</p>
          <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
            {ALLERGEN_LIST.map(allergen => (
              <Badge
                key={allergen}
                variant="outline"
                className={cn(
                  "cursor-pointer transition-colors",
                  formData.allergens_secondary.includes(allergen)
                    ? "bg-warning/20 text-warning border-warning"
                    : "hover:bg-muted"
                )}
                onClick={() => toggleAllergen(allergen, 'secondary')}
              >
                {allergen}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <Separator />

      {/* Nutritional Values */}
      <div className="space-y-4">
        <Label className="text-base font-semibold">Valeurs nutritionnelles pour 100g</Label>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="energy_kcal">Énergie (kcal)</Label>
            <Input
              id="energy_kcal"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={formData.energy_kcal}
              onChange={(e) => setFormData({ ...formData, energy_kcal: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="energy_kj">Énergie (kJ)</Label>
            <Input
              id="energy_kj"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={formData.energy_kj}
              onChange={(e) => setFormData({ ...formData, energy_kj: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fat">Matières grasses (g)</Label>
            <Input
              id="fat"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={formData.fat}
              onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="saturated_fat">dont acides gras saturés (g)</Label>
            <Input
              id="saturated_fat"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={formData.saturated_fat}
              onChange={(e) => setFormData({ ...formData, saturated_fat: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="carbohydrates">Glucides (g)</Label>
            <Input
              id="carbohydrates"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={formData.carbohydrates}
              onChange={(e) => setFormData({ ...formData, carbohydrates: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sugars">dont sucres (g)</Label>
            <Input
              id="sugars"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={formData.sugars}
              onChange={(e) => setFormData({ ...formData, sugars: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fiber">Fibres (g)</Label>
            <Input
              id="fiber"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={formData.fiber}
              onChange={(e) => setFormData({ ...formData, fiber: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="protein">Protéines (g)</Label>
            <Input
              id="protein"
              type="number"
              step="0.1"
              min="0"
              placeholder="0"
              value={formData.protein}
              onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salt">Sel (g)</Label>
            <Input
              id="salt"
              type="number"
              step="0.01"
              min="0"
              placeholder="0"
              value={formData.salt}
              onChange={(e) => setFormData({ ...formData, salt: e.target.value })}
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Storage Settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Thermometer className="h-5 w-5 text-blue-500" />
            <div>
              <p className="font-medium">Stockage réfrigéré</p>
              <p className="text-sm text-muted-foreground">Ce produit nécessite une température contrôlée</p>
            </div>
          </div>
          <Switch
            checked={formData.requires_cold_storage}
            onCheckedChange={(checked) => setFormData({ ...formData, requires_cold_storage: checked })}
          />
        </div>

        {formData.requires_cold_storage && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Temp. min (°C)</Label>
              <TemperatureInput
                value={formData.storage_temp_min}
                onChange={(val) => setFormData({ ...formData, storage_temp_min: val })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Temp. max (°C)</Label>
              <TemperatureInput
                value={formData.storage_temp_max}
                onChange={(val) => setFormData({ ...formData, storage_temp_max: val })}
                placeholder="4"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-orange-500" />
            <div>
              <p className="font-medium">CP8 - Contrôle DLC</p>
              <p className="text-sm text-muted-foreground">Ce produit nécessite un contrôle quotidien des dates de péremption</p>
            </div>
          </div>
          <Switch
            checked={formData.requires_dlc_check}
            onCheckedChange={(checked) => setFormData({ ...formData, requires_dlc_check: checked })}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Ingrédients</CardTitle>
                <CardDescription>Gérez vos ingrédients et leurs caractéristiques</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : materials?.length === 0 ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Aucun ingrédient configuré</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un ingrédient
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {materials?.map((material) => (
                <div 
                  key={material.id} 
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border",
                    material.is_active ? "bg-card" : "bg-muted/50 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{material.name}</p>
                        {material.requires_cold_storage && (
                          <Thermometer className="h-4 w-4 text-blue-500" />
                        )}
                        {material.requires_dlc_check && (
                          <Clock className="h-4 w-4 text-orange-500" />
                        )}
                        {((material.allergens && material.allergens.length > 0) || 
                          (material.allergens_secondary && material.allergens_secondary.length > 0)) && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {material.suppliers?.name}
                        {material.requires_cold_storage && material.storage_temp_min !== null && 
                          ` • ${material.storage_temp_min}°C à ${material.storage_temp_max}°C`}
                      </p>
                      {material.allergens && material.allergens.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {material.allergens.map(allergen => (
                            <Badge key={allergen} variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/30">
                              {allergen}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {material.allergens_secondary && material.allergens_secondary.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {material.allergens_secondary.map(allergen => (
                            <Badge key={allergen} variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                              Traces: {allergen}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={material.is_active ? 'bg-success/10 text-success border-success/30' : ''}
                    >
                      {material.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => openEditDialog(material)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleToggleActive(material)}
                    >
                      {material.is_active ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => setDeletingMaterial(material)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={(open) => { if (!open) resetForm(); setIsAddOpen(open); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un ingrédient</DialogTitle>
            <DialogDescription>
              Enregistrez un nouvel ingrédient avec ses caractéristiques
            </DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={createMaterial.isPending || !formData.name.trim()}
            >
              {createMaterial.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier l'ingrédient</DialogTitle>
            <DialogDescription>
              Modifiez les caractéristiques de cet ingrédient
            </DialogDescription>
          </DialogHeader>
          {renderFormFields()}
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateMaterial.isPending || !formData.name.trim()}
            >
              {updateMaterial.isPending ? 'Mise à jour...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingMaterial} onOpenChange={(open) => !open && setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'ingrédient ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer <strong>{deletingMaterial?.name}</strong> ? 
              Cette action est irréversible. Si cet ingrédient est utilisé dans des recettes, la suppression échouera.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMaterial.isPending ? 'Suppression...' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
