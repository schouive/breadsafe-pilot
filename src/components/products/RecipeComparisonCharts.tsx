import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RecipeComparisonData } from '@/hooks/useRecipeComparison';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface RecipeComparisonChartsProps {
  data: RecipeComparisonData[];
  isLoading: boolean;
}

// Color palette for charts
const COLORS = [
  'hsl(var(--primary))',
  'hsl(210, 90%, 55%)',
  'hsl(160, 80%, 45%)',
  'hsl(280, 70%, 55%)',
  'hsl(30, 90%, 55%)',
  'hsl(340, 75%, 55%)',
];

export function RecipeComparisonCharts({ data, isLoading }: RecipeComparisonChartsProps) {
  // Prepare data for bar charts
  const barChartData = useMemo(() => {
    return data.map((recipe, index) => ({
      name: recipe.recipeName.length > 15 
        ? recipe.recipeName.substring(0, 15) + '...' 
        : recipe.recipeName,
      fullName: recipe.recipeName,
      hydratation: parseFloat(recipe.totalHydration.toFixed(1)),
      sel: parseFloat(recipe.saltPercentage.toFixed(2)),
      additifs: parseFloat(recipe.additiveLoad.toFixed(2)),
      coutKg: parseFloat(recipe.costPerKg.toFixed(2)),
      poidsPate: parseFloat(recipe.totalBakerPercentage.toFixed(1)),
      fill: COLORS[index % COLORS.length],
    }));
  }, [data]);

  // Prepare data for radar chart (normalized values for comparison)
  const radarChartData = useMemo(() => {
    if (data.length === 0) return [];
    
    // Get max values for normalization
    const maxHydration = Math.max(...data.map(d => d.totalHydration), 1);
    const maxSalt = Math.max(...data.map(d => d.saltPercentage), 1);
    const maxAdditive = Math.max(...data.map(d => d.additiveLoad), 1);
    const maxCost = Math.max(...data.map(d => d.costPerKg), 1);
    const maxWeight = Math.max(...data.map(d => d.totalBakerPercentage), 1);
    
    return [
      { axis: 'Hydratation', fullMark: 100, ...Object.fromEntries(
        data.map((d, i) => [`recipe${i}`, (d.totalHydration / maxHydration) * 100])
      )},
      { axis: 'Sel', fullMark: 100, ...Object.fromEntries(
        data.map((d, i) => [`recipe${i}`, (d.saltPercentage / maxSalt) * 100])
      )},
      { axis: 'Additifs', fullMark: 100, ...Object.fromEntries(
        data.map((d, i) => [`recipe${i}`, (d.additiveLoad / maxAdditive) * 100])
      )},
      { axis: 'Coût/kg', fullMark: 100, ...Object.fromEntries(
        data.map((d, i) => [`recipe${i}`, (d.costPerKg / maxCost) * 100])
      )},
      { axis: 'Poids pâte', fullMark: 100, ...Object.fromEntries(
        data.map((d, i) => [`recipe${i}`, (d.totalBakerPercentage / maxWeight) * 100])
      )},
    ];
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.length < 2) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hydration Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Hydratation</CardTitle>
          <CardDescription>% d'eau par rapport à la farine</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" unit="%" className="text-xs" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value}%`, 'Hydratation']}
                labelFormatter={(label) => barChartData.find(d => d.name === label)?.fullName || label}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="hydratation" radius={[0, 4, 4, 0]}>
                {barChartData.map((entry, index) => (
                  <rect key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Coût matière</CardTitle>
          <CardDescription>€ par kg de pâte</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" unit=" €" className="text-xs" />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100}
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)} €/kg`, 'Coût']}
                labelFormatter={(label) => barChartData.find(d => d.name === label)?.fullName || label}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="coutKg" radius={[0, 4, 4, 0]}>
                {barChartData.map((entry, index) => (
                  <rect key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Salt & Additives */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Sel & Additifs</CardTitle>
          <CardDescription>% par rapport à la farine</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                className="text-xs"
                tick={{ fontSize: 10 }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis unit="%" className="text-xs" />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${value}%`, 
                  name === 'sel' ? 'Sel' : 'Additifs'
                ]}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="sel" name="Sel" fill="hsl(30, 90%, 55%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="additifs" name="Additifs" fill="hsl(280, 70%, 55%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Radar Comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Vue d'ensemble</CardTitle>
          <CardDescription>Comparaison multi-axes normalisée</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarChartData}>
              <PolarGrid className="stroke-muted" />
              <PolarAngleAxis 
                dataKey="axis" 
                className="text-xs"
                tick={{ fontSize: 11 }}
              />
              <PolarRadiusAxis 
                angle={30} 
                domain={[0, 100]} 
                className="text-xs"
                tick={{ fontSize: 9 }}
              />
              {data.map((recipe, index) => (
                <Radar
                  key={recipe.recipeId}
                  name={recipe.recipeName}
                  dataKey={`recipe${index}`}
                  stroke={COLORS[index % COLORS.length]}
                  fill={COLORS[index % COLORS.length]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ))}
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
