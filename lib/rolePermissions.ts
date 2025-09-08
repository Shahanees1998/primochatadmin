export enum UserRole {
  MEMBER = 'MEMBER',
  ADMIN = 'ADMIN',
  ADMINLEVELTWO = 'ADMINLEVELTWO',
  ADMINLEVELTHREE = 'ADMINLEVELTHREE'
}

export interface RolePermissions {
  canAccessFestiveBoard: boolean;
  canAccessTrestleBoard: boolean;
  canAccessAnnouncements: boolean;
  canAccessDocuments: boolean;
  canAccessUsers: boolean;
  canAccessSettings: boolean;
  canAccessSupport: boolean;
  canAccessLCMTest: boolean;
  canAccessAll: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  [UserRole.MEMBER]: {
    canAccessFestiveBoard: false,
    canAccessTrestleBoard: false,
    canAccessAnnouncements: false,
    canAccessDocuments: false,
    canAccessUsers: false,
    canAccessSettings: false,
    canAccessSupport: false,
    canAccessLCMTest: false,
    canAccessAll: false,
  },
  [UserRole.ADMIN]: {
    canAccessFestiveBoard: true,
    canAccessTrestleBoard: true,
    canAccessAnnouncements: true,
    canAccessDocuments: true,
    canAccessUsers: true,
    canAccessSettings: true,
    canAccessSupport: true,
    canAccessLCMTest: true,
    canAccessAll: true,
  },
  [UserRole.ADMINLEVELTWO]: {
    canAccessFestiveBoard: true,
    canAccessTrestleBoard: false,
    canAccessAnnouncements: false,
    canAccessDocuments: false,
    canAccessUsers: false,
    canAccessSettings: false,
    canAccessSupport: false,
    canAccessLCMTest: false,
    canAccessAll: false,
  },
  [UserRole.ADMINLEVELTHREE]: {
    canAccessFestiveBoard: false,
    canAccessTrestleBoard: true,
    canAccessAnnouncements: true,
    canAccessDocuments: true,
    canAccessUsers: false,
    canAccessSettings: false,
    canAccessSupport: false,
    canAccessLCMTest: false,
    canAccessAll: false,
  },
};

export function getRolePermissions(role: string): RolePermissions {
  return ROLE_PERMISSIONS[role as UserRole] || ROLE_PERMISSIONS[UserRole.MEMBER];
}

export function canAccessSection(role: string, section: keyof RolePermissions): boolean {
  const permissions = getRolePermissions(role);
  return permissions[section];
}

export function getDefaultRedirectPath(role: string): string {
  const permissions = getRolePermissions(role);
  
  if (permissions.canAccessAll) {
    return '/admin';
  }
  
  if (permissions.canAccessFestiveBoard) {
    return '/admin/festive-board';
  }
  
  if (permissions.canAccessTrestleBoard) {
    return '/admin/trestle-board';
  }
  
  if (permissions.canAccessDocuments) {
    return '/admin/documents';
  }
  
  if (permissions.canAccessAnnouncements) {
    return '/admin/announcements';
  }
  
  // Fallback to admin dashboard
  return '/admin';
}

export function isAdminRole(role: string): boolean {
  return role === UserRole.ADMIN || role === UserRole.ADMINLEVELTWO || role === UserRole.ADMINLEVELTHREE;
}

export function getSectionPath(section: string): string {
  const sectionMap: Record<string, string> = {
    'festive-board': '/admin/festive-board',
    'trestle-board': '/admin/trestle-board',
    'announcements': '/admin/announcements',
    'documents': '/admin/documents',
    'users': '/admin/users',
    'settings': '/admin/settings',
    'support': '/admin/support',
    'lcm-test': '/admin/lcm-test',
  };
  
  return sectionMap[section] || '/admin';
}
