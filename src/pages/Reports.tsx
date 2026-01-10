import { useState } from 'react';
import { Download, Calendar, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend 
} from 'recharts';

const weeklyData = [
  { name: 'Lun', conforme: 12, acceptable: 2, nonconforme: 1 },
  { name: 'Mar', conforme: 15, acceptable: 1, nonconforme: 0 },
  { name: 'Mer', conforme: 10, acceptable: 3, nonconforme: 2 },
  { name: 'Jeu', conforme: 14, acceptable: 2, nonconforme: 0 },
  { name: 'Ven', conforme: 16, acceptable: 1, nonconforme: 1 },
  { name: 'Sam', conforme: 8, acceptable: 0, nonconforme: 0 },
  { name: 'Dim', conforme: 4, acceptable: 0, nonconforme: 0 },
];

const monthlyTrend = [
  { name: 'Sem 1', taux: 92 },
  { name: 'Sem 2', taux: 88 },
  { name: 'Sem 3', taux: 95 },
  { name: 'Sem 4', taux: 91 },
];

const cpStats = [
  { name: 'CP1 - Temp. Réfrigéré', total: 45, conforme: 42, rate: 93 },
  { name: 'CP2 - Intégrité', total: 45, conforme: 44, rate: 98 },
  { name: 'CP3 - DLC', total: 45, conforme: 43, rate: 96 },
  { name: 'CP4 - Allergènes', total: 20, conforme: 18, rate: 90 },
  { name: 'CP5 - Corps Étrangers', total: 200, conforme: 198, rate: 99 },
  { name: 'CP6 - Stock. Positif', total: 30, conforme: 28, rate: 93 },
  { name: 'CP7 - Stock. Négatif', total: 30, conforme: 29, rate: 97 },
  { name: 'CP8 - DLC Périmée', total: 30, conforme: 30, rate: 100 },
];

export default function Reports() {
  const [period, setPeriod] = useState('week');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rapports & Statistiques</h1>
          <p className="text-muted-foreground mt-1">
            Analyse de la performance HACCP
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Cette semaine</SelectItem>
              <SelectItem value="month">Ce mois</SelectItem>
              <SelectItem value="quarter">Ce trimestre</SelectItem>
              <SelectItem value="year">Cette année</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Taux de conformité global</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-success">94.2%</span>
              <div className="flex items-center text-success text-sm mb-1">
                <TrendingUp className="h-4 w-4 mr-1" />
                +2.1%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Contrôles réalisés</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">445</span>
              <span className="text-sm text-muted-foreground mb-1">/ 460 prévus</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Non-conformités</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-destructive">12</span>
              <div className="flex items-center text-destructive text-sm mb-1">
                <TrendingDown className="h-4 w-4 mr-1" />
                -3
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Délai moyen résolution NC</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold">4.2h</span>
              <span className="text-sm text-success mb-1">Objectif: 8h</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Weekly controls chart */}
        <Card>
          <CardHeader>
            <CardTitle>Contrôles par jour</CardTitle>
            <CardDescription>Répartition des résultats cette semaine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="conforme" name="Conforme" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="acceptable" name="Acceptable" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="nonconforme" name="Non-conforme" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conformity trend */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution du taux de conformité</CardTitle>
            <CardDescription>Tendance sur les 4 dernières semaines</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                  <YAxis domain={[80, 100]} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    formatter={(value) => [`${value}%`, 'Taux']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="taux" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CP Stats table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance par Point de Contrôle</CardTitle>
          <CardDescription>Statistiques détaillées pour la période sélectionnée</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Point de Contrôle</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Total</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Conformes</th>
                  <th className="text-center py-3 px-4 font-medium text-muted-foreground">Taux</th>
                </tr>
              </thead>
              <tbody>
                {cpStats.map((cp, index) => (
                  <tr key={index} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 font-medium">{cp.name}</td>
                    <td className="py-3 px-4 text-center">{cp.total}</td>
                    <td className="py-3 px-4 text-center text-success">{cp.conforme}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={cp.rate >= 95 ? 'text-success' : cp.rate >= 90 ? 'text-warning' : 'text-destructive'}>
                        {cp.rate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Export options */}
      <Card>
        <CardHeader>
          <CardTitle>Exports pour audit IFS</CardTitle>
          <CardDescription>Générez les documents nécessaires pour vos audits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="h-auto py-4 justify-start">
              <FileText className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <p className="font-medium">Rapport mensuel complet</p>
                <p className="text-xs text-muted-foreground">PDF avec tous les contrôles</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start">
              <FileText className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <p className="font-medium">Historique NC</p>
                <p className="text-xs text-muted-foreground">Excel avec actions correctives</p>
              </div>
            </Button>
            <Button variant="outline" className="h-auto py-4 justify-start">
              <FileText className="h-5 w-5 mr-3 text-primary" />
              <div className="text-left">
                <p className="font-medium">Traçabilité matières</p>
                <p className="text-xs text-muted-foreground">Lots et fournisseurs</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
