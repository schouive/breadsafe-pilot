import { RawMaterialManagement } from '@/components/settings/RawMaterialManagement';

export default function RawMaterialsSettings() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Matières premières</h1>
        <p className="text-muted-foreground mt-1">Référentiel des ingrédients alimentaires</p>
      </div>
      <RawMaterialManagement />
    </div>
  );
}
