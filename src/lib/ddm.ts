/**
 * Calcule automatiquement la DDM à partir de la date de fabrication
 * et de l'état température du produit ERP.
 * - FR (frais)    : +21 jours
 * - FZ (congelé)  : +6 mois
 * Retourne une chaîne ISO yyyy-mm-dd (compatible <input type="date">).
 */
export function computeDdm(
  productionIso: string,
  temperature: string | null | undefined,
): string {
  if (!productionIso) return '';
  const m = productionIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const base = new Date(Date.UTC(y, mo - 1, d));
  if (temperature === 'FZ') {
    base.setUTCMonth(base.getUTCMonth() + 6);
  } else {
    // Par défaut : produit frais → +21 jours
    base.setUTCDate(base.getUTCDate() + 21);
  }
  return base.toISOString().slice(0, 10);
}
