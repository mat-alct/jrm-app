import { AttachmentVisibility, UserRole } from '@/types/projects';

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  seller: 'Vendedor',
  designer: 'Desenhista',
  assembler: 'Montador',
  woodworker: 'Marceneiro',
};

export function hasRole(
  userRoles: UserRole[] | undefined,
  role: UserRole,
): boolean {
  return !!userRoles?.includes(role);
}

export function isAdmin(userRoles: UserRole[] | undefined): boolean {
  return hasRole(userRoles, 'admin');
}

export function hasAnyRole(
  userRoles: UserRole[] | undefined,
  allowedRoles: UserRole[],
): boolean {
  return !!userRoles?.some(role => allowedRoles.includes(role));
}

export function canAccessRoles(
  userRoles: UserRole[] | undefined,
  allowedRoles: UserRole[],
): boolean {
  return isAdmin(userRoles) || hasAnyRole(userRoles, allowedRoles);
}

export function getDefaultRouteForRoles(
  userRoles: UserRole[] | undefined,
): string {
  if (hasRole(userRoles, 'designer')) return '/desenhista';
  if (hasRole(userRoles, 'assembler')) return '/montador';
  return '/';
}

const PAGE_ACCESS: Record<string, UserRole[]> = {
  '/': ['admin', 'seller', 'woodworker'],
  '/cortes/novoservico': ['admin', 'seller'],
  '/cortes/listadecortes': ['admin', 'seller', 'woodworker'],
  '/cortes/materiais': ['admin', 'seller'],
  '/cortes/editar/[id]': ['admin', 'seller'],
  '/administracao/fretes': ['admin', 'seller'],
  '/administracao/vendedores': ['admin'],
  '/administracao/usuarios': ['admin'],
  '/administracao/configuracoes-prazos': ['admin'],
  '/administracao/financeiro-montadores': ['admin'],
  '/projetos': ['admin', 'seller'],
  '/projetos/novo': ['admin', 'seller'],
  '/projetos/dashboard': ['admin'],
  '/projetos/[projectId]': ['admin', 'seller'],
  '/projetos/[projectId]/itens/[itemId]': ['admin', 'seller', 'designer'],
  '/desenhista': ['admin', 'designer'],
  '/montador': ['admin', 'assembler'],
  '/montador/financeiro': ['admin', 'assembler'],
  '/montador/item/[projectId]/[itemId]': ['admin', 'assembler'],
};

export function isPublicRoute(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/cliente/');
}

export function canAccessPage(
  pathname: string,
  userRoles: UserRole[] | undefined,
): boolean {
  if (isPublicRoute(pathname)) return true;
  return canAccessRoles(userRoles, PAGE_ACCESS[pathname] ?? ['admin']);
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
