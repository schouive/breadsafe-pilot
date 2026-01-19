import { 
  BookOpen,
  Plus,
  Tag,
  FileText,
  Package
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface ProductsLayoutProps {
  children: React.ReactNode;
}

const productsNavigation = [
  { name: 'Nouvelle recette', href: '/products/new-recipe', icon: Plus },
  { name: 'Recettes', href: '/products/recipes', icon: BookOpen },
  { name: 'Datas Étiquette', href: '/products/label-data', icon: Tag },
  { name: 'Fiche technique', href: '/products/technical-sheet', icon: FileText },
  { name: 'Étiquettes carton', href: '/products/carton-labels', icon: Package },
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
