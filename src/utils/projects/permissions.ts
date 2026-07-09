import { AttachmentVisibility, UserRole } from '@/types/projects';

export function hasRole(
  userRoles: UserRole[] | undefined,
  role: UserRole,
): boolean {
  return !!userRoles?.includes(role);
}

export function isAdmin(userRoles: UserRole[] | undefined): boolean {
  return hasRole(userRoles, 'admin');
}

export function canSeeAssemblerFinance(
  userRoles: UserRole[] | undefined,
): boolean {
  return isAdmin(userRoles) || hasRole(userRoles, 'assembler');
}

export function canAssignDesigner(userRoles: UserRole[] | undefined): boolean {
  return isAdmin(userRoles) || hasRole(userRoles, 'seller');
}

export function canAssignAssembler(
  userRoles: UserRole[] | undefined,
): boolean {
  return isAdmin(userRoles);
}

export function canEditItemStatus(
  userRoles: UserRole[] | undefined,
): boolean {
  return (
    isAdmin(userRoles) ||
    hasRole(userRoles, 'assembler') ||
    hasRole(userRoles, 'designer')
  );
}

export function canManageUsers(userRoles: UserRole[] | undefined): boolean {
  return isAdmin(userRoles);
}

export function canViewAttachment(
  visibility: AttachmentVisibility,
  userRoles: UserRole[] | undefined,
): boolean {
  if (isAdmin(userRoles)) return true;

  switch (visibility) {
    case 'internal':
      return !!userRoles && userRoles.length > 0;
    case 'client':
      return !!userRoles && userRoles.length > 0;
    case 'designer':
      return hasRole(userRoles, 'designer');
    case 'assembler':
      return hasRole(userRoles, 'assembler');
    default:
      return false;
  }
}
