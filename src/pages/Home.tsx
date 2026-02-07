import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight,
  Shield,
  Tag,
  Cog,
  ShoppingCart
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  href: string;
}

function ModuleCard({ title, description, icon: Icon, color, bgColor, href }: ModuleCardProps) {
  const navigate = useNavigate();
  
  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 hover:border-primary/20"
      onClick={() => navigate(href)}
    >
      <CardContent className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          <div className={`p-4 rounded-2xl ${bgColor} transition-transform duration-300 group-hover:scale-110`}>
            <Icon className={`h-8 w-8 md:h-10 md:w-10 ${color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
              {title}
            </h2>
            <p className="text-muted-foreground text-sm md:text-base">
              {description}
            </p>
          </div>
          <ChevronRight className="h-6 w-6 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </CardContent>
    </Card>
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
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/haccp',
    },
    {
      title: 'Commandes',
      description: 'Commandes fournisseurs et réception des marchandises',
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/orders',
    },
    {
      title: 'Recettes & Étiquetage',
      description: 'Gestion des recettes, calcul nutritionnel et fiches techniques produits',
      icon: Tag,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/products',
    },
    {
      title: 'Paramètres',
      description: 'Configuration des fournisseurs, matières premières et chambres froides',
      icon: Cog,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      href: '/settings',
    },
  ];

  // Filtrer les modules accessibles
  const modules = allModules.filter((module) => {
    if (module.href === '/haccp') return canAccessModule('haccp');
    if (module.href === '/orders') return canAccessModule('orders');
    if (module.href === '/products') return canAccessModule('products');
    if (module.href === '/settings') return canAccessModule('settings');
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
        <div className="grid gap-4 md:gap-6">
          {modules.map((module) => (
            <ModuleCard key={module.href} {...module} />
          ))}
        </div>
      </main>
    </div>
  );
}
