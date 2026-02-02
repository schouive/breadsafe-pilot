import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, Filter, Search, ChevronDown, ChevronUp, Printer, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useActiveRecipes } from '@/hooks/useRecipes';
import {
  useRecipesWithIngredients,
  useRecipeComparison,
  extractUniqueMaterials,
  ReferenceType,
} from '@/hooks/useRecipeComparison';
import { ComparisonChart } from '@/components/recipes/ComparisonChart';
import { exportComparisonToPdf, printComparison } from '@/lib/recipeComparisonExport';

const REFERENCE_OPTIONS: { value: ReferenceType; label: string }[] = [
  { value: 'flour', label: 'Farine totale' },
  { value: 'water', label: 'Eau totale' },
  { value: 'dough', label: 'Poids total pâte' },
];

export default function RecipeData() {
  // État de sélection
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [referenceType, setReferenceType] = useState<ReferenceType>('flour');
  const [displayMode, setDisplayMode] = useState<'percentage' | 'decimal'>('percentage');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [showRecipeSelector, setShowRecipeSelector] = useState(true);

  // Données
  const { data: allRecipes, isLoading: recipesLoading } = useActiveRecipes();
  const { data: recipesWithIngredients, isLoading: ingredientsLoading } = useRecipesWithIngredients(selectedRecipeIds);

  // MP disponibles dans les recettes sélectionnées
  const availableMaterials = useMemo(() => {
    if (!recipesWithIngredients) return [];
    return extractUniqueMaterials(recipesWithIngredients);
  }, [recipesWithIngredients]);

  // Résultats de comparaison
  const comparisonResults = useRecipeComparison(
    recipesWithIngredients || [],
    selectedMaterialId,
    referenceType
  );

  // Filtrer les recettes pour la recherche
  const filteredRecipes = useMemo(() => {
    if (!allRecipes) return [];
    const search = recipeSearch.toLowerCase();
    return allRecipes.filter(r =>
      r.name.toLowerCase().includes(search) ||
      r.code?.toLowerCase().includes(search)
    );
  }, [allRecipes, recipeSearch]);

  // Toggle sélection recette
  const toggleRecipe = (recipeId: string) => {
    setSelectedRecipeIds(prev =>
      prev.includes(recipeId)
        ? prev.filter(id => id !== recipeId)
        : [...prev, recipeId]
    );
  };

  // Sélectionner/désélectionner tout
  const toggleAllRecipes = () => {
    if (selectedRecipeIds.length === filteredRecipes.length) {
      setSelectedRecipeIds([]);
    } else {
      setSelectedRecipeIds(filteredRecipes.map(r => r.id));
    }
  };

  // Handlers pour export
  const handleExportPdf = () => {
    if (comparisonResults.length === 0) return;
    exportComparisonToPdf({
      results: comparisonResults,
      materialName: selectedMaterialName,
      referenceLabel,
      displayMode,
    });
  };

  const handlePrint = () => {
    if (comparisonResults.length === 0) return;
    printComparison({
      results: comparisonResults,
      materialName: selectedMaterialName,
      referenceLabel,
      displayMode,
    });
  };

  // Nom de la MP sélectionnée
  const selectedMaterialName = availableMaterials.find(m => m.id === selectedMaterialId)?.name || '';

  // Référentiel label
  const referenceLabel = REFERENCE_OPTIONS.find(o => o.value === referenceType)?.label || '';

  const isLoading = recipesLoading || ingredientsLoading;

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Analyse comparative des recettes
        </h1>
        <p className="text-muted-foreground mt-1">
          Comparez les matières premières entre plusieurs recettes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Panneau de sélection */}
        <div className="lg:col-span-1 space-y-4">
          {/* Sélection des recettes */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Recettes</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRecipeSelector(!showRecipeSelector)}
                >
                  {showRecipeSelector ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </div>
              {selectedRecipeIds.length > 0 && (
                <Badge variant="secondary" className="w-fit">
                  {selectedRecipeIds.length} sélectionnée{selectedRecipeIds.length > 1 ? 's' : ''}
                </Badge>
              )}
            </CardHeader>
          {showRecipeSelector && (
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher..."
                      value={recipeSearch}
                      onChange={(e) => setRecipeSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <Button variant="outline" size="sm" onClick={toggleAllRecipes}>
                      {selectedRecipeIds.length === filteredRecipes.length ? 'Désélectionner tout' : 'Tout sélectionner'}
                    </Button>
                  </div>
                  <ScrollArea className="h-48">
                    <div className="space-y-1">
                      {filteredRecipes.map(recipe => {
                        const isSelected = selectedRecipeIds.includes(recipe.id);
                        return (
                          <button
                            key={recipe.id}
                            type="button"
                            className={`w-full text-left p-3 rounded-md transition-colors ${
                              isSelected 
                                ? 'bg-primary text-primary-foreground' 
                                : 'bg-muted/30 hover:bg-muted'
                            }`}
                            onClick={() => toggleRecipe(recipe.id)}
                          >
                            <p className="text-sm font-medium truncate">{recipe.name}</p>
                            {recipe.code && (
                              <p className={`text-xs ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {recipe.code}
                              </p>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Sélection MP et référentiel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Paramètres d'analyse
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sélection de la MP */}
              <div className="space-y-2">
                <Label>Matière première</Label>
                {availableMaterials.length > 0 ? (
                  <Select
                    value={selectedMaterialId || ''}
                    onValueChange={(v) => setSelectedMaterialId(v || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une MP" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMaterials.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          <span className="flex items-center gap-2">
                            {m.name}
                            {m.type === 'farine' && (
                              <Badge variant="outline" className="text-xs">Farine</Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sélectionnez d'abord des recettes
                  </p>
                )}
              </div>

              {/* Référentiel */}
              <div className="space-y-2">
                <Label>Référentiel de comparaison</Label>
                <Select
                  value={referenceType}
                  onValueChange={(v) => setReferenceType(v as ReferenceType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REFERENCE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mode d'affichage */}
              <div className="space-y-2">
                <Label>Mode d'expression</Label>
                <Select
                  value={displayMode}
                  onValueChange={(v) => setDisplayMode(v as 'percentage' | 'decimal')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Pourcentage (%)</SelectItem>
                    <SelectItem value="decimal">Valeur décimale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Résultats */}
        <div className="lg:col-span-2 space-y-4">
          {/* Actions d'export */}
          {comparisonResults.length > 0 && (
            <div className="flex justify-end gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimer
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Imprimer le rapport comparatif</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="default" size="sm" onClick={handleExportPdf}>
                      <FileDown className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Télécharger le rapport en PDF</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}

          {/* Histogramme */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Histogramme comparatif</CardTitle>
            </CardHeader>
            <CardContent>
              <ComparisonChart
                data={comparisonResults}
                displayMode={displayMode}
                materialName={selectedMaterialName || 'Matière première'}
                referenceLabel={referenceLabel}
              />
            </CardContent>
          </Card>

          {/* Tableau de synthèse */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tableau de synthèse</CardTitle>
            </CardHeader>
            <CardContent>
              {comparisonResults.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recette</TableHead>
                        <TableHead className="text-right">Qté MP (kg)</TableHead>
                        <TableHead className="text-right">Réf. (kg)</TableHead>
                        <TableHead className="text-right">
                          {displayMode === 'percentage' ? 'Ratio (%)' : 'Ratio'}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparisonResults.map((result, index) => {
                        const isMax = result.percentage === Math.max(...comparisonResults.map(r => r.percentage));
                        const isMin = result.percentage === Math.min(...comparisonResults.map(r => r.percentage));
                        
                        return (
                          <TableRow key={result.recipeId}>
                            <TableCell>
                              <div>
                                <span className="font-medium">{result.recipeName}</span>
                                {result.recipeCode && (
                                  <span className="text-xs text-muted-foreground ml-2">
                                    ({result.recipeCode})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {result.materialQuantityKg.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {result.referenceQuantityKg.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <span className={`font-mono ${isMax ? 'text-destructive font-bold' : ''} ${isMin ? 'text-primary font-bold' : ''}`}>
                                {displayMode === 'percentage' 
                                  ? `${result.percentage.toFixed(2)}%`
                                  : result.ratio.toFixed(4)
                                }
                              </span>
                              {isMax && <Badge variant="destructive" className="ml-2 text-xs">Max</Badge>}
                              {isMin && <Badge variant="secondary" className="ml-2 text-xs">Min</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Aucun résultat à afficher
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
