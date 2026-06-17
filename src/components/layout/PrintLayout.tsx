import { Printer, ListOrdered, Package } from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface PrintLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Étiquettes Production', href: '/print', icon: Printer },
  { name: 'Étiquettes Carton', href: '/print/carton-labels', icon: Package },
  { name: 'Programmes clients', href: '/print/programs', icon: ListOrdered },
];

export function PrintLayout({ children }: PrintLayoutProps) {
  return (
    <ModuleLayout
      moduleName="Impression"
      moduleColor="text-primary"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  );
}
