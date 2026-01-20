import { 
  BookOpen,
  FileText,
  Package
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface ProductsLayoutProps {
  children: React.ReactNode;
}

const productsNavigation = [
  { name: 'Recettes', href: '/products/recipes', icon: BookOpen },
  { name: 'Fiche technique', href: '/products/technical-sheet', icon: FileText },
  { name: 'Étiquettes carton', href: '/products/carton-labels', icon: Package },
];

export function ProductsLayout({ children }: ProductsLayoutProps) {
  return (
    <ModuleLayout
      moduleName="Recettes & Étiquetage"
      moduleColor="text-primary"
      navigation={productsNavigation}
    >
      {children}
    </ModuleLayout>
  );
}
