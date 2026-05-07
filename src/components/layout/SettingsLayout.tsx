import {
  Settings,
  Users,
  Snowflake,
  Building2,
  Wheat,
  Package,
  Printer,
  ShieldAlert,
  ScrollText,
  Download,
  Magnet,
  FolderTree,
  BookOpen,
  Boxes,
  Barcode,
  FileBadge,
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const settingsNavigation = [
  { name: 'Général', href: '/settings', icon: Settings },
  { name: '— Référentiel Produits —', href: '#catalog', icon: Boxes, isHeader: true },
  { name: 'Familles', href: '/settings/catalog/families', icon: FolderTree },
  { name: 'Recettes', href: '/settings/catalog/recipes', icon: BookOpen },
  { name: 'Produits maîtres', href: '/settings/catalog/master', icon: Boxes },
  { name: 'Catalogue d\'impression', href: '/settings/catalog/erp-articles', icon: Printer },
  { name: 'Templates Zebra', href: '/settings/catalog/templates', icon: FileBadge },
  { name: '— HACCP —', href: '#haccp', icon: Snowflake, isHeader: true },
  { name: 'Chambres froides', href: '/settings/cold-rooms', icon: Snowflake },
  { name: 'Détecteur métaux', href: '/settings/metal-detector', icon: Magnet },
  { name: '— Achats —', href: '#purchases', icon: Building2, isHeader: true },
  { name: 'Fournisseurs', href: '/settings/suppliers', icon: Building2 },
  { name: 'Matières premières', href: '/settings/raw-materials', icon: Wheat },
  { name: 'Produits non-alim.', href: '/settings/non-food', icon: Package },
  { name: '— Système —', href: '#system', icon: Settings, isHeader: true },
  { name: 'Utilisateurs', href: '/settings/users', icon: Users },
  { name: 'Journal d\'audit', href: '/settings/audit', icon: ScrollText },
  { name: 'Export des données', href: '/settings/export', icon: Download },
  { name: 'Données & sécurité', href: '/settings/security', icon: ShieldAlert },
];

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <ModuleLayout
      moduleName="Paramètres"
      moduleColor="text-primary"
      navigation={settingsNavigation}
    >
      {children}
    </ModuleLayout>
  );
}
