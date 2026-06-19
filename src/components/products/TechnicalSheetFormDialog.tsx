import { useState, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw } from 'lucide-react';
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

import { useFamilies } from '@/hooks/useProductCatalog';
const WEIGHT_UNITS = ['g', 'kg', 'L', 'mL', 'cl'];

const ALL_ALLERGENS = [
  'Gluten', 'Œufs', 'Arachides',
  'Soja', 'Lait', 'Fruits à coque', 'Sésame',
];

// Normalize allergen names for comparison (handles Œufs/Oeufs/Œuf variants, singular/plural)
const normalizeAllergen = (a: string) => {
  let n = a.toLowerCase().replace('œ', 'oe').replace('à', 'a').trim();
  // Normalize singular/plural: remove trailing 's' for comparison
  if (n.endsWith('s') && n.length > 2) n = n.slice(0, -1);
  return n;
};

const STORAGE_OPTIONS = [
  { value: 'ambient', label: 'À conserver à température ambiante, de préférence inférieure à 30°C' },
  { value: 'frozen', label: 'À conserver à -12°C' },
  { value: 'other', label: 'Autre (saisie manuelle)' },
];

const USAGE_OPTIONS = [
  { value: 'toaster', label: 'Toaster le produit ou le chauffer sur la plancha avant son utilisation' },
  { value: 'other', label: 'Autre (saisie manuelle)' },
];

const DEFAULT_THAWING_INSTRUCTIONS = 'Décongeler à température ambiante, ne pas recongeler';

// Helper to determine storage type from existing storage instructions
function determineStorageType(storageInstructions: string | null): 'ambient' | 'frozen' | 'other' {
  if (!storageInstructions) return 'ambient';
  const normalized = storageInstructions.toLowerCase();
  if (normalized.includes('-18') || normalized.includes('-12') || normalized.includes('congel')) return 'frozen';
  if (normalized.includes('ambiante') && normalized.includes('30')) return 'ambient';
  return 'other';
}

// Helper to determine usage type from existing usage instructions
function determineUsageType(usageInstructions: string | null): 'toaster' | 'other' {
  if (!usageInstructions) return 'toaster';
  const normalized = usageInstructions.toLowerCase();
  if (normalized.includes('toaster') || normalized.includes('plancha')) return 'toaster';
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
  
  // Editable INCO & allergens state
  const [editableIncoHtml, setEditableIncoHtml] = useState('');
  const [editableAllergens, setEditableAllergens] = useState<string[]>([]);
  const [editableAllergensSecondary, setEditableAllergensSecondary] = useState<string[]>([]);
  const [incoManuallyEdited, setIncoManuallyEdited] = useState(false);
  const [allergensManuallyEdited, setAllergensManuallyEdited] = useState(false);
  const incoEditorRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    product_name: '',
    description: '',
    product_reference: '',
    family_id: '',
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
    usage_type: 'toaster' as 'toaster' | 'other',
    quality_comment: '',
    is_published: false,
  });
  const { data: families = [] } = useFamilies();
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

  // Auto-sync generated INCO & allergens into editable state (only when not manually edited)
  useEffect(() => {
    if (!incoManuallyEdited && ingredientsListCondensedHtml) {
      setEditableIncoHtml(ingredientsListCondensedHtml);
      // Also update editor DOM if mounted
      requestAnimationFrame(() => {
        if (incoEditorRef.current) {
          incoEditorRef.current.innerHTML = ingredientsListCondensedHtml;
        }
      });
    }
  }, [ingredientsListCondensedHtml, incoManuallyEdited]);

  useEffect(() => {
    if (!allergensManuallyEdited) {
      // Deduplicate allergens using normalization (handles Œufs/Oeufs variants)
      const dedup = (list: string[]) => {
        const seen = new Set<string>();
        return list.filter(a => {
          const norm = normalizeAllergen(a);
          if (seen.has(norm)) return false;
          seen.add(norm);
          return true;
        });
      };
      setEditableAllergens(dedup(allergens));
      setEditableAllergensSecondary(dedup(allergensSecondary));
    }
  }, [allergens, allergensSecondary, allergensManuallyEdited]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setIncoManuallyEdited(false);
      setAllergensManuallyEdited(false);
      
      if (sheet && mode === 'edit') {
        // Load existing sheet data for editing
        setSelectedRecipeId(sheet.recipe_id);
        const sheetAny = sheet as any;
        // Load existing INCO & allergens
        setEditableIncoHtml(sheetAny.inco_html || sheetAny.ingredients_declaration || '');
        setIncoManuallyEdited(true); // In edit mode, keep existing content
        const existingAllergens = sheetAny.snapshot_allergens;
        if (existingAllergens) {
          const dedup = (list: string[]) => {
            const seen = new Set<string>();
            return list.filter(a => {
              const norm = normalizeAllergen(a);
              if (seen.has(norm)) return false;
              seen.add(norm);
              return true;
            });
          };
          setEditableAllergens(dedup(existingAllergens.main || []));
          setEditableAllergensSecondary(dedup(existingAllergens.secondary || []));
          setAllergensManuallyEdited(true);
        }
        setFormData({
          product_name: sheet.product_name || '',
          description: sheetAny.description || '',
          product_reference: sheetAny.product_reference || '',
          family_id: sheetAny.family_id || '',
          net_weight: sheet.net_weight?.toString() || '',
          net_weight_unit: sheet.net_weight_unit || 'g',
          pieces_per_carton: sheetAny.pieces_per_carton?.toString() || '',
          cartons_per_layer: sheetAny.cartons_per_layer?.toString() || '',
          layers_per_pallet: sheetAny.layers_per_pallet?.toString() || '',
          carton_dimensions: sheetAny.carton_dimensions || '',
          carton_weight: sheetAny.carton_weight?.toString() || '',
          storage_instructions: sheet.storage_instructions || '',
          storage_type: determineStorageType(sheet.storage_instructions),
          dlc_ddm_type: sheetAny.dlc_ddm_type || 'DLC',
          dlc_ddm_days: sheetAny.dlc_ddm_days?.toString() || '',
          thawing_instructions: sheetAny.thawing_instructions || '',
          usage_instructions: sheet.usage_instructions || '',
          usage_type: determineUsageType(sheet.usage_instructions),
          quality_comment: sheetAny.quality_comment || '',
          is_published: sheet.is_published,
        });
        if (sheetAny.product_image_url) {
          setImagePreview(sheetAny.product_image_url);
        }
      } else {
        // Reset for new FT
        setSelectedRecipeId('');
        setEditableIncoHtml('');
        setEditableAllergens([]);
        setEditableAllergensSecondary([]);
        setFormData({
          product_name: '',
          description: '',
          product_reference: '',
          family_id: '',
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
          usage_type: 'toaster' as 'toaster' | 'other',
          quality_comment: '',
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
        main: editableAllergens,
        secondary: editableAllergensSecondary,
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
        family_id: formData.family_id || null,
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
        
        product_image_url: imageUrl,
        is_published: formData.is_published,
        published_at: formData.is_published ? new Date().toISOString() : null,
        created_by: user?.id || null,
        // Generated fields - use editable INCO HTML
        ingredients_declaration: editableIncoHtml,
        allergen_statement: editableAllergens.length > 0 
          ? `Contient: ${editableAllergens.map(a => a.toUpperCase()).join(', ')}${editableAllergensSecondary.length > 0 ? `. Peut contenir des traces de: ${editableAllergensSecondary.join(', ')}` : ''}`
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
        // INCO workflow: use editable HTML as draft
        (data as any).inco_html = editableIncoHtml || null;
        (data as any).inco_html_original = ingredientsListCondensedHtml || null;
        (data as any).inco_status = 'draft';
        (data as any).inco_version = 0;
        
        await createSheet.mutateAsync(data);
      } else if (sheet) {
        // Update editable fields + INCO data
        data.inco_html = editableIncoHtml || null;
        data.snapshot_allergens = snapshotAllergens;
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

            <div className="space-y-2">
              <Label htmlFor="family">Famille de produit</Label>
              <Select
                value={formData.family_id || 'none'}
                onValueChange={(v) => setFormData({ ...formData, family_id: v === 'none' ? '' : v })}
              >
                <SelectTrigger id="family">
                  <SelectValue placeholder="Sélectionnez une famille (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Aucune —</SelectItem>
                  {families.filter((f: any) => f.active).map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="font-mono mr-2">{f.code}</span>{f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Permet de classer la FT et de la retrouver plus rapidement dans le catalogue d'impression.
              </p>
            </div>
          </div>

          {/* INCO & Allergens - Editable */}
          {selectedRecipeId && (
            <>
              <Separator />
              <div className="space-y-4">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
                  Données recette & INCO
                </h4>
                
                {/* Editable INCO ingredient list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Liste des ingrédients INCO</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIncoManuallyEdited(false);
                        setEditableIncoHtml(ingredientsListCondensedHtml);
                        requestAnimationFrame(() => {
                          if (incoEditorRef.current) {
                            incoEditorRef.current.innerHTML = ingredientsListCondensedHtml;
                          }
                        });
                      }}
                      className="text-xs h-7"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Régénérer
                    </Button>
                  </div>
                  <div
                    ref={incoEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    className="text-sm p-3 bg-background rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[80px]"
                    onInput={(e) => {
                      setEditableIncoHtml(e.currentTarget.innerHTML);
                      setIncoManuallyEdited(true);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Liste auto-générée depuis la recette. Modifiable directement. Les allergènes en <strong>gras</strong> sont conservés.
                  </p>
                </div>

                {/* Editable allergens - toggle grid */}
                <div className="p-4 bg-warning/5 rounded-lg border border-warning/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <h5 className="font-medium text-sm">Allergènes (Contient)</h5>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAllergensManuallyEdited(false);
                        setEditableAllergens(allergens);
                        setEditableAllergensSecondary(allergensSecondary);
                      }}
                      className="text-xs h-7"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" /> Régénérer
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {ALL_ALLERGENS.map((allergen) => {
                      const isSelected = editableAllergens.some(a => normalizeAllergen(a) === normalizeAllergen(allergen));
                      return (
                        <Badge
                          key={allergen}
                          variant={isSelected ? 'destructive' : 'outline'}
                          className={`cursor-pointer select-none transition-colors ${
                            isSelected ? '' : 'opacity-50 hover:opacity-80'
                          }`}
                          onClick={() => {
                            setAllergensManuallyEdited(true);
                            if (isSelected) {
                              setEditableAllergens(prev => prev.filter(a => normalizeAllergen(a) !== normalizeAllergen(allergen)));
                            } else {
                              setEditableAllergens(prev => [...prev, allergen]);
                            }
                          }}
                        >
                          {allergen.toUpperCase()}
                        </Badge>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cliquez pour sélectionner ou désélectionner un allergène
                  </p>

                  {/* Secondary allergens (traces) */}
                  <div className="pt-2 border-t border-warning/20">
                    <p className="text-xs text-muted-foreground mb-2">Traces éventuelles</p>
                    <div className="flex flex-wrap gap-2">
                      {ALL_ALLERGENS.map((allergen) => {
                        const isMainSelected = editableAllergens.some(a => normalizeAllergen(a) === normalizeAllergen(allergen));
                        if (isMainSelected) return null; // Don't show in traces if already in main
                        const isSelected = editableAllergensSecondary.some(a => normalizeAllergen(a) === normalizeAllergen(allergen));
                        return (
                          <Badge
                            key={allergen}
                            variant="outline"
                            className={`cursor-pointer select-none transition-colors ${
                              isSelected ? 'bg-warning/20 border-warning/40' : 'opacity-50 hover:opacity-80'
                            }`}
                            onClick={() => {
                              setAllergensManuallyEdited(true);
                              if (isSelected) {
                                setEditableAllergensSecondary(prev => prev.filter(a => normalizeAllergen(a) !== normalizeAllergen(allergen)));
                              } else {
                                setEditableAllergensSecondary(prev => [...prev, allergen]);
                              }
                            }}
                          >
                            {allergen}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Nutrition (read-only) */}
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
            </>
          )}

          {/* Commercial Data */}
          <Separator />
          <div className="space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              2. Données commerciales
            </h4>
            
            <div>
              <div className="space-y-2">
                <Label htmlFor="reference">Référence produit</Label>
                <Input
                  id="reference"
                  placeholder="REF-001"
                  value={formData.product_reference}
                  onChange={(e) => setFormData({ ...formData, product_reference: e.target.value })}
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

          {/* Packagings (only in edit mode, after FT exists) */}
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
              <Label htmlFor="usage">Conseils de mise en oeuvre</Label>
              <Select
                value={formData.usage_type}
                onValueChange={(value) => {
                  const type = value as 'toaster' | 'other';
                  const defaultText = type === 'toaster' ? 'Toaster le produit ou le chauffer sur la plancha avant son utilisation' : '';
                  setFormData({ ...formData, usage_type: type, usage_instructions: defaultText });
                }}
              >
                <SelectTrigger id="usage"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {USAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.usage_type === 'other' && (
                <Textarea
                  id="usage-custom"
                  placeholder="Saisir le conseil de mise en oeuvre personnalise..."
                  value={formData.usage_instructions}
                  onChange={(e) => setFormData({ ...formData, usage_instructions: e.target.value })}
                  rows={2}
                />
              )}
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
