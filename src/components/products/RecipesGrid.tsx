import { ChefHat, Eye, Edit2, Copy, Trash2, CheckCircle, FileEdit, Euro } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Recipe } from '@/hooks/useRecipes';
import { useIntermediateProductCostsMap } from '@/hooks/useIntermediateProductCost';
import { cn } from '@/lib/utils';

interface RecipesGridProps {
  recipes: Recipe[];
  onView: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onDuplicate: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  isDuplicating?: boolean;
}

export function RecipesGrid({ 
  recipes, 
  onView, 
  onEdit, 
  onDuplicate, 
  onDelete,
  isDuplicating 
}: RecipesGridProps) {
  const { costsMap } = useIntermediateProductCostsMap();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {recipes.map((recipe) => {
        const isIntermediate = (recipe as any).recipe_type === 'intermediate';
        const piCost = isIntermediate ? costsMap[recipe.id] : null;
        
        return (
          <Card 
            key={recipe.id} 
            className={cn(
              "hover:shadow-md transition-shadow cursor-pointer",
              !recipe.is_active && "opacity-60",
              isIntermediate && "border-amber-200 bg-amber-50/30"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                    {isIntermediate && (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 text-xs">
                        PI
                      </Badge>
                    )}
                  </div>
                  {recipe.code && (
                    <CardDescription className="font-mono">{recipe.code}</CardDescription>
                  )}
                </div>
                <Badge 
                  variant={recipe.status === 'validated' ? 'default' : 'secondary'}
                  className={cn(
                    recipe.status === 'validated' && "bg-success text-success-foreground"
                  )}
                >
                  {recipe.status === 'validated' ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Validée
                    </>
                  ) : (
                    <>
                      <FileEdit className="h-3 w-3 mr-1" />
                      Brouillon
                    </>
                  )}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {recipe.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {recipe.description}
                </p>
              )}
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <span>Ratio cuisson: {recipe.baking_ratio || 0.9}</span>
                {recipe.process_losses > 0 && (
                  <span>• Pertes: {recipe.process_losses}%</span>
                )}
              </div>

              {/* PI Price per kg */}
              {isIntermediate && piCost && (
                <div className="flex items-center gap-2 mb-4 p-2 rounded-md bg-amber-100/50 border border-amber-200">
                  <Euro className="h-4 w-4 text-amber-700" />
                  <span className="text-sm font-medium text-amber-800">
                    {piCost.pricePerKg.toFixed(2)} €/kg
                  </span>
                  <span className="text-xs text-amber-600">
                    (coût calculé)
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => onView(recipe)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Voir
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onEdit(recipe)}
                  title="Modifier la recette"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDuplicate(recipe)}
                  disabled={isDuplicating}
                  title="Dupliquer la recette"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => onDelete(recipe)}
                  title="Supprimer la recette"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
