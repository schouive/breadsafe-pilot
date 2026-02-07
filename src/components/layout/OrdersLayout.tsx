import {
  ClipboardList,
  PlusCircle,
  PackageCheck,
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';
import { useAuth } from '@/hooks/useAuth';

interface OrdersLayoutProps {
  children: React.ReactNode;
}

const fullNavigation = [
  { name: 'Commandes', href: '/orders/list', icon: ClipboardList },
  { name: 'Nouvelle commande', href: '/orders/new', icon: PlusCircle },
  { name: 'Réception', href: '/orders/reception', icon: PackageCheck },
];

const operatorNavigation = [
  { name: 'Réception', href: '/orders/reception', icon: PackageCheck },
];

export function OrdersLayout({ children }: OrdersLayoutProps) {
  const { hasRole } = useAuth();

  const isOperatorOnly =
    hasRole('operator') &&
    !hasRole('admin') &&
    !hasRole('quality_assistant') &&
    !hasRole('bureau_methodes') &&
    !hasRole('auditor');

  const navigation = isOperatorOnly ? operatorNavigation : fullNavigation;

  return (
    <ModuleLayout
      moduleName="Commandes"
      moduleColor="text-primary"
      navigation={navigation}
    >
      {children}
    </ModuleLayout>
  );
}
