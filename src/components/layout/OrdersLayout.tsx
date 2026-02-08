import {
  ClipboardList,
  PlusCircle,
} from 'lucide-react';
import { ModuleLayout } from './ModuleLayout';

interface OrdersLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Commandes', href: '/orders/list', icon: ClipboardList },
  { name: 'Nouvelle commande', href: '/orders/new', icon: PlusCircle },
];

export function OrdersLayout({ children }: OrdersLayoutProps) {
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
