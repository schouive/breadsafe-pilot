import { PrintCatalogManagement } from '@/components/settings/PrintCatalogManagement';

export default function PrintCatalogSettings() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Catalogue Impression</h1>
        <p className="text-muted-foreground mt-1">Produits et variantes pour étiquettes Zebra</p>
      </div>
      <PrintCatalogManagement />
    </div>
  );
}
