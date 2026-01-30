import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RecipeComparisonData } from '@/hooks/useRecipeComparison';
import { cn } from '@/lib/utils';

interface RecipeComparisonTableProps {
  data: RecipeComparisonData[];
  isLoading: boolean;
}

export function RecipeComparisonTable({ data, isLoading }: RecipeComparisonTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length < 2) {
    return null;
  }

  // Find min/max for highlighting
  const minCost = Math.min(...data.map(d => d.costPerKg));
  const maxCost = Math.max(...data.map(d => d.costPerKg));
  const minHydration = Math.min(...data.map(d => d.totalHydration));
  const maxHydration = Math.max(...data.map(d => d.totalHydration));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tableau comparatif détaillé</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Recette</TableHead>
                <TableHead className="text-right">Poids pâte (%)</TableHead>
                <TableHead className="text-right">Hydratation (%)</TableHead>
                <TableHead className="text-right">Sel (%)</TableHead>
                <TableHead className="text-right">Additifs (%)</TableHead>
                <TableHead className="text-right">Coût/kg (€)</TableHead>
                <TableHead className="text-right">Coût/unité (€)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((recipe) => (
                <TableRow key={recipe.recipeId}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{recipe.recipeName}</span>
                      {recipe.recipeCode && (
                        <Badge variant="outline" className="text-xs">
                          {recipe.recipeCode}
                        </Badge>
                      )}
                      {recipe.recipeType === 'intermediate' && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          PI
                        </Badge>
                      )}
                    </div>
                    {recipe.category && (
                      <p className="text-xs text-muted-foreground">{recipe.category}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {recipe.totalBakerPercentage.toFixed(1)}%
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono",
                    recipe.totalHydration === maxHydration && "text-cyan-600 font-semibold",
                    recipe.totalHydration === minHydration && "text-orange-600"
                  )}>
                    {recipe.totalHydration.toFixed(1)}%
                    {recipe.totalHydration === maxHydration && (
                      <span className="ml-1 text-xs">↑</span>
                    )}
                    {recipe.totalHydration === minHydration && (
                      <span className="ml-1 text-xs">↓</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {recipe.saltPercentage.toFixed(2)}%
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {recipe.additiveLoad.toFixed(2)}%
                  </TableCell>
                  <TableCell className={cn(
                    "text-right font-mono",
                    recipe.costPerKg === minCost && "text-green-600 font-semibold",
                    recipe.costPerKg === maxCost && "text-red-600"
                  )}>
                    {recipe.costPerKg.toFixed(2)} €
                    {recipe.costPerKg === minCost && (
                      <span className="ml-1 text-xs">✓</span>
                    )}
                    {recipe.costPerKg === maxCost && (
                      <span className="ml-1 text-xs">!</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {recipe.costPerUnit > 0 
                      ? `${recipe.costPerUnit.toFixed(3)} €`
                      : '-'
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="text-green-600 font-semibold">✓</span>
            <span>Coût le plus bas</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-red-600">!</span>
            <span>Coût le plus élevé</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-cyan-600 font-semibold">↑</span>
            <span>Hydratation max</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-orange-600">↓</span>
            <span>Hydratation min</span>
          </div>
        </div>

        {/* Ingredient breakdown */}
        <div className="mt-6 pt-6 border-t">
          <h4 className="font-medium mb-4">Détail des ingrédients par recette</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((recipe) => (
              <div key={recipe.recipeId} className="border rounded-lg p-4">
                <h5 className="font-medium mb-2 truncate" title={recipe.recipeName}>
                  {recipe.recipeName}
                </h5>
                <div className="space-y-1 text-sm">
                  {recipe.ingredients
                    .sort((a, b) => b.bakerPercentage - a.bakerPercentage)
                    .slice(0, 8)
                    .map((ing) => (
                      <div key={ing.id} className="flex justify-between">
                        <span className={cn(
                          "truncate max-w-[60%]",
                          ing.isFlour && "font-medium",
                          ing.isWater && "text-cyan-600"
                        )}>
                          {ing.name}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {ing.bakerPercentage.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  {recipe.ingredients.length > 8 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      +{recipe.ingredients.length - 8} autres ingrédients
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
