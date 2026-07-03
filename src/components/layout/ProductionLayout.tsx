import { CalendarClock, ClipboardList, LayoutDashboard, History } from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface ProductionLayoutProps {
  children: React.ReactNode;
}

const productionNavigation = [
  { name: 'Planning', href: '/production', icon: CalendarClock },
  { name: 'Tableau de bord', href: '/production/dashboard', icon: LayoutDashboard },
  { name: 'Historique', href: '/production/history', icon: History },
  { name: 'Journal (dernière fiche)', href: '/production', icon: ClipboardList },
];

export function ProductionLayout({ children }: ProductionLayoutProps) {
  return (
    <ModuleLayout
      moduleName="Journal de Production"
      moduleColor="text-primary"
      navigation={productionNavigation.slice(0, 3)}
    >
      {children}
    </ModuleLayout>
  );
}
