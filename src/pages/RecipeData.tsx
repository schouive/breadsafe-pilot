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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3, Filter, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useActiveRecipes } from '@/hooks/useRecipes';
import {
  useRecipesWithIngredients,
  useRecipeComparison,
  extractUniqueMaterials,
  ReferenceType,
} from '@/hooks/useRecipeComparison';

const REFERENCE_OPTIONS: { value: ReferenceType; label: string }[] = [
  { value: 'flour', label: 'Farine totale' },
  { value: 'water', label: 'Eau totale' },
  { value: 'dough', label: 'Poids total pâte' },
];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function RecipeData() {
  // État de sélection
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [referenceType, setReferenceType] = useState<ReferenceType>('flour');
  const [displayMode, setDisplayMode] = useState<'percentage' | 'decimal'>('percentage');
  const [recipeSearch, setRecipeSearch] = useState('');
  const [materialSearch, setMaterialSearch] = useState('');
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

  // Filtrer les MP pour la recherche
  const filteredMaterials = useMemo(() => {
    const search = materialSearch.toLowerCase();
    return availableMaterials.filter(m =>
      m.name.toLowerCase().includes(search)
    );
  }, [availableMaterials, materialSearch]);

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

  // Données pour le graphique
  const chartData = useMemo(() => {
    return comparisonResults.map((result, index) => ({
      name: result.recipeCode || result.recipeName.substring(0, 15),
      fullName: result.recipeName,
      value: displayMode === 'percentage' ? result.percentage : result.ratio,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [comparisonResults, displayMode]);

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
                  <>
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Filtrer..."
                        value={materialSearch}
                        onChange={(e) => setMaterialSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select
                      value={selectedMaterialId || ''}
                      onValueChange={(v) => setSelectedMaterialId(v || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une MP" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredMaterials.map(m => (
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
                  </>
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
          {/* Histogramme */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedMaterialName 
                  ? `${selectedMaterialName} / ${referenceLabel}`
                  : 'Histogramme comparatif'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comparisonResults.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis 
                      tickFormatter={(v) => displayMode === 'percentage' ? `${v.toFixed(1)}%` : v.toFixed(3)}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border rounded-lg shadow-lg p-3">
                              <p className="font-medium">{data.fullName}</p>
                              <p className="text-sm text-muted-foreground">
                                {displayMode === 'percentage' 
                                  ? `${data.value.toFixed(2)}%`
                                  : data.value.toFixed(4)
                                }
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  {selectedRecipeIds.length === 0 
                    ? 'Sélectionnez des recettes pour commencer'
                    : selectedMaterialId 
                      ? 'Aucune donnée à afficher'
                      : 'Sélectionnez une matière première'
                  }
                </div>
              )}
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
