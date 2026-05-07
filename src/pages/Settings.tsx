import { useNavigate } from 'react-router-dom';
import { Bell, Building, Snowflake, Magnet, Building2, Wheat, Package, Printer, Users, ScrollText, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';

interface SectionLink {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  visible?: boolean;
}

export default function Settings() {
  const navigate = useNavigate();
  const { canPerform } = useAuth();

  const sections: SectionLink[] = [
    { title: 'Chambres froides', description: 'Équipements de stockage réfrigéré', icon: Snowflake, href: '/settings/cold-rooms' },
    { title: 'Détecteur métaux', description: 'Configuration et seuils CCP', icon: Magnet, href: '/settings/metal-detector' },
    { title: 'Fournisseurs', description: 'Référentiel fournisseurs', icon: Building2, href: '/settings/suppliers' },
    { title: 'Matières premières', description: 'Ingrédients alimentaires', icon: Wheat, href: '/settings/raw-materials' },
    { title: 'Produits non-alimentaires', description: 'Consommables, emballages', icon: Package, href: '/settings/non-food' },
    { title: 'Catalogue d\'impression', description: 'Articles ERP & templates Zebra', icon: Printer, href: '/settings/catalog/erp-articles' },
    { title: 'Utilisateurs', description: 'Comptes et rôles', icon: Users, href: '/settings/users', visible: canPerform('canManageUsers') },
    { title: 'Journal d\'audit', description: 'Trace des actions sensibles', icon: ScrollText, href: '/settings/audit', visible: canPerform('canViewAuditLogs') },
    { title: 'Données & sécurité', description: 'Conservation et export', icon: Shield, href: '/settings/security' },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de l'application</p>
      </div>

      {/* Quick navigation grid */}
      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>Accès rapide à la configuration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-3">
            {sections.filter((s) => s.visible !== false).map((s) => (
              <button
                key={s.href}
                onClick={() => navigate(s.href)}
                className="flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <s.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Company info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Informations entreprise</CardTitle>
              <CardDescription>Détails de votre établissement</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="company">Raison sociale</Label><Input id="company" defaultValue="Breadshop SAS" /></div>
            <div className="space-y-2"><Label htmlFor="siret">SIRET</Label><Input id="siret" defaultValue="123 456 789 00012" /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="address">Adresse</Label><Input id="address" defaultValue="Zone Industrielle, 75000 Paris" /></div>
          <div className="space-y-2">
            <Label htmlFor="certification">Certification visée</Label>
            <div className="flex items-center gap-2">
              <Input id="certification" defaultValue="IFS Food v8" className="flex-1" />
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">En préparation</Badge>
            </div>
          </div>
          <Button>Enregistrer</Button>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Alertes et rappels</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Rappels de contrôles</p><p className="text-sm text-muted-foreground">Notifications push pour les contrôles planifiés</p></div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Alertes température</p><p className="text-sm text-muted-foreground">Notification immédiate en cas de non-conformité</p></div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Alertes DLC</p><p className="text-sm text-muted-foreground">Rappel 48h avant péremption</p></div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div><p className="font-medium">Résumé quotidien</p><p className="text-sm text-muted-foreground">Email récapitulatif chaque soir à 18h</p></div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
