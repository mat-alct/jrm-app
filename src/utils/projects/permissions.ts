import { AttachmentAudience, ProjectItem, UserRole } from '@/types/projects';

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
  if (hasRole(userRoles, 'designer')) return '/projetos';
  if (hasRole(userRoles, 'assembler')) return '/montador';
  return '/';
}

const PAGE_ACCESS: Record<string, UserRole[]> = {
  '/': ['admin', 'seller', 'woodworker'],
  '/cortes/novoservico': ['admin', 'seller'],
  '/cortes/listadecortes': ['admin', 'seller', 'woodworker'],
  '/cortes/materiais': ['admin', 'seller'],
  '/cortes/configuracoes-maquina': ['admin', 'seller', 'woodworker'],
  '/cortes/plano/visualizar': ['admin', 'seller', 'woodworker'],
  '/cortes/editar/[id]': ['admin', 'seller'],
  '/administracao/fretes': ['admin', 'seller'],
  '/administracao/vendedores': ['admin'],
  '/administracao/usuarios': ['admin'],
  '/administracao/configuracoes-prazos': ['admin'],
  '/administracao/financeiro-montadores': ['admin'],
  '/projetos': ['admin', 'seller', 'designer'],
  '/projetos/novo': ['admin', 'seller'],
  '/projetos/dashboard': ['admin'],
  '/projetos/[projectId]': ['admin', 'seller'],
  '/projetos/[projectId]/itens/[itemId]': ['admin', 'seller', 'designer'],
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

export function canAssignAssembler(userRoles: UserRole[] | undefined): boolean {
  return isAdmin(userRoles);
}

export function canEditItemStatus(userRoles: UserRole[] | undefined): boolean {
  return (
    isAdmin(userRoles) ||
    hasRole(userRoles, 'assembler') ||
    hasRole(userRoles, 'designer')
  );
}

export function canManageUsers(userRoles: UserRole[] | undefined): boolean {
  return isAdmin(userRoles);
}

const AUDIENCE_ROLES: Partial<Record<UserRole, keyof AttachmentAudience>> = {
  seller: 'seller',
  designer: 'designer',
  assembler: 'assembler',
};

export function canViewAttachment(
  audience: AttachmentAudience,
  userRoles: UserRole[] | undefined,
): boolean {
  if (isAdmin(userRoles)) return true;

  return !!userRoles?.some(role => {
    const audienceKey = AUDIENCE_ROLES[role];
    return audienceKey ? audience[audienceKey] : false;
  });
}

/**
 * O corte de visibilidade se aplica apenas ao usuario cujo unico papel e
 * vendedor. Papeis acumulados (especialmente admin/designer) preservam suas
 * responsabilidades operacionais.
 */
export function isSellerLocked(
  item: Pick<ProjectItem, 'assemblerAssignedAt'> | null | undefined,
  userRoles: UserRole[] | undefined,
): boolean {
  return (
    !!item?.assemblerAssignedAt &&
    userRoles?.length === 1 &&
    userRoles[0] === 'seller'
  );
}
