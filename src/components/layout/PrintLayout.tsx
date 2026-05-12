import { Printer, ListOrdered } from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface PrintLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Étiquettes Production', href: '/print', icon: Printer },
  { name: "Ordres d'impression", href: '/print/orders', icon: ListOrdered },
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
