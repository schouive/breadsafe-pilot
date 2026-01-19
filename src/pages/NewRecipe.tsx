import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, ChefHat, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateRecipe, useCreateRecipeIngredient } from '@/hooks/useRecipes';
import { useAllRawMaterials } from '@/hooks/useSuppliers';
import { toast } from 'sonner';

interface IngredientEntry {
  rawMaterialId: string;
  bakerPercentage: number;
}

export default function NewRecipe() {
  const navigate = useNavigate();
  const { data: rawMaterials, isLoading: loadingMaterials } = useAllRawMaterials();
  const createRecipe = useCreateRecipe();
  const createIngredient = useCreateRecipeIngredient();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'draft' as 'draft' | 'validated',
    referenceFlourId: '',
    bakingRatio: '0.90',
    processLosses: '0',
  });

  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientPercentage, setIngredientPercentage] = useState('');

  const flourMaterials = rawMaterials?.filter(m => 
    m.name.toLowerCase().includes('farine') || 
    m.category?.toLowerCase().includes('farine')
  ) || [];

  const availableMaterials = rawMaterials?.filter(m => 
    m.id !== formData.referenceFlourId && 
    !ingredients.some(ing => ing.rawMaterialId === m.id)
  ) || [];

  const handleAddIngredient = () => {
    if (!selectedIngredient || !ingredientPercentage) return;
    
    const percentage = parseFloat(ingredientPercentage);
    if (isNaN(percentage) || percentage <= 0) {
      toast.error('Veuillez entrer un pourcentage valide');
      return;
    }

    setIngredients([...ingredients, {
      rawMaterialId: selectedIngredient,
      bakerPercentage: percentage,
    }]);
    setSelectedIngredient('');
    setIngredientPercentage('');
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom de la recette est obligatoire');
      return;
    }

    if (!formData.referenceFlourId) {
      toast.error('Veuillez sélectionner une farine de référence');
      return;
    }

    try {
      // Create recipe
      const recipe = await createRecipe.mutateAsync({
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        description: formData.description.trim() || null,
        status: formData.status,
        reference_flour_id: formData.referenceFlourId,
        baking_ratio: parseFloat(formData.bakingRatio) || 0.9,
        process_losses: parseFloat(formData.processLosses) || 0,
        yield_quantity: 1,
        yield_unit: 'kg',
      });

      // Add reference flour as first ingredient (100%)
      await createIngredient.mutateAsync({
        recipe_id: recipe.id,
        raw_material_id: formData.referenceFlourId,
        quantity: 100,
        unit: '%',
        baker_percentage: 100,
        order_index: 0,
      });

      // Add other ingredients
      for (let i = 0; i < ingredients.length; i++) {
        await createIngredient.mutateAsync({
          recipe_id: recipe.id,
          raw_material_id: ingredients[i].rawMaterialId,
          quantity: ingredients[i].bakerPercentage,
          unit: '%',
          baker_percentage: ingredients[i].bakerPercentage,
          order_index: i + 1,
        });
      }

      toast.success('Recette créée avec succès');
      navigate('/products/recipes');
    } catch (error) {
      console.error('Error creating recipe:', error);
    }
  };

  const getMaterialName = (id: string) => {
    return rawMaterials?.find(m => m.id === id)?.name || 'Inconnu';
  };

  const totalPercentage = 100 + ingredients.reduce((sum, ing) => sum + ing.bakerPercentage, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products/recipes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nouvelle Recette</h1>
          <p className="text-muted-foreground mt-1">
            Créez une recette avec la logique des pourcentages boulangers
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column - General info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ChefHat className="h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de la recette *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Baguette tradition"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code / Référence interne</Label>
                <Input
                  id="code"
                  placeholder="Ex: BAG-001"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'draft' | 'validated') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Brouillon</SelectItem>
                    <SelectItem value="validated">Validée</SelectItem>
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
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wheat className="h-5 w-5" />
                Farine de référence
              </CardTitle>
              <CardDescription>
                Cette matière première est fixée à 100% (base de calcul)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Sélectionner la farine principale *</Label>
                <Select 
                  value={formData.referenceFlourId} 
                  onValueChange={(value) => setFormData({ ...formData, referenceFlourId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une farine..." />
                  </SelectTrigger>
                  <SelectContent>
                    {flourMaterials.length > 0 ? (
                      flourMaterials.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))
                    ) : (
                      rawMaterials?.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {formData.referenceFlourId && (
                <div className="p-3 bg-primary/10 rounded-lg flex items-center justify-between">
                  <span className="font-medium">{getMaterialName(formData.referenceFlourId)}</span>
                  <Badge variant="outline" className="bg-primary/20">100%</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Paramètres de transformation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bakingRatio">Ratio poids cuit/cru</Label>
                  <Input
                    id="bakingRatio"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    placeholder="0.90"
                    value={formData.bakingRatio}
                    onChange={(e) => setFormData({ ...formData, bakingRatio: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Ex: 0.90 = 10% de perte à la cuisson</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="processLosses">Pertes process (%)</Label>
                  <Input
                    id="processLosses"
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="0"
                    value={formData.processLosses}
                    onChange={(e) => setFormData({ ...formData, processLosses: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Pertes additionnelles</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column - Ingredients */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Composition (% boulangers)</CardTitle>
              <CardDescription>
                Ajoutez les ingrédients avec leurs pourcentages par rapport à la farine
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add ingredient form */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select 
                    value={selectedIngredient} 
                    onValueChange={setSelectedIngredient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un ingrédient..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMaterials?.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="%"
                    value={ingredientPercentage}
                    onChange={(e) => setIngredientPercentage(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddIngredient} size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Ingredients list */}
              <div className="space-y-2">
                {formData.referenceFlourId && (
                  <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Wheat className="h-4 w-4 text-primary" />
                      <span className="font-medium">{getMaterialName(formData.referenceFlourId)}</span>
                      <Badge variant="secondary" className="text-xs">Base</Badge>
                    </div>
                    <span className="font-mono font-bold text-primary">100%</span>
                  </div>
                )}

                {ingredients.map((ing, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <span>{getMaterialName(ing.rawMaterialId)}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono">{ing.bakerPercentage}%</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleRemoveIngredient(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {ingredients.length === 0 && !formData.referenceFlourId && (
                  <p className="text-center text-muted-foreground py-8">
                    Sélectionnez d'abord une farine de référence
                  </p>
                )}
              </div>

              {/* Total */}
              {formData.referenceFlourId && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total pourcentages</span>
                    <span className="font-mono text-lg font-bold">{totalPercentage.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    La somme peut être supérieure à 100% (normal en boulangerie)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => navigate('/products/recipes')}
            >
              Annuler
            </Button>
            <Button 
              className="flex-1"
              onClick={handleSubmit}
              disabled={createRecipe.isPending || !formData.name || !formData.referenceFlourId}
            >
              {createRecipe.isPending ? 'Création...' : 'Créer la recette'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
