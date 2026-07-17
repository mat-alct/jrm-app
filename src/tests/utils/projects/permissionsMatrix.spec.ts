import fs from 'node:fs';
import path from 'node:path';

import { AttachmentAudience, UserRole } from '@/types/projects';
import {
  canAccessPage,
  canAssignAssembler,
  canAssignDesigner,
  canEditItemStatus,
  canManageUsers,
  canSeeAssemblerFinance,
  canViewAttachment,
  getDefaultRouteForRoles,
  isPublicRoute,
} from '@/utils/projects/permissions';

const ROLES: UserRole[] = [
  'admin',
  'seller',
  'designer',
  'assembler',
  'woodworker',
];

/**
 * Matriz de acesso declarada de forma independente do PAGE_ACCESS do codigo:
 * para cada rota real do app, quem PODE entrar. Admin entra em tudo.
 */
const EXPECTED_ACCESS: Record<string, UserRole[]> = {
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

const ROUTE_ROLE_PAIRS: Array<[string, UserRole]> = Object.keys(
  EXPECTED_ACCESS,
).flatMap(route => ROLES.map(role => [route, role] as [string, UserRole]));

/** Descobre as rotas reais a partir dos arquivos em src/pages (exclui API e _app). */
function realAppRoutes(): string[] {
  const pagesDir = path.join(process.cwd(), 'src', 'pages');
  const routes: string[] = [];

  function walk(dir: string, prefix: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'api') continue;
        walk(full, `${prefix}/${entry.name}`);
        continue;
      }
      if (!entry.name.endsWith('.tsx')) continue;
      if (entry.name.startsWith('_')) continue;

      const base = entry.name.replace(/\.tsx$/, '');
      routes.push(base === 'index' ? prefix || '/' : `${prefix}/${base}`);
    }
  }

  walk(pagesDir, '');
  return routes;
}

describe('canAccessPage — matriz rota x papel', () => {
  it.each(ROUTE_ROLE_PAIRS)('%s como %s', (route, role) => {
    const expected = role === 'admin' || EXPECTED_ACCESS[route].includes(role);
    expect(canAccessPage(route, [role])).toBe(expected);
  });

  it('nega todas as rotas protegidas para usuario sem papel', () => {
    for (const route of Object.keys(EXPECTED_ACCESS)) {
      expect(canAccessPage(route, [])).toBe(false);
      expect(canAccessPage(route, undefined)).toBe(false);
    }
  });

  it('libera a rota quando o usuario tem qualquer um dos papeis permitidos', () => {
    expect(
      canAccessPage('/cortes/listadecortes', ['designer', 'woodworker']),
    ).toBe(true);
    expect(
      canAccessPage('/cortes/listadecortes', ['designer', 'assembler']),
    ).toBe(false);
  });

  it('cai no default restrito a admin para rota desconhecida', () => {
    expect(canAccessPage('/rota/que/nao/existe', ['admin'])).toBe(true);
    expect(canAccessPage('/rota/que/nao/existe', ['seller'])).toBe(false);
  });

  // Guarda contra o modo de falha "criei a pagina e esqueci a permissao":
  // sem entrada em PAGE_ACCESS a rota vira admin-only silenciosamente.
  it('toda pagina real do app esta na matriz de acesso ou e publica', () => {
    const semRegra = realAppRoutes().filter(
      route => !isPublicRoute(route) && !(route in EXPECTED_ACCESS),
    );

    expect(semRegra).toEqual([]);
  });
});

describe('isPublicRoute', () => {
  it('trata /login e o portal do cliente como publicos', () => {
    expect(isPublicRoute('/login')).toBe(true);
    expect(isPublicRoute('/cliente/[publicId]')).toBe(true);
    expect(isPublicRoute('/cliente/[publicId]/acompanhar')).toBe(true);
    expect(isPublicRoute('/cliente/abc123')).toBe(true);
  });

  it('nao trata como publica uma rota que apenas comeca parecido', () => {
    expect(isPublicRoute('/clientes')).toBe(false);
    expect(isPublicRoute('/cliente')).toBe(false);
    expect(isPublicRoute('/')).toBe(false);
    expect(isPublicRoute('/login/extra')).toBe(false);
  });

  it('libera rota publica mesmo sem papel algum', () => {
    expect(canAccessPage('/login', undefined)).toBe(true);
    expect(canAccessPage('/cliente/abc123', undefined)).toBe(true);
  });
});

describe('getDefaultRouteForRoles — precedencia entre papeis', () => {
  it.each([
    [['designer'], '/projetos'],
    [['assembler'], '/montador'],
    [['admin'], '/'],
    [['seller'], '/'],
    [['woodworker'], '/'],
    [[], '/'],
  ] as Array<[UserRole[], string]>)('%p => %s', (roles, expected) => {
    expect(getDefaultRouteForRoles(roles)).toBe(expected);
  });

  it('desenhista tem precedencia sobre montador e sobre admin', () => {
    expect(getDefaultRouteForRoles(['assembler', 'designer'])).toBe(
      '/projetos',
    );
    expect(getDefaultRouteForRoles(['admin', 'designer'])).toBe('/projetos');
  });

  it('montador tem precedencia sobre admin', () => {
    expect(getDefaultRouteForRoles(['admin', 'assembler'])).toBe('/montador');
  });

  it('devolve a home quando os papeis nao tem area propria', () => {
    expect(getDefaultRouteForRoles(undefined)).toBe('/');
    expect(getDefaultRouteForRoles(['admin', 'seller', 'woodworker'])).toBe(
      '/',
    );
  });
});

describe('canViewAttachment — audiencia x papel', () => {
  const AUDIENCE_KEYS: (keyof AttachmentAudience)[] = [
    'seller',
    'designer',
    'assembler',
  ];

  const NO_ONE: AttachmentAudience = {
    seller: false,
    designer: false,
    assembler: false,
    client: false,
  };

  function audienceWithOnly(key: keyof AttachmentAudience): AttachmentAudience {
    return { ...NO_ONE, [key]: true };
  }

  const EXPECTED: Record<keyof AttachmentAudience, UserRole[]> = {
    seller: ['admin', 'seller'],
    designer: ['admin', 'designer'],
    assembler: ['admin', 'assembler'],
    client: ['admin'],
  };

  const PAIRS = AUDIENCE_KEYS.flatMap(key =>
    ROLES.map(role => [key, role] as [keyof AttachmentAudience, UserRole]),
  );

  it.each(PAIRS)('anexo visivel para %s visto por %s', (key, role) => {
    expect(canViewAttachment(audienceWithOnly(key), [role])).toBe(
      EXPECTED[key].includes(role),
    );
  });

  it('nega tudo para usuario sem papel', () => {
    for (const key of AUDIENCE_KEYS) {
      expect(canViewAttachment(audienceWithOnly(key), [])).toBe(false);
      expect(canViewAttachment(audienceWithOnly(key), undefined)).toBe(false);
    }
  });

  it('admin ve qualquer anexo, mesmo com audiencia toda desmarcada', () => {
    expect(canViewAttachment(NO_ONE, ['admin'])).toBe(true);
    expect(canViewAttachment(NO_ONE, ['seller'])).toBe(false);
  });
});

describe('guardas de acao por papel', () => {
  const CASES: Array<
    [string, (roles: UserRole[] | undefined) => boolean, UserRole[]]
  > = [
    ['canSeeAssemblerFinance', canSeeAssemblerFinance, ['admin', 'assembler']],
    ['canAssignDesigner', canAssignDesigner, ['admin', 'seller']],
    ['canAssignAssembler', canAssignAssembler, ['admin']],
    [
      'canEditItemStatus',
      canEditItemStatus,
      ['admin', 'assembler', 'designer'],
    ],
    ['canManageUsers', canManageUsers, ['admin']],
  ];

  it.each(CASES)('%s', (_name, guard, allowedRoles) => {
    for (const role of ROLES) {
      expect(guard([role])).toBe(allowedRoles.includes(role));
    }
    expect(guard([])).toBe(false);
    expect(guard(undefined)).toBe(false);
  });
});
