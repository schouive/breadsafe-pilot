// Types pour le système de gestion des accès

export type AppRole = 'admin' | 'quality_assistant' | 'operator' | 'bureau_methodes' | 'auditor';

export interface RoleDefinition {
  id: AppRole;
  label: string;
  description: string;
  color: string;
  permissions: RolePermissions;
}

export interface RolePermissions {
  // Modules accessibles
  modules: {
    haccp: 'full' | 'read' | 'write' | 'none';
    products: 'full' | 'read' | 'write' | 'none';
    settings: 'full' | 'read' | 'none';
  };
  // Actions spécifiques
  canManageUsers: boolean;
  canValidateNC: boolean;
  canExportData: boolean;
  canViewAuditLogs: boolean;
}

// Définition des rôles et leurs permissions
export const ROLE_DEFINITIONS: Record<AppRole, RoleDefinition> = {
  admin: {
    id: 'admin',
    label: 'Administrateur',
    description: 'Accès total à tous les modules et paramètres',
    color: 'bg-red-100 text-red-700 border-red-200',
    permissions: {
      modules: {
        haccp: 'full',
        products: 'full',
        settings: 'full',
      },
      canManageUsers: true,
      canValidateNC: true,
      canExportData: true,
      canViewAuditLogs: true,
    },
  },
  quality_assistant: {
    id: 'quality_assistant',
    label: 'Responsable Qualité',
    description: 'Accès complet HACCP, lecture seule recettes et paramètres',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    permissions: {
      modules: {
        haccp: 'full',
        products: 'read',
        settings: 'read',
      },
      canManageUsers: false,
      canValidateNC: true,
      canExportData: true,
      canViewAuditLogs: true,
    },
  },
  operator: {
    id: 'operator',
    label: 'Opérateur / Production',
    description: 'Saisie HACCP uniquement, interface simplifiée',
    color: 'bg-green-100 text-green-700 border-green-200',
    permissions: {
      modules: {
        haccp: 'write',
        products: 'none',
        settings: 'none',
      },
      canManageUsers: false,
      canValidateNC: false,
      canExportData: false,
      canViewAuditLogs: false,
    },
  },
  bureau_methodes: {
    id: 'bureau_methodes',
    label: 'Bureau / Méthodes',
    description: 'Gestion recettes, étiquetage et données nutritionnelles',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    permissions: {
      modules: {
        haccp: 'read',
        products: 'full',
        settings: 'read',
      },
      canManageUsers: false,
      canValidateNC: false,
      canExportData: true,
      canViewAuditLogs: false,
    },
  },
  auditor: {
    id: 'auditor',
    label: 'Auditeur',
    description: 'Lecture seule, accès limité pour audit',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    permissions: {
      modules: {
        haccp: 'read',
        products: 'read',
        settings: 'none',
      },
      canManageUsers: false,
      canValidateNC: false,
      canExportData: false,
      canViewAuditLogs: true,
    },
  },
};

// Helper pour obtenir le label d'un rôle
export function getRoleLabel(role: AppRole): string {
  return ROLE_DEFINITIONS[role]?.label || role;
}

// Helper pour obtenir les classes de couleur d'un rôle
export function getRoleColorClasses(role: AppRole): string {
  return ROLE_DEFINITIONS[role]?.color || 'bg-gray-100 text-gray-700 border-gray-200';
}

// Helper pour vérifier si un utilisateur a accès à un module
export function hasModuleAccess(
  roles: AppRole[],
  module: keyof RolePermissions['modules'],
  requiredAccess: 'read' | 'write' | 'full' = 'read'
): boolean {
  const accessLevels = { none: 0, read: 1, write: 2, full: 3 };
  const requiredLevel = accessLevels[requiredAccess];

  return roles.some((role) => {
    const permissions = ROLE_DEFINITIONS[role]?.permissions;
    if (!permissions) return false;
    const moduleAccess = permissions.modules[module];
    return accessLevels[moduleAccess] >= requiredLevel;
  });
}

// Helper pour vérifier une permission spécifique
export function hasPermission(
  roles: AppRole[],
  permission: keyof Omit<RolePermissions, 'modules'>
): boolean {
  return roles.some((role) => {
    const permissions = ROLE_DEFINITIONS[role]?.permissions;
    return permissions?.[permission] === true;
  });
}
