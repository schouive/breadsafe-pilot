import { useNavigate } from 'react-router-dom';
import { 
  Shield,
  Tag,
  Cog,
  ShoppingCart,
  Clock,
  Printer
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
    <button
      onClick={() => navigate(href)}
      className={cn(
        "aspect-square flex flex-col items-center justify-center gap-3 p-4",
        "rounded-2xl border-2 transition-all duration-200",
        "hover:scale-105 hover:shadow-lg active:scale-95",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        colorClass
      )}
    >
      <div className="p-3 rounded-xl bg-background/50">
        <Icon className="h-8 w-8" />
      </div>
      <span className="text-sm font-semibold text-center leading-tight">
        {title}
      </span>
    </button>
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
      colorClass: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-500/20',
      href: '/haccp',
    },
    {
      title: 'Commandes',
      description: 'Création, suivi et gestion des commandes fournisseurs',
      icon: ShoppingCart,
      colorClass: 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20',
      href: '/orders',
    },
    {
      title: 'Recettes & Étiquetage',
      description: 'Gestion des recettes, calcul nutritionnel et fiches techniques',
      icon: Tag,
      colorClass: 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20',
      href: '/products',
    },
    {
      title: 'Pointage',
      description: 'Suivi des heures, badgeuse RFID et gestion du temps',
      icon: Clock,
      colorClass: 'bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border-indigo-500/20',
      href: '/time-tracking',
    },
    {
      title: 'Impression',
      description: 'Impression étiquettes Zebra production',
      icon: Printer,
      colorClass: 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border-rose-500/20',
      href: '/print',
    },
    {
      title: 'Paramètres',
      description: 'Fournisseurs, matières premières et chambres froides',
      icon: Cog,
      colorClass: 'bg-slate-500/10 text-slate-600 hover:bg-slate-500/20 border-slate-500/20',
      href: '/settings',
    },
  ];

  // Filtrer les modules accessibles
  const modules = allModules.filter((module) => {
    if (module.href === '/haccp') return canAccessModule('haccp');
    if (module.href === '/orders') return canAccessModule('orders');
    if (module.href === '/products') return canAccessModule('products');
    if (module.href === '/products/print') return canAccessModule('products');
    if (module.href === '/settings') return canAccessModule('settings');
    if (module.href === '/time-tracking') return true;
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Breadshop" className="h-10 w-auto" />
            <div className="flex flex-col">
              <span className="font-bold text-primary text-lg leading-tight">BreadSafe</span>
              <span className="text-xs text-muted-foreground">Qualité & Sécurité</span>
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
      <main className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Welcome Section */}
        <div className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'} 👋
          </h1>
          <p className="text-muted-foreground text-lg">
            Sélectionnez un module pour commencer
          </p>
        </div>

        {/* Module Cards */}
        <div className="grid grid-cols-2 gap-4">
          {modules.map((module) => (
            <ModuleCard key={module.href} {...module} />
          ))}
        </div>
      </main>
    </div>
  );
}
