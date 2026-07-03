// Calculs et alertes pour le Journal de Production

export interface JournalTimes {
  kneading_start?: string | null;
  kneading_end?: string | null;
  dough_temperature?: number | null;
  shaping_start?: string | null;
  line_start?: string | null;
  proofing_start?: string | null;
  proofing_end?: string | null;
  oven_in?: string | null;
  oven_out?: string | null;
  production_end?: string | null;
}

export const DOUGH_TEMP_MIN = 22;
export const DOUGH_TEMP_MAX = 26;

function diffMinutes(a?: string | null, b?: string | null): number | null {
  if (!a || !b) return null;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  return d >= 0 ? Math.round(d) : null;
}

export function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function computeMetrics(j: JournalTimes) {
  return {
    kneading: diffMinutes(j.kneading_start, j.kneading_end),
    kneadingToLine: diffMinutes(j.kneading_end, j.line_start),
    proofing: diffMinutes(j.proofing_start, j.proofing_end),
    baking: diffMinutes(j.oven_in, j.oven_out),
    total: diffMinutes(j.kneading_start, j.production_end),
  };
}

export interface AlertItem {
  code: string;
  message: string;
}

export function computeAlerts(
  j: JournalTimes,
  opts: { scheduledTime?: string | null; status?: string; targetProofingMinutes?: number | null } = {}
): AlertItem[] {
  const alerts: AlertItem[] = [];
  if (j.dough_temperature != null) {
    if (j.dough_temperature < DOUGH_TEMP_MIN) {
      alerts.push({
        code: 'dough_cold',
        message: `Température de pâte trop basse (${j.dough_temperature}°C < ${DOUGH_TEMP_MIN}°C)`,
      });
    } else if (j.dough_temperature > DOUGH_TEMP_MAX) {
      alerts.push({
        code: 'dough_hot',
        message: `Température de pâte trop haute (${j.dough_temperature}°C > ${DOUGH_TEMP_MAX}°C)`,
      });
    }
  }
  const metrics = computeMetrics(j);
  if (opts.targetProofingMinutes && metrics.proofing && metrics.proofing > opts.targetProofingMinutes) {
    alerts.push({
      code: 'proofing_over',
      message: `Temps de pousse dépassé (${formatDuration(metrics.proofing)} > cible ${formatDuration(opts.targetProofingMinutes)})`,
    });
  }
  if (
    opts.scheduledTime &&
    opts.status === 'pending' &&
    new Date(opts.scheduledTime).getTime() < Date.now()
  ) {
    alerts.push({
      code: 'not_launched',
      message: `Production non lancée à l'heure prévue`,
    });
  }
  return alerts;
}
