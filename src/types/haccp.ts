// HACCP Types for Breadshop SAS Application

export type ControlStatus = 'conforme' | 'acceptable' | 'nonconforme' | 'pending';

export type UserRole = 'operator' | 'quality_assistant' | 'admin';

// Updated: CP1-4 grouped into CP_RECEPTION, CP6-7 merged into CP_STOCKAGE, CP_PRODUCTION added
export type ControlPointType = 
  | 'CP_RECEPTION'
  | 'CP5_CORPS_ETRANGER'
  | 'CP_STOCKAGE'
  | 'CP8_DLC_PERIMEE'
  | 'CP_PRODUCTION';

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
  // For grouped control point (CP_RECEPTION)
  subControls?: SubControl[];
}

export interface SubControl {
  id: string;
  name: string;
  description: string;
  conformeCriteria: string;
  acceptableCriteria?: string;
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
  photos?: string[];
  // Reception control specific fields
  temperatureConforme?: boolean;
  integriteConforme?: boolean;
  integriteNotes?: string;
  dlcDate?: string;
  dlcConforme?: boolean;
  dlcNotes?: string;
  allergenesConformes?: boolean;
  allergenesNotes?: string;
  // Storage temperature specific field
  coldRoomName?: string;
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
// CP1-CP4 grouped into CP_RECEPTION
export const CONTROL_POINTS: ControlPoint[] = [
  {
    id: 'cp-reception',
    code: 'CP_RECEPTION',
    name: 'Contrôle Réception',
    description: 'Contrôle complet à réception: température, intégrité, DLC et allergènes',
    dangerType: 'Microorganismes pathogènes, contamination, allergènes',
    conformeCriteria: 'Tous les critères respectés: température, emballage, DLC, composition',
    acceptableCriteria: 'Dérogations mineures acceptables avec action corrective',
    nonConformeCriteria: 'Un ou plusieurs critères non respectés',
    actionNonConforme: 'Refus de la marchandise ou traitement spécifique selon le critère',
    actionAcceptable: 'Avertissement au fournisseur, utilisation prioritaire si validé',
    responsible: 'DG / Assistant Qualité',
    frequency: '1 fois par réception minimum',
    supportDocument: 'Tampon de contrôle sur bon de livraison',
    archiveDuration: '5 ans',
    subControls: [
      {
        id: 'cp1',
        name: 'CP1 - Température',
        description: 'Contrôle température à réception (beurre, œuf, margarine, levure)',
        conformeCriteria: 'Température mentionnée sur l\'étiquetage respectée',
        acceptableCriteria: 'Jusqu\'à 3°C de plus en surface pour réfrigéré, jusqu\'à -12°C pour surgelé',
      },
      {
        id: 'cp2',
        name: 'CP2 - Intégrité',
        description: 'Vérification de l\'intégrité des emballages',
        conformeCriteria: 'Emballage propre et non percé',
      },
      {
        id: 'cp3',
        name: 'CP3 - DLC',
        description: 'Vérification DLC des matières premières',
        conformeCriteria: '≥2 semaines pour œuf/beurre, ≥1 mois pour margarine/levure',
        acceptableCriteria: 'Voir avec le chef si produit consommé avant péremption',
      },
      {
        id: 'cp4',
        name: 'CP4 - Allergènes',
        description: 'Vérification composition allergènes sur étiquetage',
        conformeCriteria: 'Composition égale à la photo de référence',
        acceptableCriteria: 'Modification de composition avec accord clients',
      },
    ],
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
    id: 'cp-stockage',
    code: 'CP_STOCKAGE',
    name: 'CP - Températures Stockage',
    description: 'Surveillance des températures des chambres froides (positif et négatif)',
    dangerType: 'Multiplication bactéries pathogènes par rupture chaîne du froid',
    conformeCriteria: 'Température dans les limites définies pour chaque chambre',
    acceptableCriteria: 'Écart temporaire limité (3°C max pour 24h)',
    nonConformeCriteria: 'Au-delà des limites acceptables',
    actionNonConforme: 'Jeter ou traiter selon protocole',
    actionAcceptable: 'Utiliser immédiatement ou ajuster stockage',
    responsible: 'DG / Assistant Qualité',
    frequency: 'Enregistrement quotidien',
    supportDocument: 'Relevés température archivés',
    archiveDuration: '5 ans',
  },
  {
    id: 'cp8',
    code: 'CP8_DLC_PERIMEE',
    name: 'CP8 - Date de Péremption des produits réfrigérés',
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
  {
    id: 'cp-production',
    code: 'CP_PRODUCTION',
    name: 'Production',
    description: 'Traçabilité des numéros de lot des matières premières utilisées en fabrication',
    dangerType: 'Défaut de traçabilité',
    conformeCriteria: 'Photos des numéros de lot prises quotidiennement',
    nonConformeCriteria: 'Photos manquantes ou illisibles',
    actionNonConforme: 'Reprendre les photos, documenter les lots manquants',
    responsible: 'Chef de Production',
    frequency: 'Quotidien',
    supportDocument: 'Photos des étiquettes de lot',
    archiveDuration: '5 ans',
  },
];
