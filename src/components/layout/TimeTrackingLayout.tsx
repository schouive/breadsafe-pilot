import {
  LayoutDashboard,
  Clock,
  FileEdit,
  CreditCard,
  Scan,
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';
import { useAuth } from '@/hooks/useAuth';

interface TimeTrackingLayoutProps {
  children: React.ReactNode;
}

const fullNavigation = [
  { name: 'Tableau de bord', href: '/time-tracking/dashboard', icon: LayoutDashboard },
  { name: 'Mon historique', href: '/time-tracking/history', icon: Clock },
  { name: 'Corrections', href: '/time-tracking/corrections', icon: FileEdit },
  { name: 'Badges', href: '/time-tracking/badges', icon: CreditCard },
];

const employeeNavigation = [
  { name: 'Mon historique', href: '/time-tracking/history', icon: Clock },
];

export function TimeTrackingLayout({ children }: TimeTrackingLayoutProps) {
  const { hasRole } = useAuth();

  const isOperatorOnly =
    hasRole('operator') &&
    !hasRole('admin') &&
    !hasRole('quality_assistant') &&
    !hasRole('bureau_methodes') &&
    !hasRole('auditor');

  const navigation = isOperatorOnly ? employeeNavigation : fullNavigation;

  return (
    <ModuleLayout
      moduleName="Pointage"
      moduleColor="text-primary"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  );
}
