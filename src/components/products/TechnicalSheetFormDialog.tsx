import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, FileText, Lock, Image as ImageIcon, Upload } from 'lucide-react';
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
  useActiveRecipes,
  useRecipeIngredients,
  useRecipeNutrition,
  useCreateProductSheet,
  useUpdateProductSheet,
  ProductSheet,
  Recipe,
} from '@/hooks/useRecipes';
import { useAuth } from '@/hooks/useAuth';
import { generateIngredientLists, markdownToUppercase } from '@/lib/ingredientListGenerator';
import { supabase } from '@/integrations/supabase/client';
import { optimizeImage } from '@/lib/imageOptimization';
const WEIGHT_UNITS = ['g', 'kg', 'L', 'mL', 'cl'];

const STORAGE_OPTIONS = [
  { value: 'ambient', label: 'À conserver à température ambiante, de préférence inférieure à 30°C' },
  { value: 'frozen', label: 'À conserver à -18°C' },
  { value: 'other', label: 'Autre (saisie manuelle)' },
];

const DEFAULT_THAWING_INSTRUCTIONS = 'Décongeler à température ambiante, ne pas recongeler';

// Helper to determine storage type from existing storage instructions
function determineStorageType(storageInstructions: string | null): 'ambient' | 'frozen' | 'other' {
  if (!storageInstructions) return 'ambient';
  const normalized = storageInstructions.toLowerCase();
  if (normalized.includes('-18') || normalized.includes('congel')) return 'frozen';
  if (normalized.includes('ambiante') && normalized.includes('30')) return 'ambient';
  return 'other';
}

interface SnapshotIngredient {
  name: string;
  composition: string | null;
  bakerPercentage: number;
  allergens: string[];
  allergensSecondary: string[];
}

interface SnapshotNutrition {
  energyKcal: number | null;
  energyKj: number | null;
  fat: number | null;
  saturatedFat: number | null;
  carbohydrates: number | null;
  sugars: number | null;
  fiber: number | null;
  protein: number | null;
  salt: number | null;
}

interface TechnicalSheetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheet: ProductSheet | null;
  mode?: 'create' | 'edit';
}

export function TechnicalSheetFormDialog({ 
  open, 
  onOpenChange, 
  sheet,
  mode = 'create'
}: TechnicalSheetFormDialogProps) {
  const { user } = useAuth();
  const { data: recipes } = useActiveRecipes();
  const createSheet = useCreateProductSheet();
  const updateSheet = useUpdateProductSheet();
  
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const { data: recipeIngredients } = useRecipeIngredients(selectedRecipeId || undefined);
  const { data: recipeNutrition } = useRecipeNutrition(selectedRecipeId || undefined);
  
  // State to store fetched PI sub-ingredients
  const [piSubIngredients, setPiSubIngredients] = useState<Record<string, any[]>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    product_reference: '',
    brand: '',
    barcode: '',
    net_weight: '',
    net_weight_unit: 'g',
    pieces_per_carton: '',
    cartons_per_layer: '',
    layers_per_pallet: '',
    carton_dimensions: '',
    carton_weight: '',
    storage_instructions: '',
    storage_type: 'ambient' as 'ambient' | 'frozen' | 'other',
    dlc_ddm_type: 'DLC',
    dlc_ddm_days: '',
    thawing_instructions: '',
    usage_instructions: 'Toaster le produit ou le chauffer sur la plancha avant son utilisation',
    quality_comment: '',
    origin_country: '',
    is_published: false,
  });
  // Fetch sub-ingredients for all PI in the recipe
  useEffect(() => {
    const fetchPiSubIngredients = async () => {
      if (!recipeIngredients) return;
      
      const piIngredients = recipeIngredients.filter(ing => ing.ingredient_recipe_id);
      if (piIngredients.length === 0) {
        setPiSubIngredients({});
        return;
      }

      const newPiSubIngredients: Record<string, any[]> = {};
      
      for (const piIng of piIngredients) {
        if (!piIng.ingredient_recipe_id) continue;
        
        const { data: subIngredients, error } = await supabase
          .from('recipe_ingredients')
          .select(`
            *,
            raw_materials (
              id,
              name,
              inco_name,
              composition,
              allergens,
              allergens_secondary
            )
          `)
          .eq('recipe_id', piIng.ingredient_recipe_id)
          .order('order_index');
        
        if (!error && subIngredients) {
          newPiSubIngredients[piIng.ingredient_recipe_id] = subIngredients;
        }
      }
      
      setPiSubIngredients(newPiSubIngredients);
    };

    fetchPiSubIngredients();
  }, [recipeIngredients]);

  // Calculate derived data from selected recipe - two versions of ingredient lists
  const { ingredientsListTechnical, ingredientsListCondensed, ingredientsListCondensedHtml, allergens, allergensSecondary } = useMemo(() => {
    if (!recipeIngredients || recipeIngredients.length === 0) {
      return { 
        ingredientsListTechnical: '', 
        ingredientsListCondensed: '',
        ingredientsListCondensedHtml: '',
        allergens: [] as string[], 
        allergensSecondary: [] as string[] 
      };
    }

    // Collect all allergens from direct ingredients and PI sub-ingredients
    const allAllergens = [...new Set([
      ...recipeIngredients.flatMap((ing) => ing.raw_materials?.allergens || []),
      ...Object.values(piSubIngredients).flat().flatMap((subIng: any) => subIng.raw_materials?.allergens || [])
    ])].sort();
    
    const allAllergensSecondary = [...new Set([
      ...recipeIngredients.flatMap((ing) => ing.raw_materials?.allergens_secondary || []),
      ...Object.values(piSubIngredients).flat().flatMap((subIng: any) => subIng.raw_materials?.allergens_secondary || [])
    ])].filter(a => !allAllergens.includes(a)).sort();

    // Prepare ingredients for the generator
    // Handle both raw materials AND intermediate products (PI)
    const ingredientsForGenerator = recipeIngredients.map((ing) => {
      // For intermediate products (PI), include INCO mode and sub-ingredients
      if (ing.ingredient_recipe_id && ing.ingredient_recipe) {
        const piRecipe = ing.ingredient_recipe;
        const subIngs = piSubIngredients[ing.ingredient_recipe_id] || [];
        
        return {
          name: piRecipe.name,
          composition: null,
          bakerPercentage: ing.baker_percentage || 0,
          allergens: subIngs.flatMap((sub: any) => sub.raw_materials?.allergens || []),
          allergensSecondary: subIngs.flatMap((sub: any) => sub.raw_materials?.allergens_secondary || []),
          isIntermediateProduct: true,
          incoDeclarationMode: (piRecipe.inco_declaration_mode as 'simple' | 'detailed' | null) || 'detailed',
          incoName: piRecipe.inco_name || null,
          // Include sub-ingredients for detailed mode
          subIngredients: subIngs.map((subIng: any) => ({
            name: subIng.raw_materials?.name || 'Inconnu',
            incoName: subIng.raw_materials?.inco_name || null,
            composition: subIng.raw_materials?.composition || null,
            bakerPercentage: subIng.baker_percentage || 0,
            allergens: subIng.raw_materials?.allergens || [],
            allergensSecondary: subIng.raw_materials?.allergens_secondary || [],
          })),
        };
      }
      // For regular raw materials
      return {
        name: ing.raw_materials?.name || 'Inconnu',
        composition: ing.raw_materials?.composition || null,
        bakerPercentage: ing.baker_percentage || 0,
        allergens: ing.raw_materials?.allergens || [],
        allergensSecondary: ing.raw_materials?.allergens_secondary || [],
        isIntermediateProduct: false,
      };
    });

    // Generate both technical and condensed lists
    const lists = generateIngredientLists(ingredientsForGenerator, allAllergens);

    return { 
      ingredientsListTechnical: lists.technical,
      ingredientsListCondensed: lists.condensed,
      ingredientsListCondensedHtml: lists.condensedHtml,
      allergens: allAllergens,
      allergensSecondary: allAllergensSecondary
    };
  }, [recipeIngredients, piSubIngredients]);

  // Get selected recipe details
  const selectedRecipe = useMemo(() => {
    return recipes?.find(r => r.id === selectedRecipeId);
  }, [recipes, selectedRecipeId]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      if (sheet && mode === 'edit') {
        // Load existing sheet data for editing
        setSelectedRecipeId(sheet.recipe_id);
        setFormData({
          product_name: sheet.product_name || '',
          description: (sheet as any).description || '',
          product_reference: (sheet as any).product_reference || '',
          brand: sheet.brand || '',
          barcode: sheet.barcode || '',
          net_weight: sheet.net_weight?.toString() || '',
          net_weight_unit: sheet.net_weight_unit || 'g',
          pieces_per_carton: (sheet as any).pieces_per_carton?.toString() || '',
          cartons_per_layer: (sheet as any).cartons_per_layer?.toString() || '',
          layers_per_pallet: (sheet as any).layers_per_pallet?.toString() || '',
          carton_dimensions: (sheet as any).carton_dimensions || '',
          carton_weight: (sheet as any).carton_weight?.toString() || '',
          storage_instructions: sheet.storage_instructions || '',
          storage_type: determineStorageType(sheet.storage_instructions),
          dlc_ddm_type: (sheet as any).dlc_ddm_type || 'DLC',
          dlc_ddm_days: (sheet as any).dlc_ddm_days?.toString() || '',
          thawing_instructions: (sheet as any).thawing_instructions || '',
          usage_instructions: sheet.usage_instructions || '',
          quality_comment: (sheet as any).quality_comment || '',
          origin_country: sheet.origin_country || '',
          is_published: sheet.is_published,
        });
        if ((sheet as any).product_image_url) {
          setImagePreview((sheet as any).product_image_url);
        }
      } else {
        // Reset for new FT
        setSelectedRecipeId('');
        setFormData({
          product_name: '',
          description: '',
          product_reference: '',
          brand: '',
          barcode: '',
          net_weight: '',
          net_weight_unit: 'g',
          pieces_per_carton: '',
          cartons_per_layer: '',
          layers_per_pallet: '',
          carton_dimensions: '',
          carton_weight: '',
          storage_instructions: '',
          storage_type: 'ambient' as 'ambient' | 'frozen' | 'other',
          dlc_ddm_type: 'DLC',
          dlc_ddm_days: '',
          thawing_instructions: '',
          usage_instructions: 'Toaster le produit ou le chauffer sur la plancha avant son utilisation',
          quality_comment: '',
          origin_country: '',
          is_published: false,
        });
        setImageFile(null);
        setImagePreview(null);
      }
    }
  }, [open, sheet, mode]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedRecipeId || !formData.product_name.trim()) return;
    
    setIsSubmitting(true);
    
    try {
      let imageUrl = (sheet as any)?.product_image_url || null;
      
      // Upload image if new one was selected
      if (imageFile) {
        // Optimize image before upload
        const optimized = await optimizeImage(imageFile, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: 0.8,
          format: 'jpeg'
        });
        
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `product-images/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('control-photos')
          .upload(filePath, optimized.blob, {
            cacheControl: '31536000', // Cache for 1 year
            contentType: 'image/jpeg'
          });
        
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('control-photos')
          .getPublicUrl(filePath);
        
        imageUrl = publicUrl;
      }

      // Build snapshot data for new FT
      // Handle both raw materials AND intermediate products (PI)
      const snapshotIngredients: SnapshotIngredient[] = recipeIngredients?.map(ing => {
        // For intermediate products (PI), use the recipe name
        if (ing.ingredient_recipe_id && ing.ingredient_recipe) {
          return {
            name: ing.ingredient_recipe.name,
            composition: null,
            bakerPercentage: ing.baker_percentage || 0,
            allergens: [],
            allergensSecondary: [],
          };
        }
        // For regular raw materials
        return {
          name: ing.raw_materials?.name || 'Inconnu',
          composition: ing.raw_materials?.composition || null,
          bakerPercentage: ing.baker_percentage || 0,
          allergens: ing.raw_materials?.allergens || [],
          allergensSecondary: ing.raw_materials?.allergens_secondary || [],
        };
      }) || [];

      const snapshotNutrition: SnapshotNutrition = {
        energyKcal: recipeNutrition?.per_100g_energy_kcal || null,
        energyKj: recipeNutrition?.per_100g_energy_kj || null,
        fat: recipeNutrition?.per_100g_fat || null,
        saturatedFat: recipeNutrition?.per_100g_saturated_fat || null,
        carbohydrates: recipeNutrition?.per_100g_carbohydrates || null,
        sugars: recipeNutrition?.per_100g_sugars || null,
        fiber: recipeNutrition?.per_100g_fiber || null,
        protein: recipeNutrition?.per_100g_protein || null,
        salt: recipeNutrition?.per_100g_salt || null,
      };

      const snapshotAllergens = {
        main: allergens,
        secondary: allergensSecondary,
      };

      // Calculate next version for this recipe
      let version = 1;
      if (mode === 'create') {
        const { count } = await supabase
          .from('product_sheets')
          .select('*', { count: 'exact', head: true })
          .eq('recipe_id', selectedRecipeId);
        version = (count || 0) + 1;
      }

      const data: any = {
        recipe_id: selectedRecipeId,
        product_name: formData.product_name.trim(),
        description: formData.description.trim() || null,
        product_reference: formData.product_reference.trim() || null,
        brand: formData.brand.trim() || null,
        barcode: formData.barcode.trim() || null,
        net_weight: formData.net_weight ? parseFloat(formData.net_weight) : null,
        net_weight_unit: formData.net_weight_unit,
        pieces_per_carton: formData.pieces_per_carton ? parseInt(formData.pieces_per_carton) : null,
        cartons_per_layer: formData.cartons_per_layer ? parseInt(formData.cartons_per_layer) : null,
        layers_per_pallet: formData.layers_per_pallet ? parseInt(formData.layers_per_pallet) : null,
        carton_dimensions: formData.carton_dimensions.trim() || null,
        carton_weight: formData.carton_weight ? parseFloat(formData.carton_weight) : null,
        storage_instructions: formData.storage_instructions.trim() || null,
        dlc_ddm_type: formData.dlc_ddm_type,
        dlc_ddm_days: formData.dlc_ddm_days ? parseInt(formData.dlc_ddm_days) : null,
        thawing_instructions: formData.thawing_instructions.trim() || null,
        usage_instructions: formData.usage_instructions.trim() || null,
        quality_comment: formData.quality_comment.trim() || null,
        origin_country: formData.origin_country.trim() || null,
        product_image_url: imageUrl,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
        created_by: user?.id || null,
        // Generated fields - use condensed list for labels (INCO compliant) with HTML formatting for bold allergens
        ingredients_declaration: ingredientsListCondensedHtml,
        allergen_statement: allergens.length > 0 
          ? `Contient: ${allergens.map(a => a.toUpperCase()).join(', ')}${allergensSecondary.length > 0 ? `. Peut contenir des traces de: ${allergensSecondary.join(', ')}` : ''}`
          : null,
      };

      if (mode === 'create') {
        // Add snapshot data for new FT
        data.version = version;
        data.snapshot_recipe_name = selectedRecipe?.name || null;
        data.snapshot_recipe_code = selectedRecipe?.code || null;
        data.snapshot_ingredients = snapshotIngredients;
        data.snapshot_allergens = snapshotAllergens;
        data.snapshot_nutrition = snapshotNutrition;
        data.snapshot_created_at = new Date().toISOString();
        // INCO workflow: generate initial INCO HTML as draft
        (data as any).inco_html = ingredientsListCondensedHtml || null;
        (data as any).inco_html_original = ingredientsListCondensedHtml || null;
        (data as any).inco_status = 'draft';
        (data as any).inco_version = 0;
        
        await createSheet.mutateAsync(data);
      } else if (sheet) {
        // Only update editable fields, not snapshot data
        await updateSheet.mutateAsync({ id: sheet.id, ...data });
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving technical sheet:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            {mode === 'edit' ? 'Modifier la fiche technique' : 'Générer une nouvelle fiche technique'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' 
              ? 'Modifiez les informations logistiques et commerciales'
              : 'Sélectionnez une recette et saisissez les données logistiques du produit'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Recipe Selection */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              1. Sélection de la recette
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipe">Recette source *</Label>
                <Select
                  value={selectedRecipeId}
                  onValueChange={setSelectedRecipeId}
                  disabled={mode === 'edit'}
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
              <div className="space-y-2">
                <Label htmlFor="product-name">Désignation commerciale *</Label>
                <Input
                  id="product-name"
                  placeholder="Ex: Pain de campagne tradition"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description du produit</Label>
              <Textarea
                id="description"
                placeholder="Description courte du produit pour la fiche technique..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Recipe Data Preview (Read-only) */}
          {selectedRecipeId && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                    Données recette (lecture seule)
                  </h4>
                </div>
                
                {/* Ingredients - Show both versions */}
                <div className="space-y-3">
                <div className="p-4 bg-muted/30 rounded-lg border">
                    <h5 className="font-medium text-sm mb-2">Liste ingrédients condensée (étiquette INCO)</h5>
                    <p 
                      className="text-sm text-muted-foreground whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ 
                        __html: ingredientsListCondensedHtml || 'Aucun ingrédient défini dans la recette' 
                      }}
                    />
                  </div>
                  <details className="group">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                      Voir la liste technique complète
                    </summary>
                    <div className="p-4 mt-2 bg-muted/20 rounded-lg border">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {ingredientsListTechnical || 'Aucun ingrédient défini dans la recette'}
                      </p>
                    </div>
                  </details>
                </div>

                {/* Allergens */}
                {(allergens.length > 0 || allergensSecondary.length > 0) && (
                  <div className="p-4 bg-warning/5 rounded-lg border border-warning/20">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <h5 className="font-medium text-sm">Allergènes</h5>
                    </div>
                    {allergens.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {allergens.map((allergen) => (
                          <Badge key={allergen} variant="destructive">
                            {allergen.toUpperCase()}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {allergensSecondary.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-sm text-muted-foreground">Traces:</span>
                        {allergensSecondary.map((allergen) => (
                          <Badge key={allergen} variant="outline" className="bg-warning/10">
                            {allergen}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Nutrition */}
                {recipeNutrition && (
                  <div className="p-4 bg-muted/30 rounded-lg border">
                    <h5 className="font-medium text-sm mb-3">Valeurs nutritionnelles (pour 100g)</h5>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-sm">
                      <div className="text-center p-2 bg-background rounded">
                        <p className="text-muted-foreground text-xs">Énergie</p>
                        <p className="font-medium">{recipeNutrition.per_100g_energy_kcal?.toFixed(0) || '—'} kcal</p>
                      </div>
                      <div className="text-center p-2 bg-background rounded">
                        <p className="text-muted-foreground text-xs">Lipides</p>
                        <p className="font-medium">{recipeNutrition.per_100g_fat?.toFixed(1) || '—'} g</p>
                      </div>
                      <div className="text-center p-2 bg-background rounded">
                        <p className="text-muted-foreground text-xs">Glucides</p>
                        <p className="font-medium">{recipeNutrition.per_100g_carbohydrates?.toFixed(1) || '—'} g</p>
                      </div>
                      <div className="text-center p-2 bg-background rounded">
                        <p className="text-muted-foreground text-xs">Protéines</p>
                        <p className="font-medium">{recipeNutrition.per_100g_protein?.toFixed(1) || '—'} g</p>
                      </div>
                      <div className="text-center p-2 bg-background rounded">
                        <p className="text-muted-foreground text-xs">Sel</p>
                        <p className="font-medium">{recipeNutrition.per_100g_salt?.toFixed(2) || '—'} g</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Commercial Data */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              2. Données commerciales
            </h4>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reference">Référence produit</Label>
                <Input
                  id="reference"
                  placeholder="REF-001"
                  value={formData.product_reference}
                  onChange={(e) => setFormData({ ...formData, product_reference: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marque</Label>
                <Input
                  id="brand"
                  placeholder="Breadshop"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Code-barres</Label>
                <Input
                  id="barcode"
                  placeholder="3701234567890"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="net-weight">Poids net</Label>
                <div className="flex gap-2">
                  <Input
                    id="net-weight"
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="500"
                    value={formData.net_weight}
                    onChange={(e) => setFormData({ ...formData, net_weight: e.target.value })}
                  />
                  <Select
                    value={formData.net_weight_unit}
                    onValueChange={(value) => setFormData({ ...formData, net_weight_unit: value })}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEIGHT_UNITS.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="space-y-2">
                <Label>Visuel produit</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="product-image"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => document.getElementById('product-image')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {imagePreview ? 'Changer' : 'Ajouter'}
                  </Button>
                  {imagePreview && (
                    <div className="h-10 w-10 rounded border overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Logistics Data */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              3. Données logistiques
            </h4>
            
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pieces-carton">Pièces / carton</Label>
                <Input
                  id="pieces-carton"
                  type="number"
                  min="0"
                  placeholder="20"
                  value={formData.pieces_per_carton}
                  onChange={(e) => setFormData({ ...formData, pieces_per_carton: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cartons-layer">Cartons / couche</Label>
                <Input
                  id="cartons-layer"
                  type="number"
                  min="0"
                  placeholder="10"
                  value={formData.cartons_per_layer}
                  onChange={(e) => setFormData({ ...formData, cartons_per_layer: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="layers-pallet">Couches / palette</Label>
                <Input
                  id="layers-pallet"
                  type="number"
                  min="0"
                  placeholder="5"
                  value={formData.layers_per_pallet}
                  onChange={(e) => setFormData({ ...formData, layers_per_pallet: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carton-weight">Poids carton (kg)</Label>
                <Input
                  id="carton-weight"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="10.5"
                  value={formData.carton_weight}
                  onChange={(e) => setFormData({ ...formData, carton_weight: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="carton-dimensions">Dimensions du carton</Label>
              <Input
                id="carton-dimensions"
                placeholder="L x l x H (ex: 60 x 40 x 20 cm)"
                value={formData.carton_dimensions}
                onChange={(e) => setFormData({ ...formData, carton_dimensions: e.target.value })}
              />
            </div>
          </div>

          {/* Conservation & Usage */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              4. Conservation & Mise en œuvre
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dlc-type">Type de date limite</Label>
                <Select
                  value={formData.dlc_ddm_type}
                  onValueChange={(value) => setFormData({ ...formData, dlc_ddm_type: value })}
                >
                  <SelectTrigger id="dlc-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DLC">DLC (Date Limite de Consommation)</SelectItem>
                    <SelectItem value="DDM">DDM (Date de Durabilité Minimale)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dlc-days">Durée (jours)</Label>
                <Input
                  id="dlc-days"
                  type="number"
                  min="0"
                  placeholder="90"
                  value={formData.dlc_ddm_days}
                  onChange={(e) => setFormData({ ...formData, dlc_ddm_days: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="storage">Conditions de conservation</Label>
              <Select
                value={formData.storage_type}
                onValueChange={(value: 'ambient' | 'frozen' | 'other') => {
                  const storageText = value === 'ambient' 
                    ? STORAGE_OPTIONS[0].label 
                    : value === 'frozen' 
                      ? STORAGE_OPTIONS[1].label 
                      : '';
                  const thawingText = value === 'frozen' ? DEFAULT_THAWING_INSTRUCTIONS : '';
                  setFormData({ 
                    ...formData, 
                    storage_type: value, 
                    storage_instructions: storageText,
                    thawing_instructions: thawingText
                  });
                }}
              >
                <SelectTrigger id="storage">
                  <SelectValue placeholder="Sélectionnez les conditions de conservation" />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.storage_type === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="storage-custom">Saisie manuelle</Label>
                <Textarea
                  id="storage-custom"
                  placeholder="Saisissez les conditions de conservation..."
                  value={formData.storage_instructions}
                  onChange={(e) => setFormData({ ...formData, storage_instructions: e.target.value })}
                  rows={2}
                />
              </div>
            )}

            {formData.storage_type === 'frozen' && (
              <div className="space-y-2">
                <Label htmlFor="thawing">Mode de décongélation</Label>
                <Textarea
                  id="thawing"
                  value={formData.thawing_instructions}
                  onChange={(e) => setFormData({ ...formData, thawing_instructions: e.target.value })}
                  rows={2}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="usage">Conseils de mise en œuvre</Label>
              <Textarea
                id="usage"
                placeholder="Réchauffer au four à 180°C pendant 5 minutes..."
                value={formData.usage_instructions}
                onChange={(e) => setFormData({ ...formData, usage_instructions: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Quality Comment */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              5. Commentaire qualité
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="quality-comment">Remarques internes</Label>
              <Textarea
                id="quality-comment"
                placeholder="Notes qualité, validations, spécificités..."
                value={formData.quality_comment}
                onChange={(e) => setFormData({ ...formData, quality_comment: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          {/* Publish Status */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Fiche validée</p>
              <p className="text-sm text-muted-foreground">
                La fiche technique est approuvée et prête à l'utilisation
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
            disabled={isSubmitting || !selectedRecipeId || !formData.product_name.trim()}
          >
            {isSubmitting ? 'Enregistrement...' : mode === 'edit' ? 'Modifier' : 'Générer la FT'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
