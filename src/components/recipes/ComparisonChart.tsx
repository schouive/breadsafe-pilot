import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface ComparisonResult {
  recipeId: string;
  recipeName: string;
  recipeCode?: string;
  materialQuantityKg: number;
  referenceQuantityKg: number;
  ratio: number;
  percentage: number;
}

interface ComparisonChartProps {
  data: ComparisonResult[];
  displayMode: 'percentage' | 'decimal';
  materialName: string;
  referenceLabel: string;
}

const CHART_COLOR = 'hsl(var(--primary))';

export function ComparisonChart({
  data,
  displayMode,
  materialName,
  referenceLabel,
}: ComparisonChartProps) {
  const chartData = useMemo(() => {
    return data.map((result) => ({
      name: result.recipeCode || result.recipeName.substring(0, 12),
      fullName: result.recipeName,
      value: displayMode === 'percentage' ? result.percentage : result.ratio,
    }));
  }, [data, displayMode]);

  const avgValue = useMemo(() => {
    if (chartData.length === 0) return 0;
    return chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length;
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="h-[350px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
        <div className="text-center space-y-2">
          <p className="font-medium">Aucune donnée à afficher</p>
          <p className="text-sm">Sélectionnez des recettes et une matière première</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-center">
        <h3 className="font-semibold text-foreground">
          {materialName} / {referenceLabel}
        </h3>
        <p className="text-xs text-muted-foreground">
          Moyenne : {displayMode === 'percentage' ? `${avgValue.toFixed(2)}%` : avgValue.toFixed(4)}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          barCategoryGap="20%"
        >
          <defs>
            <linearGradient
              id="barGradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={CHART_COLOR} stopOpacity={1} />
              <stop offset="100%" stopColor={CHART_COLOR} stopOpacity={0.7} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="hsl(var(--border))"
            opacity={0.5}
          />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={80}
            interval={0}
            tick={{
              fontSize: 11,
              fill: 'hsl(var(--foreground))',
              fontWeight: 500,
            }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
          />
          <YAxis
            tickFormatter={(v) =>
              displayMode === 'percentage' ? `${v.toFixed(1)}%` : v.toFixed(3)
            }
            tick={{
              fontSize: 11,
              fill: 'hsl(var(--muted-foreground))',
            }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={{ stroke: 'hsl(var(--border))' }}
            width={60}
          />
          <ReferenceLine
            y={avgValue}
            stroke="hsl(var(--destructive))"
            strokeDasharray="5 5"
            strokeWidth={2}
            label={{
              value: 'Moy.',
              position: 'right',
              fill: 'hsl(var(--destructive))',
              fontSize: 10,
              fontWeight: 600,
            }}
          />
          <Tooltip
            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                const deviation = ((data.value - avgValue) / avgValue) * 100;
                return (
                  <div className="bg-popover border rounded-xl shadow-xl p-4 min-w-[180px]">
                    <p className="font-bold text-foreground mb-2">{data.fullName}</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        Valeur :{' '}
                        <span className="font-mono font-semibold text-foreground">
                          {displayMode === 'percentage'
                            ? `${data.value.toFixed(2)}%`
                            : data.value.toFixed(4)}
                        </span>
                      </p>
                      <p className="text-muted-foreground">
                        Écart :{' '}
                        <span
                          className={`font-mono font-semibold ${
                            deviation > 0 ? 'text-destructive' : 'text-primary'
                          }`}
                        >
                          {deviation > 0 ? '+' : ''}
                          {deviation.toFixed(1)}%
                        </span>
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            maxBarSize={60}
            fill="url(#barGradient)"
            stroke={CHART_COLOR}
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
