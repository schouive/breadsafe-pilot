import { RecipeNutrition } from '@/hooks/useRecipes';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatSignificantFigures } from '@/lib/utils';

interface NutritionTableProps {
  nutrition: RecipeNutrition | null | undefined;
}

const nutritionLabels: { key: keyof RecipeNutrition; label: string; unit: string }[] = [
  { key: 'per_100g_energy_kj', label: 'Énergie', unit: 'kJ' },
  { key: 'per_100g_energy_kcal', label: 'Énergie', unit: 'kcal' },
  { key: 'per_100g_fat', label: 'Matières grasses', unit: 'g' },
  { key: 'per_100g_saturated_fat', label: '  dont acides gras saturés', unit: 'g' },
  { key: 'per_100g_carbohydrates', label: 'Glucides', unit: 'g' },
  { key: 'per_100g_sugars', label: '  dont sucres', unit: 'g' },
  { key: 'per_100g_fiber', label: 'Fibres alimentaires', unit: 'g' },
  { key: 'per_100g_protein', label: 'Protéines', unit: 'g' },
  { key: 'per_100g_salt', label: 'Sel', unit: 'g' },
];

export function NutritionTable({ nutrition }: NutritionTableProps) {
  const hasNutritionData = nutrition && nutritionLabels.some(({ key }) => {
    const value = nutrition[key];
    return value !== null && value !== undefined && value !== 0;
  });

  return (
    <div>
      <h4 className="font-medium mb-3">Valeurs nutritionnelles (pour 100g)</h4>
      
      {!hasNutritionData ? (
        <div className="text-center py-6 border border-dashed rounded-lg">
          <p className="text-sm text-muted-foreground">
            Les valeurs nutritionnelles seront calculées automatiquement
            <br />
            une fois les ingrédients et leurs valeurs nutritionnelles renseignés.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nutriment</TableHead>
              <TableHead className="text-right">Pour 100g</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {nutritionLabels.map(({ key, label, unit }) => {
              const value = nutrition?.[key];
              if (value === null || value === undefined) return null;
              
              return (
                <TableRow key={key}>
                  <TableCell className={label.startsWith('  ') ? 'pl-8 text-muted-foreground' : ''}>
                    {label.trim()}
                  </TableCell>
                  <TableCell className="text-right">
                    {typeof value === 'number' ? value.toFixed(2) : value} {unit}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
