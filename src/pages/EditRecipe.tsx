import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, X, ChefHat, Wheat, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRecipe, useRecipeIngredients, useUpdateRecipe, useCreateRecipeIngredient, useDeleteRecipeIngredient } from '@/hooks/useRecipes';
import { useAllRawMaterials } from '@/hooks/useSuppliers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IngredientEntry {
  id?: string;
  rawMaterialId: string;
  bakerPercentage: number;
  type: 'farine' | 'ingredient';
}

export default function EditRecipe() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: recipe, isLoading: loadingRecipe } = useRecipe(id);
  const { data: existingIngredients, isLoading: loadingIngredients } = useRecipeIngredients(id);
  const { data: rawMaterials, isLoading: loadingMaterials } = useAllRawMaterials();
  const updateRecipe = useUpdateRecipe();
  const createIngredient = useCreateRecipeIngredient();
  const deleteIngredient = useDeleteRecipeIngredient();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    process: '',
    status: 'draft' as 'draft' | 'validated',
    bakingRatio: '0.90',
    processLosses: '0',
  });

  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientPercentage, setIngredientPercentage] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form with recipe data
  useEffect(() => {
    if (recipe && !isInitialized) {
      setFormData({
        name: recipe.name || '',
        code: recipe.code || '',
        description: recipe.description || '',
        process: (recipe as any).process || '',
        status: (recipe.status as 'draft' | 'validated') || 'draft',
        bakingRatio: String(recipe.baking_ratio || 0.90),
        processLosses: String(recipe.process_losses || 0),
      });
      setIsInitialized(true);
    }
  }, [recipe, isInitialized]);

  // Initialize ingredients from existing data
  useEffect(() => {
    if (existingIngredients && rawMaterials && isInitialized && ingredients.length === 0) {
      const mappedIngredients: IngredientEntry[] = existingIngredients.map((ing) => {
        const material = rawMaterials.find(m => m.id === ing.raw_material_id);
        return {
          id: ing.id,
          rawMaterialId: ing.raw_material_id,
          bakerPercentage: ing.baker_percentage || ing.quantity,
          type: (material?.type === 'farine' ? 'farine' : 'ingredient') as 'farine' | 'ingredient',
        };
      });
      setIngredients(mappedIngredients);
    }
  }, [existingIngredients, rawMaterials, isInitialized, ingredients.length]);

  // Separate flour and other ingredients
  const flourMaterials = rawMaterials?.filter(m => m.type === 'farine') || [];
  const otherMaterials = rawMaterials?.filter(m => m.type !== 'farine') || [];

  // Filter out already added materials
  const availableFlours = flourMaterials.filter(m => 
    !ingredients.some(ing => ing.rawMaterialId === m.id)
  );
  const availableOtherMaterials = otherMaterials.filter(m => 
    !ingredients.some(ing => ing.rawMaterialId === m.id)
  );

  // Calculate flour total and sort by descending percentage
  const flourIngredients = ingredients
    .filter(ing => ing.type === 'farine')
    .sort((a, b) => b.bakerPercentage - a.bakerPercentage);
  const otherIngredients = ingredients
    .filter(ing => ing.type !== 'farine')
    .sort((a, b) => b.bakerPercentage - a.bakerPercentage);
  const totalFlourPercentage = flourIngredients.reduce((sum, ing) => sum + ing.bakerPercentage, 0);
  const totalOtherPercentage = otherIngredients.reduce((sum, ing) => sum + ing.bakerPercentage, 0);
  const totalBakerPercentage = totalFlourPercentage + totalOtherPercentage;

  const isFlourValid = totalFlourPercentage === 100;

  const handleAddIngredient = (type: 'farine' | 'ingredient') => {
    if (!selectedIngredient || !ingredientPercentage) return;
    
    const percentage = parseFloat(ingredientPercentage);
    if (isNaN(percentage) || percentage <= 0) {
      toast.error('Veuillez entrer un pourcentage valide');
      return;
    }

    const material = rawMaterials?.find(m => m.id === selectedIngredient);
    if (!material) return;

    setIngredients([...ingredients, {
      rawMaterialId: selectedIngredient,
      bakerPercentage: percentage,
      type: material.type === 'farine' ? 'farine' : 'ingredient',
    }]);
    setSelectedIngredient('');
    setIngredientPercentage('');
  };

  const handleUpdatePercentage = (rawMaterialId: string, newPercentage: number) => {
    setIngredients(ingredients.map(ing => 
      ing.rawMaterialId === rawMaterialId 
        ? { ...ing, bakerPercentage: newPercentage }
        : ing
    ));
  };

  const handleRemoveIngredient = (rawMaterialId: string) => {
    setIngredients(ingredients.filter(ing => ing.rawMaterialId !== rawMaterialId));
  };

  const handleSubmit = async () => {
    if (!id) return;
    
    if (!formData.name.trim()) {
      toast.error('Le nom de la recette est obligatoire');
      return;
    }

    if (flourIngredients.length === 0) {
      toast.error('Veuillez ajouter au moins une farine');
      return;
    }

    if (!isFlourValid) {
      toast.error('Le total des farines doit être égal à 100%');
      return;
    }

    try {
      // Update recipe
      await updateRecipe.mutateAsync({
        id,
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        description: formData.description.trim() || null,
        process: formData.process.trim() || null,
        status: formData.status,
        baking_ratio: parseFloat(formData.bakingRatio) || 0.9,
        process_losses: parseFloat(formData.processLosses) || 0,
      });

      // Delete all existing ingredients
      if (existingIngredients) {
        for (const ing of existingIngredients) {
          await deleteIngredient.mutateAsync({ id: ing.id, recipeId: id });
        }
      }

      // Add all ingredients (flours first, then others)
      const allIngredients = [...flourIngredients, ...otherIngredients];
      for (let i = 0; i < allIngredients.length; i++) {
        await createIngredient.mutateAsync({
          recipe_id: id,
          raw_material_id: allIngredients[i].rawMaterialId,
          quantity: allIngredients[i].bakerPercentage,
          unit: '%',
          baker_percentage: allIngredients[i].bakerPercentage,
          order_index: i,
        });
      }

      toast.success('Recette modifiée avec succès');
      navigate('/products/recipes');
    } catch (error) {
      console.error('Error updating recipe:', error);
    }
  };

  const getMaterialName = (materialId: string) => {
    return rawMaterials?.find(m => m.id === materialId)?.name || 'Inconnu';
  };

  if (loadingRecipe || loadingIngredients || loadingMaterials) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Recette introuvable</p>
        <Button variant="outline" onClick={() => navigate('/products/recipes')} className="mt-4">
          Retour aux recettes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/products/recipes')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Modifier la recette</h1>
          <p className="text-muted-foreground mt-1">
            Modifiez les informations et les ingrédients de la recette
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
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="process">Process de fabrication</Label>
                <Textarea
                  id="process"
                  placeholder="Décrivez les étapes de fabrication..."
                  value={formData.process}
                  onChange={(e) => setFormData({ ...formData, process: e.target.value })}
                  rows={4}
                />
              </div>
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
          {/* Flour Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wheat className="h-5 w-5" />
                Farines (Base 100%)
              </CardTitle>
              <CardDescription>
                La somme des pourcentages des farines doit être égale à 100%
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add flour form */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Select 
                    value={selectedIngredient} 
                    onValueChange={setSelectedIngredient}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une farine..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFlours.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          Aucune farine disponible. Configurez-les dans Paramètres.
                        </div>
                      ) : (
                        availableFlours.map(m => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    placeholder="%"
                    value={ingredientPercentage}
                    onChange={(e) => setIngredientPercentage(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={() => handleAddIngredient('farine')}
                  size="icon"
                  disabled={!selectedIngredient || !ingredientPercentage || !availableFlours.some(m => m.id === selectedIngredient)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Flour list */}
              <div className="space-y-2">
                {flourIngredients.map((ing) => (
                  <div 
                    key={ing.rawMaterialId}
                    className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20"
                  >
                    <div className="flex items-center gap-2">
                      <Wheat className="h-4 w-4 text-primary" />
                      <span className="font-medium">{getMaterialName(ing.rawMaterialId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-20 h-8 text-right font-mono font-bold text-primary"
                        value={ing.bakerPercentage}
                        onChange={(e) => handleUpdatePercentage(ing.rawMaterialId, parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-primary font-bold">%</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleRemoveIngredient(ing.rawMaterialId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {flourIngredients.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Ajoutez au moins une farine
                  </p>
                )}
              </div>

              {/* Flour total */}
              {flourIngredients.length > 0 && (
                <div className={cn(
                  "p-3 rounded-lg",
                  isFlourValid ? "bg-success/10" : "bg-destructive/10"
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total farines</span>
                    <span className={cn(
                      "font-mono text-lg font-bold",
                      isFlourValid ? "text-success" : "text-destructive"
                    )}>
                      {totalFlourPercentage.toFixed(1)}%
                    </span>
                  </div>
                  {!isFlourValid && (
                    <p className="text-xs text-destructive mt-1">
                      Le total doit être exactement 100%
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Other Ingredients Section */}
          <Card>
            <CardHeader>
              <CardTitle>Autres ingrédients (% boulangers)</CardTitle>
              <CardDescription>
                Pourcentages par rapport au total des farines (100%)
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
                      {availableOtherMaterials?.map(m => (
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
                <Button 
                  onClick={() => handleAddIngredient('ingredient')}
                  size="icon"
                  disabled={!selectedIngredient || !ingredientPercentage || !availableOtherMaterials.some(m => m.id === selectedIngredient)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Ingredients list */}
              <div className="space-y-2">
                {otherIngredients.map((ing) => (
                  <div 
                    key={ing.rawMaterialId}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <span>{getMaterialName(ing.rawMaterialId)}</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        className="w-20 h-8 text-right font-mono"
                        value={ing.bakerPercentage}
                        onChange={(e) => handleUpdatePercentage(ing.rawMaterialId, parseFloat(e.target.value) || 0)}
                      />
                      <span className="font-medium">%</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleRemoveIngredient(ing.rawMaterialId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {otherIngredients.length === 0 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Aucun autre ingrédient ajouté
                  </p>
                )}
              </div>

              {/* Total */}
              {ingredients.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Total pourcentages boulangers</span>
                    <span className="font-mono text-lg font-bold">{totalBakerPercentage.toFixed(1)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    = 100% (farines) + {totalOtherPercentage.toFixed(1)}% (autres ingrédients)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Validation Alert */}
          {!isFlourValid && flourIngredients.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Le total des farines ({totalFlourPercentage}%) doit être égal à 100% pour valider la recette.
              </AlertDescription>
            </Alert>
          )}

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
              disabled={
                updateRecipe.isPending || 
                !formData.name || 
                flourIngredients.length === 0 || 
                !isFlourValid
              }
            >
              {updateRecipe.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
