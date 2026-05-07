import { useNavigate } from 'react-router-dom';
import { Shield, Database, Download, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function SecuritySettings() {
  const navigate = useNavigate();
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Données & Sécurité</h1>
        <p className="text-muted-foreground mt-1">Conservation, sauvegarde et export</p>
      </div>

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
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">Conforme</Badge>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-medium">Sauvegarde automatique</p>
              <p className="text-sm text-muted-foreground">Dernière sauvegarde: Aujourd'hui à 06:00</p>
            </div>
            <Button variant="outline" size="sm">Configurer</Button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors"
               onClick={() => navigate('/settings/export')}>
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Export des données</p>
                <p className="text-sm text-muted-foreground">Réversibilité (CSV, Excel, JSON)</p>
              </div>
            </div>
            <Button variant="outline" size="sm"><ArrowRight className="h-4 w-4" /></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
