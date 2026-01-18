import { 
  Settings,
  Users,
  Package,
  Snowflake
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const settingsNavigation = [
  { name: 'Général', href: '/settings', icon: Settings },
];

export function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <ModuleLayout
      moduleName="Paramètres"
      moduleColor="text-muted-foreground"
      navigation={settingsNavigation}
    >
      {children}
    </ModuleLayout>
  );
}
