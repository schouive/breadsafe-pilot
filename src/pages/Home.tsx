import { useNavigate } from 'react-router-dom';
import { 
  Shield,
  Tag,
  Cog,
  ShoppingCart,
  Clock,
  Printer,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';
import logo from '@/assets/logo-breadshop.png';
import { useAuth } from '@/hooks/useAuth';
import { getRoleLabel } from '@/types/roles';
import { cn } from '@/lib/utils';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  href: string;
}

function ModuleCard({ title, description, icon: Icon, colorClass, href }: ModuleCardProps) {
  const navigate = useNavigate();
  
  return (
    <Button
      variant="outline"
      onClick={() => navigate(href)}
      className={cn(
        "group h-auto min-h-40 whitespace-normal flex-col items-start justify-between gap-5 p-5 text-left",
        "rounded-lg border bg-card shadow-card transition-all duration-200",
        "hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card hover:shadow-elevated active:translate-y-0",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
      )}
    >
      <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", colorClass)}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="w-full">
        <span className="font-heading block text-lg font-semibold leading-tight text-foreground">{title}</span>
        <span className="mt-1.5 line-clamp-2 block text-xs font-normal leading-5 text-muted-foreground">{description}</span>
      </div>
    </Button>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { profile, roles, signOut, canAccessModule, hasRole } = useAuth();

  // Vérifier si c'est un opérateur uniquement
  const isOperatorOnly = hasRole('operator') && 
    !hasRole('admin') && 
    !hasRole('quality_assistant') && 
    !hasRole('bureau_methodes') && 
    !hasRole('auditor');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filtrer les modules selon les permissions
  const allModules: ModuleCardProps[] = [
    {
      title: 'HACCP',
      description: 'Contrôles qualité, températures, non-conformités et traçabilité des points critiques',
      icon: Shield,
      colorClass: 'bg-primary/10 text-primary',
      href: '/haccp',
    },
    {
      title: 'Commandes',
      description: 'Création, suivi et gestion des commandes fournisseurs',
      icon: ShoppingCart,
      colorClass: 'bg-success/10 text-success',
      href: '/orders',
    },
    {
      title: 'Recettes & Étiquetage',
      description: 'Gestion des recettes, calcul nutritionnel et fiches techniques',
      icon: Tag,
      colorClass: 'bg-gold/15 text-gold-foreground',
      href: '/products',
    },
    {
      title: 'Pointage',
      description: 'Suivi des heures, badgeuse RFID et gestion du temps',
      icon: Clock,
      colorClass: 'bg-secondary text-secondary-foreground',
      href: '/time-tracking',
    },
    {
      title: 'Impression',
      description: 'Impression étiquettes Zebra production',
      icon: Printer,
      colorClass: 'bg-destructive/10 text-destructive',
      href: '/print',
    },
    {
      title: 'Journal de Production',
      description: 'Planning, suivi et traçabilité des productions',
      icon: ClipboardList,
      colorClass: 'bg-accent text-accent-foreground',
      href: '/production',
    },
    {
      title: 'Paramètres',
      description: 'Fournisseurs, matières premières et chambres froides',
      icon: Cog,
      colorClass: 'bg-muted text-muted-foreground',
      href: '/settings',
    },
  ];

  // Filtrer les modules accessibles
  const modules = allModules.filter((module) => {
    if (module.href === '/haccp') return canAccessModule('haccp');
    if (module.href === '/orders') return canAccessModule('orders');
    if (module.href === '/products') return canAccessModule('products') || canAccessModule('rd');
    if (module.href === '/print') return canAccessModule('labeling');
    if (module.href === '/production') return canAccessModule('production' as any) || hasRole('admin') || hasRole('bureau_methodes') || hasRole('operator');
    if (module.href === '/settings') return canAccessModule('settings');
    if (module.href === '/time-tracking') return canAccessModule('time_tracking');
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Bread Shop" className="h-11 w-auto" />
            <div className="flex flex-col">
              <span className="text-sm font-bold uppercase text-primary">Bread Shop</span>
              <span className="text-[11px] text-muted-foreground">Qualité & Sécurité</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium">
                  {profile?.full_name?.split(' ')[0] || 'Utilisateur'}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span>{profile?.full_name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {roles[0] ? getRoleLabel(roles[0]) : 'Utilisateur'}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        {/* Welcome Section */}
        <div className="brand-rule mb-8 pl-5 md:mb-10">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Tableau de bord</p>
          <h1 className="font-heading text-3xl font-semibold text-foreground md:text-4xl">
            Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Sélectionnez un module pour commencer
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
          {modules.map((module) => (
            <ModuleCard key={module.href} {...module} />
          ))}
        </div>
      </main>
    </div>
  );
}
