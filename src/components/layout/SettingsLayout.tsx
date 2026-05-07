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
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const settingsNavigation = [
  { name: 'Général', href: '/settings', icon: Settings },
  { name: 'Chambres froides', href: '/settings/cold-rooms', icon: Snowflake },
  { name: 'Détecteur métaux', href: '/settings/metal-detector', icon: Magnet },
  { name: 'Fournisseurs', href: '/settings/suppliers', icon: Building2 },
  { name: 'Matières premières', href: '/settings/raw-materials', icon: Wheat },
  { name: 'Produits non-alim.', href: '/settings/non-food', icon: Package },
  { name: 'Catalogue Impression', href: '/settings/print-catalog', icon: Printer },
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
