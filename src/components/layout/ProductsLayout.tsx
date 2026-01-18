import { 
  BookOpen,
  FileText
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface ProductsLayoutProps {
  children: React.ReactNode;
}

const productsNavigation = [
  { name: 'Recettes & Fiches', href: '/products', icon: BookOpen },
];

export function ProductsLayout({ children }: ProductsLayoutProps) {
  return (
    <ModuleLayout
      moduleName="Recettes & Étiquetage"
      moduleColor="text-success"
      navigation={productsNavigation}
    >
      {children}
    </ModuleLayout>
  );
}
