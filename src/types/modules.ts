// Modules applicatifs et libellés
export type AppModule =
  | 'haccp'
  | 'products'
  | 'labeling'
  | 'orders'
  | 'time_tracking'
  | 'rd'
  | 'settings';

export const ALL_MODULES: { id: AppModule; label: string; description: string }[] = [
  { id: 'haccp', label: 'HACCP', description: 'Contrôles, températures, non-conformités' },
  { id: 'products', label: 'Produits', description: 'Recettes et fiches techniques' },
  { id: 'labeling', label: 'Étiquetage', description: 'Étiquettes carton et impression' },
  { id: 'orders', label: 'Commandes', description: 'Commandes fournisseurs et réceptions' },
  { id: 'time_tracking', label: 'Pointage', description: 'Pointeuse RFID et historique' },
  { id: 'rd', label: 'R&D', description: 'Essais boulangerie' },
  { id: 'settings', label: 'Paramètres', description: 'Référentiels et configuration' },
];

export function getModuleLabel(m: AppModule): string {
  return ALL_MODULES.find((x) => x.id === m)?.label ?? m;
}
