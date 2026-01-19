import { useMemo } from 'react';

export type NutriScoreGrade = 'A' | 'B' | 'C' | 'D' | 'E';

export interface NutriScoreResult {
  grade: NutriScoreGrade;
  score: number;
  negativePoints: number;
  positivePoints: number;
  details: {
    energyPoints: number;
    sugarsPoints: number;
    saturatedFatPoints: number;
    saltPoints: number;
    fiberPoints: number;
    proteinPoints: number;
  };
}

interface NutritionInput {
  energyKj: number;
  sugars: number;
  saturatedFat: number;
  salt: number;
  fiber: number;
  protein: number;
}

/**
 * Calculate Nutri-Score based on nutritional values per 100g
 * Using the 2023 algorithm for solid foods
 */
function calculateNutriScore(nutrition: NutritionInput): NutriScoreResult {
  // Energy points (kJ/100g)
  const energyThresholds = [335, 670, 1005, 1340, 1675, 2010, 2345, 2680, 3015, 3350];
  const energyPoints = energyThresholds.filter(t => nutrition.energyKj > t).length;

  // Sugars points (g/100g)
  const sugarsThresholds = [4.5, 9, 13.5, 18, 22.5, 27, 31, 36, 40, 45];
  const sugarsPoints = sugarsThresholds.filter(t => nutrition.sugars > t).length;

  // Saturated fat points (g/100g)
  const satFatThresholds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const saturatedFatPoints = satFatThresholds.filter(t => nutrition.saturatedFat > t).length;

  // Salt points (g/100g) - converted from sodium thresholds
  const saltThresholds = [0.225, 0.45, 0.675, 0.9, 1.125, 1.35, 1.575, 1.8, 2.025, 2.25];
  const saltPoints = saltThresholds.filter(t => nutrition.salt > t).length;

  // Fiber points (g/100g)
  const fiberThresholds = [0.9, 1.9, 2.8, 3.7, 4.7];
  const fiberPoints = fiberThresholds.filter(t => nutrition.fiber > t).length;

  // Protein points (g/100g)
  const proteinThresholds = [1.6, 3.2, 4.8, 6.4, 8.0];
  const proteinPoints = proteinThresholds.filter(t => nutrition.protein > t).length;

  // Calculate total points
  const negativePoints = energyPoints + sugarsPoints + saturatedFatPoints + saltPoints;
  
  // Protein points are only counted if negative points < 11 or if fiber >= 5
  let positivePoints = fiberPoints;
  if (negativePoints < 11 || nutrition.fiber >= 5) {
    positivePoints += proteinPoints;
  }

  const score = negativePoints - positivePoints;

  // Determine grade (for solid foods)
  let grade: NutriScoreGrade;
  if (score <= -1) {
    grade = 'A';
  } else if (score <= 2) {
    grade = 'B';
  } else if (score <= 10) {
    grade = 'C';
  } else if (score <= 18) {
    grade = 'D';
  } else {
    grade = 'E';
  }

  return {
    grade,
    score,
    negativePoints,
    positivePoints,
    details: {
      energyPoints,
      sugarsPoints,
      saturatedFatPoints,
      saltPoints,
      fiberPoints,
      proteinPoints,
    },
  };
}

/**
 * Hook to calculate Nutri-Score from nutritional values per 100g
 */
export function useNutriScore(nutrition: NutritionInput | null | undefined): NutriScoreResult | null {
  return useMemo(() => {
    if (!nutrition) return null;
    
    // Check if we have valid nutritional data
    const hasData = nutrition.energyKj > 0 || 
                    nutrition.sugars > 0 || 
                    nutrition.saturatedFat > 0 || 
                    nutrition.salt > 0 ||
                    nutrition.fiber > 0 ||
                    nutrition.protein > 0;
    
    if (!hasData) return null;

    return calculateNutriScore(nutrition);
  }, [nutrition?.energyKj, nutrition?.sugars, nutrition?.saturatedFat, nutrition?.salt, nutrition?.fiber, nutrition?.protein]);
}

/**
 * Get the color for a Nutri-Score grade
 */
export function getNutriScoreColor(grade: NutriScoreGrade): string {
  switch (grade) {
    case 'A': return 'bg-green-600';
    case 'B': return 'bg-lime-500';
    case 'C': return 'bg-yellow-400';
    case 'D': return 'bg-orange-500';
    case 'E': return 'bg-red-600';
  }
}

/**
 * Get text color for Nutri-Score badge
 */
export function getNutriScoreTextColor(grade: NutriScoreGrade): string {
  switch (grade) {
    case 'A': return 'text-white';
    case 'B': return 'text-white';
    case 'C': return 'text-gray-900';
    case 'D': return 'text-white';
    case 'E': return 'text-white';
  }
}
