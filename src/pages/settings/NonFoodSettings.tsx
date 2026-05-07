import { NonFoodProductManagement } from '@/components/settings/NonFoodProductManagement';

export default function NonFoodSettings() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Produits non-alimentaires</h1>
        <p className="text-muted-foreground mt-1">Consommables, emballages, équipements</p>
      </div>
      <NonFoodProductManagement />
    </div>
  );
}
