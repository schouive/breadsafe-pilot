import { SupplierManagement } from '@/components/settings/SupplierManagement';

export default function SuppliersSettings() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Fournisseurs</h1>
        <p className="text-muted-foreground mt-1">Référentiel des fournisseurs</p>
      </div>
      <SupplierManagement />
    </div>
  );
}
