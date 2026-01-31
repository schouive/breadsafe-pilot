import { 
  BookOpen,
  FileText,
  Package,
  BarChart3
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface ProductsLayoutProps {
  children: React.ReactNode;
}

const productsNavigation = [
  { name: 'Recettes', href: '/products/recipes', icon: BookOpen },
  { name: 'Recettes datas', href: '/products/data', icon: BarChart3 },
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
