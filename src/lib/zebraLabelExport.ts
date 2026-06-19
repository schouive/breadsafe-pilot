/**
 * Helpers texte partagés pour la génération ZPL (impression Zebra).
 * Le module historique d'export CSV "Étiquettes carton" a été supprimé ;
 * seuls ces utilitaires de formatage restent nécessaires pour l'impression
 * des étiquettes produit depuis le module Impression.
 */

/**
 * Supprime les accents (NFD) et caractères non-ASCII pour compatibilité Zebra.
 */
export function removeAccents(input: string): string {
  return (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

/**
 * Découpe un texte en lignes d'une longueur maximale, en cassant aux espaces.
 */
export function splitIntoLines(text: string, maxLength: number, maxLines: number): string[] {
  const clean = (text || '').trim().replace(/\s+/g, ' ');
  const lines: string[] = [];
  let remaining = clean;
  while (remaining.length > 0 && lines.length < maxLines) {
    if (remaining.length <= maxLength) {
      lines.push(remaining);
      break;
    }
    let cut = remaining.lastIndexOf(' ', maxLength);
    if (cut < Math.floor(maxLength * 0.5)) cut = maxLength;
    lines.push(remaining.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }
  return lines;
}
