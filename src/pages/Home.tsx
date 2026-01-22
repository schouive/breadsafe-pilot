import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight,
  Shield,
  Tag,
  Cog,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Activity
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
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
import { useOpenNonConformities } from '@/hooks/useNonConformities';
import { useRecentControlRecords } from '@/hooks/useControlRecords';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Primary module card (HACCP)
function PrimaryModuleCard() {
  const navigate = useNavigate();
  const { data: openNCs } = useOpenNonConformities();
  const { data: recentControls } = useRecentControlRecords();
  
  const ncCount = openNCs?.length || 0;
  const lastControl = recentControls?.[0];
  const todayControls = recentControls?.filter(c => {
    const today = new Date();
    const controlDate = new Date(c.timestamp);
    return controlDate.toDateString() === today.toDateString();
  }).length || 0;

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
      onClick={() => navigate('/haccp')}
    >
      <CardContent className="p-6 md:p-8">
        <div className="flex items-start gap-5">
          <div className="p-4 rounded-2xl bg-primary/15 transition-transform duration-300 group-hover:scale-110 shadow-md">
            <Shield className="h-10 w-10 md:h-12 md:w-12 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground group-hover:text-primary transition-colors">
                HACCP
              </h2>
              {ncCount > 0 && (
                <Badge variant="destructive" className="text-xs font-semibold px-2 py-0.5">
                  {ncCount} NC
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm md:text-base mb-4">
              Pilotage des points critiques, traçabilité des contrôles et gestion des non-conformités
            </p>
            
            {/* Quick indicators */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" />
                <span>{todayControls} contrôle{todayControls !== 1 ? 's' : ''} aujourd'hui</span>
              </div>
              {lastControl && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Dernier : {formatDistanceToNow(new Date(lastControl.timestamp), { addSuffix: true, locale: fr })}</span>
                </div>
              )}
              {ncCount > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{ncCount} non-conformité{ncCount !== 1 ? 's' : ''} en cours</span>
                </div>
              )}
              {ncCount === 0 && (
                <div className="flex items-center gap-2 text-conforme">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Aucune NC ouverte</span>
                </div>
              )}
            </div>
          </div>
          <ChevronRight className="h-7 w-7 text-primary/50 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// Secondary module card (Recipes & Labels)
function SecondaryModuleCard() {
  const navigate = useNavigate();

  return (
    <Card 
      className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 border hover:border-primary/20"
      onClick={() => navigate('/products')}
    >
      <CardContent className="p-5 md:p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-accent transition-transform duration-300 group-hover:scale-105">
            <Tag className="h-7 w-7 md:h-8 md:w-8 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg md:text-xl font-semibold text-foreground group-hover:text-primary transition-colors mb-1">
              Recettes & Étiquetage
            </h2>
            <p className="text-muted-foreground text-sm">
              Formulations, valeurs nutritionnelles et fiches techniques produits
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

// Settings link (discrete)
function SettingsLink() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/settings')}
      className="group flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all w-full"
    >
      <Cog className="h-5 w-5 group-hover:rotate-45 transition-transform duration-300" />
      <span className="text-sm font-medium">Paramètres</span>
      <span className="text-xs text-muted-foreground/70 ml-auto">Fournisseurs, matières premières, chambres froides</span>
      <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
    </button>
  );
}

export default function Home() {
  const { profile, roles, signOut } = useAuth();
  const { data: recentControls } = useRecentControlRecords();

  const getRoleLabel = () => {
    if (roles.includes('admin')) return 'Administrateur';
    if (roles.includes('quality_assistant')) return 'Assistant Qualité';
    return 'Opérateur';
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Calculate global status
  const getGlobalStatus = () => {
    if (!recentControls || recentControls.length === 0) {
      return { status: 'neutral', label: 'Aucune donnée récente' };
    }
    
    const hasNonConforme = recentControls.some(c => c.status === 'nonconforme');
    const hasAcceptable = recentControls.some(c => c.status === 'acceptable');
    
    if (hasNonConforme) {
      return { status: 'warning', label: 'Attention requise' };
    }
    if (hasAcceptable) {
      return { status: 'acceptable', label: 'Situation sous contrôle' };
    }
    return { status: 'good', label: 'Tous les contrôles conformes' };
  };

  const globalStatus = getGlobalStatus();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
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
                    {getRoleLabel()}
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
      <main className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {/* Welcome Section */}
        <div className="mb-8 md:mb-10">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            Bonjour, {profile?.full_name?.split(' ')[0] || 'Utilisateur'}
          </h1>
          <p className="text-muted-foreground">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          
          {/* Global status indicator */}
          <div className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
            globalStatus.status === 'good' 
              ? 'bg-conforme-light text-[hsl(142,71%,25%)]' 
              : globalStatus.status === 'acceptable'
              ? 'bg-acceptable-light text-[hsl(38,92%,25%)]'
              : globalStatus.status === 'warning'
              ? 'bg-nonconforme-light text-[hsl(0,84%,35%)]'
              : 'bg-muted text-muted-foreground'
          }`}>
            {globalStatus.status === 'good' && <CheckCircle2 className="h-4 w-4" />}
            {globalStatus.status === 'acceptable' && <Activity className="h-4 w-4" />}
            {globalStatus.status === 'warning' && <AlertTriangle className="h-4 w-4" />}
            {globalStatus.status === 'neutral' && <Clock className="h-4 w-4" />}
            {globalStatus.label}
          </div>
        </div>

        {/* Module Cards */}
        <div className="space-y-4 md:space-y-5">
          {/* Primary Module - HACCP */}
          <PrimaryModuleCard />
          
          {/* Secondary Module - Recipes & Labels */}
          <SecondaryModuleCard />
        </div>

        {/* Settings Link - Discrete */}
        <div className="mt-8 pt-6 border-t border-border">
          <SettingsLink />
        </div>
      </main>
    </div>
  );
}
