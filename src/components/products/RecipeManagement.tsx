import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Edit2, Trash2, Eye, ChefHat, Scale, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useRecipes, useDeleteRecipe, Recipe } from '@/hooks/useRecipes';
import { cn } from '@/lib/utils';
import { RecipeDetailSheet } from './RecipeDetailSheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

function RecipeRow({ 
  recipe, 
  onView, 
  onEdit, 
  onDelete 
}: { 
  recipe: Recipe; 
  onView: () => void; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const isIntermediate = recipe.recipe_type === 'intermediate';
  
  return (
    <div
      className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-colors",
        recipe.is_active ? "bg-card hover:bg-muted/50" : "bg-muted/50 opacity-60"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "h-12 w-12 rounded-lg flex items-center justify-center",
          isIntermediate ? "bg-amber-500/10" : "bg-primary/10"
        )}>
          {isIntermediate ? (
            <FlaskConical className="h-6 w-6 text-amber-600" />
          ) : (
            <ChefHat className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-medium">{recipe.name}</p>
            {recipe.code && (
              <Badge variant="outline" className="text-xs">
                {recipe.code}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {recipe.category && <span>{recipe.category}</span>}
            <span className="flex items-center gap-1">
              <Scale className="h-3 w-3" />
              {recipe.yield_quantity} {recipe.yield_unit}
            </span>
          </div>
          {recipe.description && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {recipe.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={recipe.is_active ? 'bg-success/10 text-success border-success/30' : ''}
        >
          {recipe.is_active ? 'Active' : 'Inactive'}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={onView}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function RecipeManagement() {
  const { data: recipes, isLoading } = useRecipes();
  const deleteRecipe = useDeleteRecipe();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);

  // Separate and sort recipes by type
  const { finishedRecipes, intermediateRecipes } = useMemo(() => {
    if (!recipes) return { finishedRecipes: [], intermediateRecipes: [] };
    
    const finished = recipes
      .filter(r => r.recipe_type === 'finished')
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    
    const intermediate = recipes
      .filter(r => r.recipe_type === 'intermediate')
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    
    return { finishedRecipes: finished, intermediateRecipes: intermediate };
  }, [recipes]);

  const handleDelete = async () => {
    if (!deletingRecipe) return;
    await deleteRecipe.mutateAsync(deletingRecipe.id);
    setDeletingRecipe(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Recettes</CardTitle>
                <CardDescription>Gérez vos recettes et leurs compositions</CardDescription>
              </div>
            </div>
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle recette
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Chargement...</p>
          ) : recipes?.length === 0 ? (
            <div className="text-center py-12">
              <ChefHat className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Aucune recette enregistrée</p>
              <Button variant="outline" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une recette
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Finished Products Section */}
              {finishedRecipes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <ChefHat className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-lg">Produits Finis</h3>
                    <Badge variant="secondary" className="ml-auto">
                      {finishedRecipes.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {finishedRecipes.map((recipe) => (
                      <RecipeRow
                        key={recipe.id}
                        recipe={recipe}
                        onView={() => setViewingRecipe(recipe)}
                        onEdit={() => setEditingRecipe(recipe)}
                        onDelete={() => setDeletingRecipe(recipe)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Intermediate Products Section */}
              {intermediateRecipes.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <FlaskConical className="h-5 w-5 text-amber-600" />
                    <h3 className="font-semibold text-lg">Produits Intermédiaires</h3>
                    <Badge variant="secondary" className="ml-auto bg-amber-100 text-amber-700">
                      {intermediateRecipes.length}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    {intermediateRecipes.map((recipe) => (
                      <RecipeRow
                        key={recipe.id}
                        recipe={recipe}
                        onView={() => setViewingRecipe(recipe)}
                        onEdit={() => setEditingRecipe(recipe)}
                        onDelete={() => setDeletingRecipe(recipe)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <RecipeFormDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        recipe={null}
      />

      {/* Edit Dialog */}
      <RecipeFormDialog
        open={!!editingRecipe}
        onOpenChange={(open) => !open && setEditingRecipe(null)}
        recipe={editingRecipe}
      />

      {/* View Sheet */}
      <RecipeDetailSheet
        open={!!viewingRecipe}
        onOpenChange={(open) => !open && setViewingRecipe(null)}
        recipe={viewingRecipe}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingRecipe} onOpenChange={(open) => !open && setDeletingRecipe(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la recette ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La recette "{deletingRecipe?.name}" et tous ses ingrédients seront supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
