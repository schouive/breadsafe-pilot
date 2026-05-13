import { Printer, ListOrdered, Zap } from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface PrintLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Étiquettes Production', href: '/print', icon: Printer },
  { name: 'Programmes clients', href: '/print/programs', icon: ListOrdered },
  { name: 'Impression rapide', href: '/print/quick', icon: Zap },
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
