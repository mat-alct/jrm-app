import { ProjectItemStatus } from '@/types/projects';
import {
  canTransition,
  CLIENT_STATUS_LABELS,
  getClientStatusLabel,
  isFinalStatus,
} from '@/utils/projects/status';

describe('utils/projects/status', () => {
  describe('canTransition', () => {
    it('allows the happy-path flow of the carpentry operation', () => {
      expect(canTransition('projeto_criado', 'aguardando_desenho')).toBe(true);
      expect(canTransition('aguardando_desenho', 'aguardando_orcamento')).toBe(
        true,
      );
      expect(
        canTransition('aguardando_orcamento', 'aguardando_aprovacao_cliente'),
      ).toBe(true);
      expect(
        canTransition(
          'aguardando_aprovacao_cliente',
          'aguardando_atribuicao_montador',
        ),
      ).toBe(true);
      expect(
        canTransition('aguardando_atribuicao_montador', 'em_producao'),
      ).toBe(true);
      expect(canTransition('em_producao', 'pronto_para_montagem')).toBe(true);
      expect(canTransition('pronto_para_montagem', 'montagem_concluida')).toBe(
        true,
      );
      expect(
        canTransition('montagem_concluida', 'aguardando_pagamento_montador'),
      ).toBe(true);
      expect(canTransition('aguardando_pagamento_montador', 'finalizado')).toBe(
        true,
      );
    });

    it('allows client decisions from aguardando_aprovacao_cliente', () => {
      expect(
        canTransition('aguardando_aprovacao_cliente', 'recusado_pelo_cliente'),
      ).toBe(true);
      expect(
        canTransition('aguardando_aprovacao_cliente', 'alteracao_solicitada'),
      ).toBe(true);
    });

    it('sends alteracao_solicitada back to the designer queue', () => {
      expect(canTransition('alteracao_solicitada', 'aguardando_desenho')).toBe(
        true,
      );
    });

    it('blocks transitions outside the allowed flow for non-admins', () => {
      expect(canTransition('projeto_criado', 'finalizado')).toBe(false);
      expect(canTransition('em_producao', 'montagem_concluida')).toBe(false);
      expect(
        canTransition('finalizado', 'aguardando_atribuicao_montador'),
      ).toBe(false);
    });

    it('blocks non-admins from cancelling', () => {
      expect(canTransition('em_producao', 'cancelado')).toBe(false);
    });

    it('blocks transitioning to the same status', () => {
      expect(canTransition('em_producao', 'em_producao')).toBe(false);
      expect(
        canTransition('em_producao', 'em_producao', { isAdmin: true }),
      ).toBe(false);
    });

    it('lets admins override the flow and force any transition', () => {
      expect(
        canTransition('projeto_criado', 'finalizado', { isAdmin: true }),
      ).toBe(true);
      expect(
        canTransition('em_producao', 'aguardando_desenho', {
          isAdmin: true,
        }),
      ).toBe(true);
    });

    it('lets admins cancel any non-final item', () => {
      expect(canTransition('em_producao', 'cancelado', { isAdmin: true })).toBe(
        true,
      );
    });

    it('blocks even admins from cancelling an already final item', () => {
      expect(canTransition('finalizado', 'cancelado', { isAdmin: true })).toBe(
        false,
      );
      expect(canTransition('cancelado', 'cancelado', { isAdmin: true })).toBe(
        false,
      );
    });
  });

  describe('isFinalStatus', () => {
    it('treats finalizado and cancelado as final', () => {
      expect(isFinalStatus('finalizado')).toBe(true);
      expect(isFinalStatus('cancelado')).toBe(true);
    });

    it('treats every other status as non-final', () => {
      const nonFinal: ProjectItemStatus[] = [
        'projeto_criado',
        'aguardando_desenho',
        'aguardando_informacoes',
        'aguardando_orcamento',
        'aguardando_aprovacao_cliente',
        'alteracao_solicitada',
        'recusado_pelo_cliente',
        'aguardando_atribuicao_montador',
        'em_producao',
        'pronto_para_montagem',
        'montagem_concluida',
        'aguardando_pagamento_montador',
      ];

      nonFinal.forEach(status => expect(isFinalStatus(status)).toBe(false));
    });
  });

  describe('getClientStatusLabel', () => {
    it('has a label for every internal status', () => {
      const statuses = Object.keys(CLIENT_STATUS_LABELS) as ProjectItemStatus[];

      expect(statuses).toHaveLength(14);
      statuses.forEach(status => {
        expect(getClientStatusLabel(status)).toEqual(expect.any(String));
        expect(getClientStatusLabel(status).length).toBeGreaterThan(0);
      });
    });

    it('maps a known status to its documented label', () => {
      expect(getClientStatusLabel('aguardando_aprovacao_cliente')).toBe(
        'Aguardando sua aprovação',
      );
      expect(getClientStatusLabel('aguardando_orcamento')).toBe(
        'Orçamento em preparação',
      );
    });

    it('does not leak internal-only operation labels to the client', () => {
      expect(
        getClientStatusLabel('aguardando_atribuicao_montador'),
      ).not.toMatch(/montador/i);
      expect(getClientStatusLabel('aguardando_pagamento_montador')).not.toMatch(
        /pagamento|montador/i,
      );
      expect(getClientStatusLabel('em_producao')).not.toMatch(/montador/i);
    });
  });
});
