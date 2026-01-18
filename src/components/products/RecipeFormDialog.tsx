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
import { useCreateRecipe, useUpdateRecipe, Recipe } from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';

const CATEGORIES = [
  'Pains', 'Viennoiseries', 'Pâtisseries', 'Snacking', 'Traiteur', 'Autres'
];

const UNITS = ['kg', 'g', 'L', 'unité', 'pièces'];

interface RecipeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe: Recipe | null;
}

export function RecipeFormDialog({ open, onOpenChange, recipe }: RecipeFormDialogProps) {
  const { user } = useAuth();
  const createRecipe = useCreateRecipe();
  const updateRecipe = useUpdateRecipe();
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    category: '',
    yield_quantity: '1',
    yield_unit: 'kg',
    preparation_notes: '',
    is_active: true,
  });

  useEffect(() => {
    if (recipe) {
      setFormData({
        name: recipe.name,
        code: recipe.code || '',
        description: recipe.description || '',
        category: recipe.category || '',
        yield_quantity: recipe.yield_quantity.toString(),
        yield_unit: recipe.yield_unit,
        preparation_notes: recipe.preparation_notes || '',
        is_active: recipe.is_active,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        category: '',
        yield_quantity: '1',
        yield_unit: 'kg',
        preparation_notes: '',
        is_active: true,
      });
    }
  }, [recipe, open]);

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;
    
    const data = {
      name: formData.name.trim(),
      code: formData.code.trim() || null,
      description: formData.description.trim() || null,
      category: formData.category || null,
      yield_quantity: parseFloat(formData.yield_quantity) || 1,
      yield_unit: formData.yield_unit,
      preparation_notes: formData.preparation_notes.trim() || null,
      is_active: formData.is_active,
      created_by: user?.id || null,
    };

    if (recipe) {
      await updateRecipe.mutateAsync({ id: recipe.id, ...data });
    } else {
      await createRecipe.mutateAsync(data);
    }
    
    onOpenChange(false);
  };

  const isSubmitting = createRecipe.isPending || updateRecipe.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{recipe ? 'Modifier la recette' : 'Nouvelle recette'}</DialogTitle>
          <DialogDescription>
            {recipe ? 'Modifiez les informations de la recette' : 'Créez une nouvelle recette'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Nom *</Label>
              <Input
                id="name"
                placeholder="Ex: Pain de campagne"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="Ex: REC-001"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Catégorie</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Sélectionnez une catégorie" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description de la recette..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="yield">Rendement *</Label>
              <Input
                id="yield"
                type="number"
                step="0.01"
                min="0"
                placeholder="1"
                value={formData.yield_quantity}
                onChange={(e) => setFormData({ ...formData, yield_quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yield-unit">Unité</Label>
              <Select
                value={formData.yield_unit}
                onValueChange={(value) => setFormData({ ...formData, yield_unit: value })}
              >
                <SelectTrigger id="yield-unit">
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
            <Label htmlFor="notes">Notes de préparation</Label>
            <Textarea
              id="notes"
              placeholder="Instructions particulières..."
              value={formData.preparation_notes}
              onChange={(e) => setFormData({ ...formData, preparation_notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Recette active</p>
              <p className="text-sm text-muted-foreground">
                La recette est disponible pour utilisation
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formData.name.trim()}
          >
            {isSubmitting ? 'Enregistrement...' : recipe ? 'Modifier' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
