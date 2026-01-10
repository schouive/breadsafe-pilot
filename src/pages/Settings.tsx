import { User, Bell, Shield, Database, Users, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function Settings() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">
          Configuration de l'application HACCP
        </p>
      </div>

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
            <div className="space-y-2">
              <Label htmlFor="company">Raison sociale</Label>
              <Input id="company" defaultValue="Breadshop SAS" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siret">SIRET</Label>
              <Input id="siret" defaultValue="123 456 789 00012" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Adresse</Label>
            <Input id="address" defaultValue="Zone Industrielle, 75000 Paris" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="certification">Certification visée</Label>
            <div className="flex items-center gap-2">
              <Input id="certification" defaultValue="IFS Food v8" className="flex-1" />
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                En préparation
              </Badge>
            </div>
          </div>
          <Button>Enregistrer</Button>
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Utilisateurs</CardTitle>
                <CardDescription>Gérez les accès à l'application</CardDescription>
              </div>
            </div>
            <Button size="sm">Ajouter</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { name: 'Direction Générale', email: 'dg@breadshop.fr', role: 'admin', status: 'active' },
              { name: 'Assistant Qualité', email: 'qualite@breadshop.fr', role: 'quality_assistant', status: 'active' },
              { name: 'Marie Dupont', email: 'marie.d@breadshop.fr', role: 'operator', status: 'active' },
              { name: 'Jean Pierre', email: 'jean.p@breadshop.fr', role: 'operator', status: 'active' },
            ].map((user, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {user.role === 'admin' ? 'Administrateur' : 
                     user.role === 'quality_assistant' ? 'Assistant Qualité' : 'Opérateur'}
                  </Badge>
                  <Button variant="ghost" size="sm">Modifier</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configurez les alertes et rappels</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Rappels de contrôles</p>
              <p className="text-sm text-muted-foreground">Notifications push pour les contrôles planifiés</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alertes température</p>
              <p className="text-sm text-muted-foreground">Notification immédiate en cas de non-conformité</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Alertes DLC</p>
              <p className="text-sm text-muted-foreground">Rappel 48h avant péremption des stocks</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Résumé quotidien</p>
              <p className="text-sm text-muted-foreground">Email récapitulatif chaque soir à 18h</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Data & Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>Données & Sécurité</CardTitle>
              <CardDescription>Gestion des données et conformité</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Durée de conservation</p>
                <p className="text-sm text-muted-foreground">Les enregistrements sont conservés 5 ans (IFS)</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">
              Conforme
            </Badge>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Sauvegarde automatique</p>
              <p className="text-sm text-muted-foreground">Dernière sauvegarde: Aujourd'hui à 06:00</p>
            </div>
            <Button variant="outline" size="sm">Configurer</Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Export des données</p>
              <p className="text-sm text-muted-foreground">Téléchargez toutes vos données HACCP</p>
            </div>
            <Button variant="outline" size="sm">Exporter</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
