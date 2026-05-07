import { Printer } from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface PrintLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Étiquettes Production', href: '/print', icon: Printer },
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
