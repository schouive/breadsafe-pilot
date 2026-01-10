import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

const variantStyles = {
  default: {
    bg: 'bg-card',
    icon: 'bg-primary/10 text-primary',
    border: 'border-border',
  },
  success: {
    bg: 'bg-conforme-light',
    icon: 'bg-success/20 text-success',
    border: 'border-success/20',
  },
  warning: {
    bg: 'bg-acceptable-light',
    icon: 'bg-warning/20 text-warning',
    border: 'border-warning/20',
  },
  danger: {
    bg: 'bg-nonconforme-light',
    icon: 'bg-destructive/20 text-destructive',
    border: 'border-destructive/20',
  },
};

export function StatCard({ title, value, subtitle, icon: Icon, trend, variant = 'default' }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className={cn(
      "rounded-xl border p-5 transition-all duration-200 hover:shadow-medium",
      styles.bg,
      styles.border
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <p className={cn(
              "mt-2 text-sm font-medium",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% vs hier
            </p>
          )}
        </div>
        <div className={cn(
          "flex items-center justify-center h-12 w-12 rounded-xl",
          styles.icon
        )}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}
