import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, ChefHat, Wheat, AlertCircle, Beaker, Package, Scale, Percent, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateRecipe, useCreateRecipeIngredient, useIntermediateRecipes } from '@/hooks/useRecipes';
import { useFoodRawMaterials } from '@/hooks/useSuppliers';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface IngredientEntry {
  rawMaterialId?: string;
  ingredientRecipeId?: string;
  bakerPercentage: number;
  type: 'farine' | 'ingredient' | 'intermediate';
  name: string;
}

export default function NewRecipe() {
  const navigate = useNavigate();
  const { data: rawMaterials, isLoading: loadingMaterials } = useFoodRawMaterials();
  const { data: intermediateRecipes } = useIntermediateRecipes();
  const createRecipe = useCreateRecipe();
  const createIngredient = useCreateRecipeIngredient();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    process: '',
    recipeType: 'finished' as 'finished' | 'intermediate',
    calculationMode: 'flour_based' as 'flour_based' | 'total_weight',
    status: 'in_development' as 'in_development' | 'in_production',
    bakingRatio: '0.90',
    processLosses: '0',
    // INCO fields for PI
    incoDeclarationMode: 'detailed' as 'simple' | 'detailed',
    incoName: '',
  });

  const [ingredients, setIngredients] = useState<IngredientEntry[]>([]);
  // Separate states for flour and other ingredients to avoid field interference
  const [selectedFlour, setSelectedFlour] = useState('');
  const [flourPercentage, setFlourPercentage] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState('');
  const [ingredientPercentage, setIngredientPercentage] = useState('');
  const [selectedIntermediate, setSelectedIntermediate] = useState('');
  const [intermediatePercentage, setIntermediatePercentage] = useState('');

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
  // All materials for total_weight mode
  const availableAllMaterials = rawMaterials?.filter(m =>
    !ingredients.some(ing => ing.rawMaterialId === m.id)
  ) || [];
  // Filter out already added intermediate recipes
  const availableIntermediates = intermediateRecipes?.filter(r =>
    !ingredients.some(ing => ing.ingredientRecipeId === r.id)
  ) || [];

  // Calculate totals
  const flourIngredients = ingredients.filter(ing => ing.type === 'farine');
  const otherIngredients = ingredients.filter(ing => ing.type === 'ingredient');
  const intermediateIngredients = ingredients.filter(ing => ing.type === 'intermediate');
  const totalFlourPercentage = flourIngredients.reduce((sum, ing) => sum + ing.bakerPercentage, 0);
  const totalOtherPercentage = otherIngredients.reduce((sum, ing) => sum + ing.bakerPercentage, 0);
  const totalIntermediatePercentage = intermediateIngredients.reduce((sum, ing) => sum + ing.bakerPercentage, 0);
  const totalBakerPercentage = totalFlourPercentage + totalOtherPercentage + totalIntermediatePercentage;

  // Validation based on calculation mode
  const isFlourBased = formData.calculationMode === 'flour_based';
  const isFlourValid = isFlourBased ? totalFlourPercentage === 100 : true;
  const isTotalWeightValid = !isFlourBased ? Math.abs(totalBakerPercentage - 100) < 0.01 : true;
  const isRecipeValid = isFlourBased ? isFlourValid : isTotalWeightValid;

  const handleAddFlour = () => {
    if (!selectedFlour || !flourPercentage) return;
    
    const percentage = parseFloat(flourPercentage);
    if (isNaN(percentage) || percentage <= 0) {
      toast.error('Veuillez entrer un pourcentage valide');
      return;
    }

    const material = rawMaterials?.find(m => m.id === selectedFlour);
    if (!material) return;

    setIngredients([...ingredients, {
      rawMaterialId: selectedFlour,
      bakerPercentage: percentage,
      type: 'farine',
      name: material.name,
    }]);
    setSelectedFlour('');
    setFlourPercentage('');
  };

  const handleAddIngredient = () => {
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
      type: (material.type === 'farine' ? 'farine' : 'ingredient') as 'farine' | 'ingredient',
      name: material.name,
    }]);
    setSelectedIngredient('');
    setIngredientPercentage('');
  };

  const handleAddIntermediate = () => {
    if (!selectedIntermediate || !intermediatePercentage) return;
    
    const percentage = parseFloat(intermediatePercentage);
    if (isNaN(percentage) || percentage <= 0) {
      toast.error('Veuillez entrer un pourcentage valide');
      return;
    }

    const recipe = intermediateRecipes?.find(r => r.id === selectedIntermediate);
    if (!recipe) return;

    setIngredients([...ingredients, {
      ingredientRecipeId: selectedIntermediate,
      bakerPercentage: percentage,
      type: 'intermediate',
      name: recipe.name,
    }]);
    setSelectedIntermediate('');
    setIntermediatePercentage('');
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleUpdatePercentage = (ingredientId: string, newPercentage: number) => {
    setIngredients(ingredients.map(ing => {
      const matchId = ing.rawMaterialId || ing.ingredientRecipeId;
      return matchId === ingredientId ? { ...ing, bakerPercentage: newPercentage } : ing;
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Le nom de la recette est obligatoire');
      return;
    }

    if (ingredients.length === 0) {
      toast.error('Veuillez ajouter au moins un ingrédient');
      return;
    }

    if (isFlourBased && flourIngredients.length === 0) {
      toast.error('Veuillez ajouter au moins une farine');
      return;
    }

    if (isFlourBased && !isFlourValid) {
      toast.error('Le total des farines doit être égal à 100%');
      return;
    }

    if (!isFlourBased && !isTotalWeightValid) {
      toast.error('Le total des ingrédients doit être égal à 100%');
      return;
    }

    try {
      // Create recipe
      const recipe = await createRecipe.mutateAsync({
        name: formData.name.trim(),
        code: formData.code.trim() || null,
        description: formData.description.trim() || null,
        process: formData.process.trim() || null,
        recipe_type: formData.recipeType,
        calculation_mode: formData.calculationMode,
        status: formData.status,
        
        baking_ratio: parseFloat(formData.bakingRatio) || 0.9,
        process_losses: parseFloat(formData.processLosses) || 0,
        yield_quantity: 1,
        yield_unit: 'kg',
        // INCO fields for intermediate products
        inco_declaration_mode: formData.recipeType === 'intermediate' ? formData.incoDeclarationMode : null,
        inco_name: formData.recipeType === 'intermediate' && formData.incoDeclarationMode === 'simple' 
          ? formData.incoName.trim() || null 
          : null,
      });

      // Add all ingredients (flours first, then others, then intermediates)
      const allIngredients = [...flourIngredients, ...otherIngredients, ...intermediateIngredients];
      for (let i = 0; i < allIngredients.length; i++) {
        const ing = allIngredients[i];
        await createIngredient.mutateAsync({
          recipe_id: recipe.id,
          raw_material_id: ing.rawMaterialId || null,
          ingredient_recipe_id: ing.ingredientRecipeId || null,
          quantity: ing.bakerPercentage,
          unit: '%',
          baker_percentage: ing.bakerPercentage,
          order_index: i,
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
            Créez une recette multi-farines avec la logique des pourcentages boulangers
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
                <Label htmlFor="recipeType">Type de recette *</Label>
                <Select 
                  value={formData.recipeType} 
                  onValueChange={(value: 'finished' | 'intermediate') => 
                    setFormData({ ...formData, recipeType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finished">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        <span>Produit fini</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="intermediate">
                      <div className="flex items-center gap-2">
                        <Beaker className="h-4 w-4" />
                        <span>Produit intermédiaire</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.recipeType === 'intermediate' 
                    ? 'Poolish, levain, purée... Utilisable comme ingrédient dans d\'autres recettes.'
                    : 'Produit vendable avec fiche technique et étiquette.'
                  }
                </p>
              </div>

              {/* INCO fields for intermediate products */}
              {formData.recipeType === 'intermediate' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="incoDeclarationMode" className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-amber-600" />
                      Mode de déclaration INCO *
                    </Label>
                    <Select 
                      value={formData.incoDeclarationMode} 
                      onValueChange={(value: 'simple' | 'detailed') => 
                        setFormData({ ...formData, incoDeclarationMode: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple (nom INCO)</SelectItem>
                        <SelectItem value="detailed">Détaillée (décomposition)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {formData.incoDeclarationMode === 'simple' 
                        ? 'Le PI sera affiché sous son "Nom INCO" (ex: pâte fermentée)'
                        : 'Le PI sera éclaté en ses matières premières composantes'
                      }
                    </p>
                  </div>

                  {formData.incoDeclarationMode === 'simple' && (
                    <div className="space-y-2">
                      <Label htmlFor="incoName">Nom INCO *</Label>
                      <Input
                        id="incoName"
                        placeholder="Ex: pâte fermentée, flocons de pomme de terre"
                        value={formData.incoName}
                        onChange={(e) => setFormData({ ...formData, incoName: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Nom qui apparaîtra dans la liste d'ingrédients des produits finis
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="calculationMode">Mode de calcul *</Label>
                <Select 
                  value={formData.calculationMode} 
                  onValueChange={(value: 'flour_based' | 'total_weight') => 
                    setFormData({ ...formData, calculationMode: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flour_based">
                      <div className="flex items-center gap-2">
                        <Wheat className="h-4 w-4" />
                        <span>Base farine (boulangerie)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="total_weight">
                      <div className="flex items-center gap-2">
                        <Scale className="h-4 w-4" />
                        <span>Base poids total</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {formData.calculationMode === 'flour_based' 
                    ? 'Farine = 100%. Les autres ingrédients sont exprimés en % de la farine.'
                    : 'Tous les ingrédients sont exprimés en % du poids total (doit = 100%).'
                  }
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <Select 
                  value={formData.status} 
                  onValueChange={(value: 'in_development' | 'in_production') => 
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_development">En développement</SelectItem>
                    <SelectItem value="in_production">En production</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Seules les recettes "En production" apparaissent dans les plannings.
                </p>
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
          {/* Flour Section - Only for flour-based mode */}
          {isFlourBased && (
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
                    value={selectedFlour} 
                    onValueChange={setSelectedFlour}
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
                    value={flourPercentage}
                    onChange={(e) => setFlourPercentage(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={handleAddFlour}
                  size="icon"
                  disabled={!selectedFlour || !flourPercentage || !availableFlours.some(m => m.id === selectedFlour)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Flour list */}
              <div className="space-y-2">
                {flourIngredients.map((ing, index) => (
                  <div 
                    key={ing.rawMaterialId}
                    className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20"
                  >
                    <div className="flex items-center gap-2">
                      <Wheat className="h-4 w-4 text-primary" />
                      <span className="font-medium">{getMaterialName(ing.rawMaterialId!)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        className="w-20 h-8 text-right font-mono font-bold text-primary"
                        value={ing.bakerPercentage}
                        onChange={(e) => handleUpdatePercentage(ing.rawMaterialId!, parseFloat(e.target.value) || 0)}
                      />
                      <span className="text-primary font-bold">%</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleRemoveIngredient(ingredients.indexOf(ing))}
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
          )}

          {/* Other Ingredients Section */}
          <Card>
            <CardHeader>
              <CardTitle>{isFlourBased ? 'Autres ingrédients (% boulangers)' : 'Ingrédients (% du poids total)'}</CardTitle>
              <CardDescription>
                {isFlourBased 
                  ? 'Pourcentages par rapport au total des farines (100%)'
                  : 'La somme de tous les ingrédients doit être égale à 100%'
                }
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
                      {(isFlourBased ? availableOtherMaterials : availableAllMaterials)?.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            {m.type === 'farine' && <Wheat className="h-3 w-3" />}
                            {m.name}
                          </div>
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
                  onClick={handleAddIngredient}
                  size="icon"
                  disabled={!selectedIngredient || !ingredientPercentage || !(isFlourBased ? availableOtherMaterials : availableAllMaterials).some(m => m.id === selectedIngredient)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Ingredients list - sorted by percentage descending */}
              <div className="space-y-2">
                {/* In total_weight mode, show all ingredients including flours */}
                {(isFlourBased 
                  ? [...otherIngredients]
                  : [...ingredients.filter(ing => ing.type !== 'intermediate')]
                ).sort((a, b) => b.bakerPercentage - a.bakerPercentage).map((ing) => (
                  <div 
                    key={ing.rawMaterialId}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg",
                      ing.type === 'farine' ? "bg-primary/5 border border-primary/20" : "bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {ing.type === 'farine' && <Wheat className="h-4 w-4 text-primary" />}
                      <span>{ing.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        className={cn("w-20 h-8 text-right font-mono", ing.type === 'farine' && "font-bold text-primary")}
                        value={ing.bakerPercentage}
                        onChange={(e) => handleUpdatePercentage(ing.rawMaterialId!, parseFloat(e.target.value) || 0)}
                      />
                      <span className={cn("font-medium", ing.type === 'farine' && "font-bold text-primary")}>%</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleRemoveIngredient(ingredients.indexOf(ing))}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {(isFlourBased ? otherIngredients.length === 0 : ingredients.filter(ing => ing.type !== 'intermediate').length === 0) && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Aucun ingrédient ajouté
                  </p>
                )}
              </div>

              {/* Total */}
              {ingredients.length > 0 && (
                <div className={cn(
                  "p-3 rounded-lg",
                  isFlourBased 
                    ? "pt-4 border-t" 
                    : (isTotalWeightValid ? "bg-success/10" : "bg-destructive/10")
                )}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {isFlourBased ? 'Total pourcentages boulangers' : 'Total ingrédients'}
                    </span>
                    <span className={cn(
                      "font-mono text-lg font-bold",
                      !isFlourBased && (isTotalWeightValid ? "text-success" : "text-destructive")
                    )}>
                      {totalBakerPercentage.toFixed(1)}%
                    </span>
                  </div>
                  {isFlourBased && (
                    <p className="text-xs text-muted-foreground mt-1">
                      = 100% (farines) + {totalOtherPercentage.toFixed(1)}% (ingrédients) + {totalIntermediatePercentage.toFixed(1)}% (PI)
                    </p>
                  )}
                  {!isFlourBased && !isTotalWeightValid && (
                    <p className="text-xs text-destructive mt-1">
                      Le total doit être exactement 100%
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Intermediate Products Section - only for finished products */}
          {formData.recipeType === 'finished' && availableIntermediates.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Beaker className="h-5 w-5 text-amber-600" />
                  Produits intermédiaires
                </CardTitle>
                <CardDescription>
                  Intégrez des poolish, levains ou autres préparations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add intermediate form */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select 
                      value={selectedIntermediate} 
                      onValueChange={setSelectedIntermediate}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un produit intermédiaire..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIntermediates.map(r => (
                          <SelectItem key={r.id} value={r.id}>
                            <div className="flex items-center gap-2">
                              <Beaker className="h-3 w-3" />
                              {r.name}
                              {r.code && <span className="text-muted-foreground">({r.code})</span>}
                            </div>
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
                      value={intermediatePercentage}
                      onChange={(e) => setIntermediatePercentage(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleAddIntermediate}
                    size="icon"
                    disabled={!selectedIntermediate || !intermediatePercentage}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Intermediate list */}
                <div className="space-y-2">
                {intermediateIngredients.map((ing) => (
                    <div 
                      key={ing.ingredientRecipeId}
                      className="flex items-center justify-between p-3 bg-amber-100 rounded-lg border border-amber-200"
                    >
                      <div className="flex items-center gap-2">
                        <Beaker className="h-4 w-4 text-amber-600" />
                        <span className="font-medium">{ing.name}</span>
                        <Badge variant="outline" className="text-amber-700 border-amber-300">PI</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          className="w-20 h-8 text-right font-mono font-bold text-amber-700"
                          value={ing.bakerPercentage}
                          onChange={(e) => handleUpdatePercentage(ing.ingredientRecipeId!, parseFloat(e.target.value) || 0)}
                        />
                        <span className="font-bold text-amber-700">%</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => handleRemoveIngredient(ingredients.indexOf(ing))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Alert */}
          {isFlourBased && !isFlourValid && flourIngredients.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Le total des farines ({totalFlourPercentage.toFixed(1)}%) doit être égal à 100% pour valider la recette.
              </AlertDescription>
            </Alert>
          )}

          {!isFlourBased && !isTotalWeightValid && ingredients.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Le total des ingrédients ({totalBakerPercentage.toFixed(1)}%) doit être égal à 100% pour valider la recette.
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
                createRecipe.isPending || 
                !formData.name || 
                ingredients.length === 0 ||
                !isRecipeValid
              }
            >
              {createRecipe.isPending ? 'Création...' : 'Créer la recette'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
