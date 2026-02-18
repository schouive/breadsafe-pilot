import { 
  LayoutDashboard, 
  ClipboardCheck, 
  AlertTriangle, 
  Calendar, 
  BarChart3,
  Thermometer,
  History,
  Magnet
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';
import { useOpenNonConformities } from '@/hooks/useNonConformities';
import { useAuth } from '@/hooks/useAuth';

interface HACCPLayoutProps {
  children: React.ReactNode;
}

const fullNavigation = [
  { name: 'Tableau de bord', href: '/haccp/dashboard', icon: LayoutDashboard },
  { name: 'Contrôles', href: '/haccp/controls', icon: ClipboardCheck },
  { name: 'Détecteur métaux', href: '/haccp/metal-detector', icon: Magnet },
  { name: 'Historique réceptions', href: '/haccp/reception-history', icon: History },
  { name: 'Non-conformités', href: '/haccp/non-conformities', icon: AlertTriangle, badgeKey: 'nc_count' },
  { name: 'Températures', href: '/haccp/temperatures', icon: Thermometer },
  { name: 'Planning', href: '/haccp/planning', icon: Calendar },
  { name: 'Rapports', href: '/haccp/reports', icon: BarChart3 },
];

// Navigation simplifiée pour les opérateurs
const operatorNavigation = [
  { name: 'Contrôles', href: '/haccp/controls', icon: ClipboardCheck },
];

export function HACCPLayout({ children }: HACCPLayoutProps) {
  const { data: openNCs } = useOpenNonConformities();
  const { hasRole } = useAuth();
  const ncCount = openNCs?.length || 0;

  // Les opérateurs n'ont accès qu'aux contrôles
  const isOperatorOnly = hasRole('operator') && 
    !hasRole('admin') && 
    !hasRole('quality_assistant') && 
    !hasRole('bureau_methodes') && 
    !hasRole('auditor');

  const navigation = isOperatorOnly ? operatorNavigation : fullNavigation;

  return (
    <ModuleLayout
      moduleName="HACCP"
      moduleColor="text-primary"
      navigation={navigation}
      badges={{ nc_count: ncCount }}
    >
      {children}
    </ModuleLayout>
  );
}
