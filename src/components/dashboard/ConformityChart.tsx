import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface ConformityChartProps {
  conforme: number;
  acceptable: number;
  nonconforme: number;
}

export function ConformityChart({ conforme, acceptable, nonconforme }: ConformityChartProps) {
  const data = [
    { name: 'Conforme', value: conforme, color: 'hsl(142, 71%, 45%)' },
    { name: 'Acceptable', value: acceptable, color: 'hsl(38, 92%, 50%)' },
    { name: 'Non-conforme', value: nonconforme, color: 'hsl(0, 84%, 60%)' },
  ].filter(item => item.value > 0);

  const total = conforme + acceptable + nonconforme;
  const conformityRate = total > 0 ? Math.round((conforme / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="font-semibold text-foreground mb-4">Taux de conformité</h3>
        <div className="h-48 flex items-center justify-center text-muted-foreground">
          Aucune donnée disponible
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-5">
      <h3 className="font-semibold text-foreground mb-4">Taux de conformité</h3>
      <div className="h-48 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => [`${value} contrôles`, '']}
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Legend 
              verticalAlign="bottom"
              height={36}
              formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: '36px' }}>
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">{conformityRate}%</p>
            <p className="text-xs text-muted-foreground">Conformité</p>
          </div>
        </div>
      </div>
    </div>
  );
}
