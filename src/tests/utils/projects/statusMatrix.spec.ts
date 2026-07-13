import { ProjectItemStatus } from '@/types/projects';
import {
  canTransition,
  CLIENT_STATUS_LABELS,
  getClientStatusLabel,
  INTERNAL_STATUS_COLORS,
  INTERNAL_STATUS_LABELS,
  isFinalStatus,
} from '@/utils/projects/status';

/** Todos os status do dominio — a matriz abaixo e exaustiva sobre esta lista. */
const ALL_STATUSES: ProjectItemStatus[] = [
  'projeto_criado',
  'aguardando_desenho',
  'aguardando_orcamento',
  'aguardando_aprovacao_cliente',
  'alteracao_solicitada',
  'recusado_pelo_cliente',
  'aguardando_atribuicao_montador',
  'em_producao',
  'pronto_para_montagem',
  'montagem_concluida',
  'aguardando_pagamento_montador',
  'finalizado',
  'cancelado',
];

const FINAL_STATUSES: ProjectItemStatus[] = ['finalizado', 'cancelado'];

/**
 * Transicoes permitidas para usuarios NAO admin, declaradas aqui de forma
 * independente da tabela do codigo de producao — se alguem mexer no fluxo sem
 * atualizar esta matriz, o teste fica vermelho.
 */
const ALLOWED_FOR_NON_ADMIN: Record<ProjectItemStatus, ProjectItemStatus[]> = {
  projeto_criado: ['aguardando_desenho'],
  aguardando_desenho: ['aguardando_orcamento'],
  aguardando_orcamento: ['aguardando_aprovacao_cliente'],
  aguardando_aprovacao_cliente: [
    'aguardando_atribuicao_montador',
    'recusado_pelo_cliente',
    'alteracao_solicitada',
  ],
  alteracao_solicitada: ['aguardando_desenho'],
  recusado_pelo_cliente: [],
  aguardando_atribuicao_montador: ['em_producao'],
  em_producao: ['pronto_para_montagem'],
  pronto_para_montagem: ['montagem_concluida'],
  montagem_concluida: ['aguardando_pagamento_montador'],
  aguardando_pagamento_montador: ['finalizado'],
  finalizado: [],
  cancelado: [],
};

/** Pares (from, to) da matriz completa, incluindo from === to. */
const ALL_PAIRS: Array<[ProjectItemStatus, ProjectItemStatus]> =
  ALL_STATUSES.flatMap(from =>
    ALL_STATUSES.map(
      to => [from, to] as [ProjectItemStatus, ProjectItemStatus],
    ),
  );

describe('canTransition — matriz integral (13 x 13)', () => {
  describe('usuario nao admin', () => {
    it.each(ALL_PAIRS)('%s -> %s', (from, to) => {
      const expected = ALLOWED_FOR_NON_ADMIN[from].includes(to);
      expect(canTransition(from, to)).toBe(expected);
    });

    it('nunca permite cancelar', () => {
      for (const from of ALL_STATUSES) {
        expect(canTransition(from, 'cancelado')).toBe(false);
      }
    });

    it('nunca permite a transicao para o mesmo status', () => {
      for (const status of ALL_STATUSES) {
        expect(canTransition(status, status)).toBe(false);
      }
    });

    it('nega quando o status de origem nao existe na tabela de transicoes', () => {
      const desconhecido = 'status_que_nao_existe' as ProjectItemStatus;

      expect(canTransition(desconhecido, 'aguardando_desenho')).toBe(false);
    });
  });

  describe('usuario admin', () => {
    it.each(ALL_PAIRS)('%s -> %s (isAdmin)', (from, to) => {
      // Admin pode tudo, exceto: para o mesmo status, e cancelar o que ja e final.
      const expected =
        from !== to && (to !== 'cancelado' || !FINAL_STATUSES.includes(from));

      expect(canTransition(from, to, { isAdmin: true })).toBe(expected);
    });

    it('pode cancelar qualquer status nao final', () => {
      const cancelaveis = ALL_STATUSES.filter(
        status => !FINAL_STATUSES.includes(status),
      );

      for (const from of cancelaveis) {
        expect(canTransition(from, 'cancelado', { isAdmin: true })).toBe(true);
      }
      for (const from of FINAL_STATUSES) {
        expect(canTransition(from, 'cancelado', { isAdmin: true })).toBe(false);
      }
    });

    it('pode reabrir um item finalizado (poder de correcao, nao um bug)', () => {
      expect(
        canTransition('finalizado', 'projeto_criado', { isAdmin: true }),
      ).toBe(true);
      expect(canTransition('finalizado', 'projeto_criado')).toBe(false);
    });
  });

  it('admin so ganha permissoes: tudo que o nao-admin pode, o admin tambem pode', () => {
    for (const [from, to] of ALL_PAIRS) {
      if (canTransition(from, to)) {
        expect(canTransition(from, to, { isAdmin: true })).toBe(true);
      }
    }
  });
});

describe('isFinalStatus', () => {
  it.each(ALL_STATUSES)('%s', status => {
    expect(isFinalStatus(status)).toBe(FINAL_STATUSES.includes(status));
  });
});

describe('rotulos de status', () => {
  it('todo status tem rotulo interno, rotulo de cliente e cor', () => {
    for (const status of ALL_STATUSES) {
      expect(INTERNAL_STATUS_LABELS[status]?.length).toBeGreaterThan(0);
      expect(CLIENT_STATUS_LABELS[status]?.length).toBeGreaterThan(0);
      expect(INTERNAL_STATUS_COLORS[status]?.length).toBeGreaterThan(0);
    }
  });

  it('o rotulo do cliente esconde detalhes internos da producao', () => {
    // Producao e montagem interna aparecem como um unico estagio para o cliente.
    expect(getClientStatusLabel('em_producao')).toBe('Em produção');
    expect(getClientStatusLabel('pronto_para_montagem')).toBe('Em produção');
    expect(getClientStatusLabel('montagem_concluida')).toBe(
      'Montagem concluída',
    );
    expect(getClientStatusLabel('aguardando_pagamento_montador')).toBe(
      'Montagem concluída',
    );
  });
});
