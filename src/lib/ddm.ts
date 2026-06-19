/**
 * Calcule automatiquement la DDM à partir de la date de fabrication
 * et des conditions de conservation déclarées sur la fiche technique.
 * - Congelé (storage_instructions contient "-18", "-12" ou "congel") : +6 mois
 * - Sinon (frais / ambiant)                                          : +21 jours
 * Retourne une chaîne ISO yyyy-mm-dd (compatible <input type="date">).
 */
export function isFrozen(storageInstructions: string | null | undefined): boolean {
  if (!storageInstructions) return false;
  const n = storageInstructions.toLowerCase();
  return n.includes('-18') || n.includes('-12') || n.includes('congel');
}

export function computeDdm(
  productionIso: string,
  storageInstructions: string | null | undefined,
): string {
  if (!productionIso) return '';
  const m = productionIso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  const base = new Date(Date.UTC(y, mo - 1, d));
  if (isFrozen(storageInstructions)) {
    base.setUTCMonth(base.getUTCMonth() + 6);
  } else {
    base.setUTCDate(base.getUTCDate() + 21);
  }
  return base.toISOString().slice(0, 10);
}
