import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useCreateRecipeIngredient } from '@/hooks/useRecipes';
import { useAllRawMaterials } from '@/hooks/useSuppliers';

const UNITS = ['kg', 'g', 'L', 'mL', 'unité'];

interface IngredientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId: string;
}

export function IngredientFormDialog({ open, onOpenChange, recipeId }: IngredientFormDialogProps) {
  const { data: rawMaterials } = useAllRawMaterials();
  const createIngredient = useCreateRecipeIngredient();
  
  const [formData, setFormData] = useState({
    raw_material_id: '',
    quantity: '',
    unit: 'kg',
    notes: '',
  });

  const activeMaterials = rawMaterials?.filter(m => m.is_active) || [];

  const handleSubmit = async () => {
    if (!formData.raw_material_id || !formData.quantity) return;
    
    await createIngredient.mutateAsync({
      recipe_id: recipeId,
      raw_material_id: formData.raw_material_id,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      notes: formData.notes.trim() || null,
    });
    
    setFormData({
      raw_material_id: '',
      quantity: '',
      unit: 'kg',
      notes: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter un ingrédient</DialogTitle>
          <DialogDescription>
            Sélectionnez une matière première et sa quantité
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="raw-material">Matière première *</Label>
            <Select
              value={formData.raw_material_id}
              onValueChange={(value) => setFormData({ ...formData, raw_material_id: value })}
            >
              <SelectTrigger id="raw-material">
                <SelectValue placeholder="Sélectionnez une matière première" />
              </SelectTrigger>
              <SelectContent>
                {activeMaterials.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.name}
                    {material.suppliers?.name && (
                      <span className="text-muted-foreground ml-2">
                        ({material.suppliers.name})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantité *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.001"
                min="0"
                placeholder="0.5"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
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
                  {UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Instructions particulières..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createIngredient.isPending || !formData.raw_material_id || !formData.quantity}
          >
            {createIngredient.isPending ? 'Ajout...' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
