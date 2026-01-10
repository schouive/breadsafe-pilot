// HACCP Types for Breadshop SAS Application

export type ControlStatus = 'conforme' | 'acceptable' | 'nonconforme' | 'pending';

export type UserRole = 'operator' | 'quality_assistant' | 'admin';

export type ControlPointType = 
  | 'CP1_TEMPERATURE_REFRIGERE'
  | 'CP2_INTEGRITE'
  | 'CP3_DLC'
  | 'CP4_ALLERGENES'
  | 'CP5_CORPS_ETRANGER'
  | 'CP6_STOCKAGE_POSITIF'
  | 'CP7_STOCKAGE_NEGATIF'
  | 'CP8_DLC_PERIMEE';

export interface ControlPoint {
  id: string;
  code: ControlPointType;
  name: string;
  description: string;
  dangerType: string;
  conformeCriteria: string;
  acceptableCriteria?: string;
  nonConformeCriteria: string;
  actionNonConforme: string;
  actionAcceptable?: string;
  responsible: string;
  frequency: string;
  supportDocument: string;
  archiveDuration: string;
}

export interface ControlRecord {
  id: string;
  controlPointId: string;
  controlPointCode: ControlPointType;
  timestamp: Date;
  operatorId: string;
  operatorName: string;
  status: ControlStatus;
  value?: number; // For temperature readings
  notes?: string;
  photoUrl?: string;
  lotNumber?: string;
  supplier?: string;
  product?: string;
}

export interface NonConformity {
  id: string;
  controlRecordId: string;
  controlPointCode: ControlPointType;
  createdAt: Date;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'validated';
  assignedTo: string;
  correctiveAction?: string;
  correctiveActionDate?: Date;
  validatedBy?: string;
  validatedAt?: Date;
  photos: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface DashboardStats {
  totalControlsToday: number;
  completedControlsToday: number;
  conformeCount: number;
  acceptableCount: number;
  nonConformeCount: number;
  openNonConformities: number;
  conformityRate: number;
}

// Control Point definitions based on HACCP plan
export const CONTROL_POINTS: ControlPoint[] = [
  {
    id: 'cp1',
    code: 'CP1_TEMPERATURE_REFRIGERE',
    name: 'CP1 - Température Produits Réfrigérés',
    description: 'Contrôle température à réception (beurre, œuf, margarine, levure)',
    dangerType: 'Microorganismes pathogènes ou toxines',
    conformeCriteria: 'Température mentionnée sur l\'étiquetage respectée',
    acceptableCriteria: 'Jusqu\'à 3°C de plus en surface pour réfrigéré, jusqu\'à -12°C pour surgelé',
    nonConformeCriteria: 'Température hors limites acceptables',
    actionNonConforme: 'Refus de la marchandise',
    actionAcceptable: 'Avertissement au fournisseur',
    responsible: 'DG / Assistant Qualité',
    frequency: '1 fois par réception minimum',
    supportDocument: 'Tampon de contrôle sur bon de livraison',
    archiveDuration: '5 ans',
  },
  {
    id: 'cp2',
    code: 'CP2_INTEGRITE',
    name: 'CP2 - Intégrité Conditionnement',
    description: 'Vérification de l\'intégrité des emballages à réception',
    dangerType: 'Contamination microbiologique',
    conformeCriteria: 'Emballage propre et non percé',
    nonConformeCriteria: 'Emballage endommagé ou souillé',
    actionNonConforme: 'Refus de la marchandise',
    actionAcceptable: 'Avertissement au fournisseur',
    responsible: 'DG / Assistant Qualité',
    frequency: 'Tous les emballages de chaque livraison',
    supportDocument: 'Fichiers informatiques avec sauvegarde',
    archiveDuration: '5 ans',
  },
  {
    id: 'cp3',
    code: 'CP3_DLC',
    name: 'CP3 - Dates Limites de Consommation',
    description: 'Vérification DLC des matières premières réfrigérées',
    dangerType: 'Multiplication microorganismes',
    conformeCriteria: '≥2 semaines pour œuf/beurre, ≥1 mois pour margarine/levure',
    acceptableCriteria: 'Voir avec le chef si produit consommé avant péremption',
    nonConformeCriteria: 'DLC insuffisante sans possibilité d\'utilisation rapide',
    actionNonConforme: 'Refus de la marchandise',
    actionAcceptable: 'Utilisation prioritaire si validé par le chef',
    responsible: 'DG / Assistant Qualité',
    frequency: 'Tous les étiquetages de chaque livraison',
    supportDocument: 'Tampon de contrôle sur bon de livraison',
    archiveDuration: '5 ans',
  },
  {
    id: 'cp4',
    code: 'CP4_ALLERGENES',
    name: 'CP4 - Allergènes Margarine',
    description: 'Vérification composition allergènes sur étiquetage margarine',
    dangerType: 'Changement intempestif de composition',
    conformeCriteria: 'Composition égale à la photo de référence',
    acceptableCriteria: 'Modification de composition avec accord clients',
    nonConformeCriteria: 'Pas d\'information disponible',
    actionNonConforme: 'Bloquer ou refuser la marchandise',
    actionAcceptable: 'Modifier l\'étiquetage et obtenir accord clients',
    responsible: 'DG / Assistant Qualité',
    frequency: 'Contrôle 100% des étiquetages',
    supportDocument: 'Tampon de contrôle sur bon de livraison',
    archiveDuration: '5 ans',
  },
  {
    id: 'cp5',
    code: 'CP5_CORPS_ETRANGER',
    name: 'CP5 - Corps Étrangers Métalliques',
    description: 'Détection corps étrangers métalliques >2mm',
    dangerType: 'Contamination physique',
    conformeCriteria: 'Pas de détection',
    nonConformeCriteria: 'Détection de corps étranger',
    actionNonConforme: 'Éjecter, chercher le corps étranger et le conserver',
    actionAcceptable: 'Repasser sur une autre ligne ou ligne réparée',
    responsible: 'DG / Assistant Qualité',
    frequency: 'Contrôle à 100%',
    supportDocument: 'Check-list hygiène scannée',
    archiveDuration: '5 ans',
  },
  {
    id: 'cp6',
    code: 'CP6_STOCKAGE_POSITIF',
    name: 'CP6 - Températures Stockage Positif',
    description: 'Surveillance température stockage réfrigéré',
    dangerType: 'Multiplication bactéries pathogènes par rupture chaîne du froid',
    conformeCriteria: 'Température dans la fourchette de l\'étiquetage',
    acceptableCriteria: 'Jusqu\'à 3°C de plus pendant 24h',
    nonConformeCriteria: 'Au-delà des limites acceptables',
    actionNonConforme: 'Jeter',
    actionAcceptable: 'Utiliser immédiatement ou stocker en volume conforme',
    responsible: 'DG / Assistant Qualité',
    frequency: 'Enregistrement manuel quotidien',
    supportDocument: 'Check-list hygiène scannée',
    archiveDuration: '5 ans',
  },
  {
    id: 'cp7',
    code: 'CP7_STOCKAGE_NEGATIF',
    name: 'CP7 - Températures Stockage Négatif',
    description: 'Surveillance température stockage surgelé',
    dangerType: 'Multiplication bactéries par rupture chaîne du froid',
    conformeCriteria: 'Entre -18°C et -22°C',
    acceptableCriteria: '-18°C à -12°C pendant 1 semaine max',
    nonConformeCriteria: 'Au-delà des limites acceptables',
    actionNonConforme: 'Jeter ou traiter comme produit décongelé',
    responsible: 'DG / Assistant Qualité',
    frequency: 'Enregistrement manuel quotidien',
    supportDocument: 'Check-list hygiène scannée',
    archiveDuration: '5 ans',
  },
  {
    id: 'cp8',
    code: 'CP8_DLC_PERIMEE',
    name: 'CP8 - DLC Périmée',
    description: 'Vérification état périmé des matières premières',
    dangerType: 'Utilisation produit à DLC périmée',
    conformeCriteria: 'Non périmé le dernier jour prévisible d\'utilisation',
    acceptableCriteria: 'Date courte (2 jours restants)',
    nonConformeCriteria: 'Produit périmé',
    actionNonConforme: 'Détruire',
    responsible: 'DG / Assistant Qualité',
    frequency: 'Vérification avant utilisation',
    supportDocument: 'Check-list hygiène',
    archiveDuration: '5 ans',
  },
];
