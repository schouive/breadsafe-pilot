import { 
  LayoutDashboard, 
  ClipboardCheck, 
  AlertTriangle, 
  Calendar, 
  BarChart3,
  Thermometer
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';
import { useOpenNonConformities } from '@/hooks/useNonConformities';

interface HACCPLayoutProps {
  children: React.ReactNode;
}

const haccpNavigation = [
  { name: 'Contrôles', href: '/haccp/controls', icon: ClipboardCheck },
  { name: 'Non-conformités', href: '/haccp/non-conformities', icon: AlertTriangle, badgeKey: 'nc_count' },
  { name: 'Tableau de bord', href: '/haccp/dashboard', icon: LayoutDashboard },
  { name: 'Températures', href: '/haccp/temperatures', icon: Thermometer },
  { name: 'Planning', href: '/haccp/planning', icon: Calendar },
  { name: 'Rapports', href: '/haccp/reports', icon: BarChart3 },
];

export function HACCPLayout({ children }: HACCPLayoutProps) {
  const { data: openNCs } = useOpenNonConformities();
  const ncCount = openNCs?.length || 0;

  return (
    <ModuleLayout
      moduleName="HACCP"
      moduleColor="text-primary"
      navigation={haccpNavigation}
      badges={{ nc_count: ncCount }}
    >
      {children}
    </ModuleLayout>
  );
}
