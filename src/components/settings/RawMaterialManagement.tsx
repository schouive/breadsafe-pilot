import { useState } from 'react';
import { Package, Plus, Edit2, X, Check, Thermometer, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { 
  useAllRawMaterials, 
  useCreateRawMaterial, 
  useUpdateRawMaterial, 
  useSuppliers,
  RawMaterial 
} from '@/hooks/useSuppliers';
import { cn } from '@/lib/utils';

const ALLERGEN_LIST = [
  'Gluten', 'Œufs', 'Lait', 'Fruits à coque', 'Arachides', 
  'Soja', 'Sésame', 'Moutarde', 'Céleri', 'Lupin',
  'Mollusques', 'Crustacés', 'Poisson', 'Sulfites'
];

const CATEGORIES = [
  'Farines', 'Produits laitiers', 'Œufs', 'Levures', 'Matières grasses',
  'Sucres', 'Fruits secs', 'Chocolat', 'Arômes', 'Autres'
];

const UNITS = ['kg', 'L', 'unité', 'carton', 'palette'];

export function RawMaterialManagement() {
  const { data: materials, isLoading } = useAllRawMaterials();
  const { data: suppliers } = useSuppliers();
  const createMaterial = useCreateRawMaterial();
  const updateMaterial = useUpdateRawMaterial();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    supplier_id: '',
    category: '',
    unit: 'kg',
    requires_cold_storage: false,
    storage_temp_min: '',
    storage_temp_max: '',
    allergens: [] as string[],
  });

  const resetForm = () => {
    setFormData({
      name: '',
      supplier_id: '',
      category: '',
      unit: 'kg',
      requires_cold_storage: false,
      storage_temp_min: '',
      storage_temp_max: '',
      allergens: [],
    });
  };

  const handleAdd = async () => {
    if (!formData.name.trim() || !formData.supplier_id) return;
    
    await createMaterial.mutateAsync({
      name: formData.name.trim(),
      supplier_id: formData.supplier_id,
      category: formData.category || null,
      unit: formData.unit || null,
      requires_cold_storage: formData.requires_cold_storage,
      storage_temp_min: formData.storage_temp_min ? parseFloat(formData.storage_temp_min) : null,
      storage_temp_max: formData.storage_temp_max ? parseFloat(formData.storage_temp_max) : null,
      allergens: formData.allergens.length > 0 ? formData.allergens : null,
    });
    
    setIsAddOpen(false);
    resetForm();
  };

  const handleUpdate = async () => {
    if (!editingMaterial) return;
    
    await updateMaterial.mutateAsync({
      id: editingMaterial.id,
      name: editingMaterial.name,
      supplier_id: editingMaterial.supplier_id,
      category: editingMaterial.category,
      unit: editingMaterial.unit,
      requires_cold_storage: editingMaterial.requires_cold_storage,
      storage_temp_min: editingMaterial.storage_temp_min,
      storage_temp_max: editingMaterial.storage_temp_max,
      allergens: editingMaterial.allergens,
    });
    
    setEditingMaterial(null);
  };

  const handleToggleActive = async (material: RawMaterial) => {
    await updateMaterial.mutateAsync({
      id: material.id,
      is_active: !material.is_active,
    });
  };

  const toggleAllergen = (allergen: string, isEditing: boolean) => {
    if (isEditing && editingMaterial) {
      const current = editingMaterial.allergens || [];
      const updated = current.includes(allergen)
        ? current.filter(a => a !== allergen)
        : [...current, allergen];
      setEditingMaterial({ ...editingMaterial, allergens: updated });
    } else {
      const updated = formData.allergens.includes(allergen)
        ? formData.allergens.filter(a => a !== allergen)
        : [...formData.allergens, allergen];
      setFormData({ ...formData, allergens: updated });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Matières Premières</CardTitle>
                <CardDescription>Gérez vos matières premières et leurs caractéristiques</CardDescription>
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
              <p className="text-muted-foreground">Aucune matière première configurée</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => setIsAddOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Ajouter une matière première
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
                        {material.allergens && material.allergens.length > 0 && (
                          <AlertTriangle className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {material.suppliers?.name}
                        {material.category && ` • ${material.category}`}
                        {material.requires_cold_storage && material.storage_temp_min !== null && 
                          ` • ${material.storage_temp_min}°C à ${material.storage_temp_max}°C`}
                      </p>
                      {material.allergens && material.allergens.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {material.allergens.map(allergen => (
                            <Badge key={allergen} variant="outline" className="text-xs bg-warning/10 text-warning border-warning/30">
                              {allergen}
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
                      onClick={() => setEditingMaterial(material)}
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter une matière première</DialogTitle>
            <DialogDescription>
              Enregistrez une nouvelle matière première
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="material-name">Nom *</Label>
              <Input
                id="material-name"
                placeholder="Ex: Farine T55"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="supplier">Fournisseur *</Label>
              <Select 
                value={formData.supplier_id} 
                onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
              >
                <SelectTrigger id="supplier">
                  <SelectValue placeholder="Sélectionnez un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Catégorie</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unité</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={(value) => setFormData({ ...formData, unit: value })}
                >
                  <SelectTrigger id="unit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(unit => (
                      <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

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
                  <Label htmlFor="temp-min">Temp. min (°C)</Label>
                  <Input
                    id="temp-min"
                    type="number"
                    step="0.5"
                    placeholder="0"
                    value={formData.storage_temp_min}
                    onChange={(e) => setFormData({ ...formData, storage_temp_min: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temp-max">Temp. max (°C)</Label>
                  <Input
                    id="temp-max"
                    type="number"
                    step="0.5"
                    placeholder="4"
                    value={formData.storage_temp_max}
                    onChange={(e) => setFormData({ ...formData, storage_temp_max: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Allergènes</Label>
              <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                {ALLERGEN_LIST.map(allergen => (
                  <Badge
                    key={allergen}
                    variant="outline"
                    className={cn(
                      "cursor-pointer transition-colors",
                      formData.allergens.includes(allergen)
                        ? "bg-warning/20 text-warning border-warning"
                        : "hover:bg-muted"
                    )}
                    onClick={() => toggleAllergen(allergen, false)}
                  >
                    {allergen}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
              Annuler
            </Button>
            <Button 
              onClick={handleAdd}
              disabled={createMaterial.isPending || !formData.name.trim() || !formData.supplier_id}
            >
              {createMaterial.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && setEditingMaterial(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier la matière première</DialogTitle>
            <DialogDescription>
              Modifiez les caractéristiques de cette matière première
            </DialogDescription>
          </DialogHeader>
          {editingMaterial && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-material-name">Nom *</Label>
                <Input
                  id="edit-material-name"
                  value={editingMaterial.name}
                  onChange={(e) => setEditingMaterial({ ...editingMaterial, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-supplier">Fournisseur *</Label>
                <Select 
                  value={editingMaterial.supplier_id} 
                  onValueChange={(value) => setEditingMaterial({ ...editingMaterial, supplier_id: value })}
                >
                  <SelectTrigger id="edit-supplier">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers?.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-category">Catégorie</Label>
                  <Select 
                    value={editingMaterial.category || ''} 
                    onValueChange={(value) => setEditingMaterial({ ...editingMaterial, category: value || null })}
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue placeholder="Catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-unit">Unité</Label>
                  <Select 
                    value={editingMaterial.unit || 'kg'} 
                    onValueChange={(value) => setEditingMaterial({ ...editingMaterial, unit: value })}
                  >
                    <SelectTrigger id="edit-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNITS.map(unit => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Thermometer className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="font-medium">Stockage réfrigéré</p>
                    <p className="text-sm text-muted-foreground">Ce produit nécessite une température contrôlée</p>
                  </div>
                </div>
                <Switch
                  checked={editingMaterial.requires_cold_storage}
                  onCheckedChange={(checked) => setEditingMaterial({ ...editingMaterial, requires_cold_storage: checked })}
                />
              </div>

              {editingMaterial.requires_cold_storage && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-temp-min">Temp. min (°C)</Label>
                    <Input
                      id="edit-temp-min"
                      type="number"
                      step="0.5"
                      value={editingMaterial.storage_temp_min ?? ''}
                      onChange={(e) => setEditingMaterial({ 
                        ...editingMaterial, 
                        storage_temp_min: e.target.value ? parseFloat(e.target.value) : null 
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-temp-max">Temp. max (°C)</Label>
                    <Input
                      id="edit-temp-max"
                      type="number"
                      step="0.5"
                      value={editingMaterial.storage_temp_max ?? ''}
                      onChange={(e) => setEditingMaterial({ 
                        ...editingMaterial, 
                        storage_temp_max: e.target.value ? parseFloat(e.target.value) : null 
                      })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Allergènes</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg">
                  {ALLERGEN_LIST.map(allergen => (
                    <Badge
                      key={allergen}
                      variant="outline"
                      className={cn(
                        "cursor-pointer transition-colors",
                        (editingMaterial.allergens || []).includes(allergen)
                          ? "bg-warning/20 text-warning border-warning"
                          : "hover:bg-muted"
                      )}
                      onClick={() => toggleAllergen(allergen, true)}
                    >
                      {allergen}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingMaterial(null)}>
              Annuler
            </Button>
            <Button 
              onClick={handleUpdate}
              disabled={updateMaterial.isPending}
            >
              {updateMaterial.isPending ? 'Mise à jour...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
