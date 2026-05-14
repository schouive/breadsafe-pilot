import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Arrondit un nombre à N chiffres significatifs
 */
export function roundToSignificantFigures(num: number, sigFigs: number = 2): number {
  if (num === 0) return 0;
  const d = Math.ceil(Math.log10(Math.abs(num)));
  const power = sigFigs - d;
  const magnitude = Math.pow(10, power);
  return Math.round(num * magnitude) / magnitude;
}

/**
 * Formate un nombre arrondi à N chiffres significatifs pour l'affichage
 * Supprime les zéros de trailing inutiles
 */
export function formatSignificantFigures(num: number | null | undefined, sigFigs: number = 2): string {
  if (num === null || num === undefined) return '';
  const rounded = roundToSignificantFigures(num, sigFigs);
  return parseFloat(rounded.toPrecision(10)).toString();
}
