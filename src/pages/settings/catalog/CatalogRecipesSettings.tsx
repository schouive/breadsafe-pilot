import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useCatalogRecipes } from '@/hooks/useProductCatalog';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export default function CatalogRecipesSettings() {
  const { data: recipes = [], isLoading } = useCatalogRecipes();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Recettes</h1>
          <p className="text-muted-foreground mt-1">Vue lecture des recettes liées aux produits maîtres</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/products/recipes">
            Gérer les recettes <ExternalLink className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{recipes.length} recette(s)</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p className="text-muted-foreground">Chargement...</p> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipes.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.code || '—'}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{r.version ?? '—'}</TableCell>
                    <TableCell>{r.is_active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
