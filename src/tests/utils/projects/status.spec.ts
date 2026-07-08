import {
  CLIENT_STATUS_LABELS,
  canTransition,
  getClientStatusLabel,
  isFinalStatus,
} from '@/utils/projects/status';
import { ProjectItemStatus } from '@/types/projects';

describe('utils/projects/status', () => {
  describe('canTransition', () => {
    it('allows the happy-path flow with a designer', () => {
      expect(canTransition('orcamento_criado', 'aguardando_desenho')).toBe(
        true,
      );
      expect(canTransition('aguardando_desenho', 'projeto_desenhado')).toBe(
        true,
      );
      expect(
        canTransition('projeto_desenhado', 'aguardando_aprovacao_cliente'),
      ).toBe(true);
      expect(
        canTransition('aguardando_aprovacao_cliente', 'aprovado'),
      ).toBe(true);
      expect(
        canTransition('aprovado', 'aguardando_separacao_materiais'),
      ).toBe(true);
      expect(
        canTransition(
          'aguardando_separacao_materiais',
          'em_producao',
        ),
      ).toBe(true);
      expect(canTransition('em_producao', 'pronto_para_transporte')).toBe(
        true,
      );
      expect(canTransition('pronto_para_transporte', 'em_transporte')).toBe(
        true,
      );
      expect(canTransition('em_transporte', 'em_montagem')).toBe(true);
      expect(canTransition('em_montagem', 'montagem_concluida')).toBe(true);
      expect(canTransition('montagem_concluida', 'finalizado')).toBe(true);
    });

    it('allows the direct flow without a designer', () => {
      expect(
        canTransition('orcamento_criado', 'aguardando_aprovacao_cliente'),
      ).toBe(true);
    });

    it('allows client decisions from aguardando_aprovacao_cliente', () => {
      expect(
        canTransition(
          'aguardando_aprovacao_cliente',
          'recusado_pelo_cliente',
        ),
      ).toBe(true);
      expect(
        canTransition(
          'aguardando_aprovacao_cliente',
          'alteracao_solicitada',
        ),
      ).toBe(true);
    });

    it('sends alteracao_solicitada back to the designer queue', () => {
      expect(
        canTransition('alteracao_solicitada', 'aguardando_desenho'),
      ).toBe(true);
    });

    it('blocks transitions outside the allowed flow for non-admins', () => {
      expect(canTransition('orcamento_criado', 'finalizado')).toBe(false);
      expect(canTransition('em_producao', 'em_montagem')).toBe(false);
      expect(canTransition('finalizado', 'aprovado')).toBe(false);
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
        canTransition('orcamento_criado', 'finalizado', { isAdmin: true }),
      ).toBe(true);
      expect(
        canTransition('em_producao', 'aguardando_desenho', {
          isAdmin: true,
        }),
      ).toBe(true);
    });

    it('lets admins cancel any non-final item', () => {
      expect(
        canTransition('em_producao', 'cancelado', { isAdmin: true }),
      ).toBe(true);
    });

    it('blocks even admins from cancelling an already final item', () => {
      expect(
        canTransition('finalizado', 'cancelado', { isAdmin: true }),
      ).toBe(false);
      expect(
        canTransition('cancelado', 'cancelado', { isAdmin: true }),
      ).toBe(false);
    });
  });

  describe('isFinalStatus', () => {
    it('treats finalizado and cancelado as final', () => {
      expect(isFinalStatus('finalizado')).toBe(true);
      expect(isFinalStatus('cancelado')).toBe(true);
    });

    it('treats every other status as non-final', () => {
      const nonFinal: ProjectItemStatus[] = [
        'orcamento_criado',
        'aguardando_desenho',
        'projeto_desenhado',
        'aguardando_aprovacao_cliente',
        'alteracao_solicitada',
        'recusado_pelo_cliente',
        'aprovado',
        'aguardando_separacao_materiais',
        'em_producao',
        'pronto_para_transporte',
        'em_transporte',
        'em_montagem',
        'montagem_concluida',
      ];

      nonFinal.forEach(status => expect(isFinalStatus(status)).toBe(false));
    });
  });

  describe('getClientStatusLabel', () => {
    it('has a label for every internal status', () => {
      const statuses = Object.keys(
        CLIENT_STATUS_LABELS,
      ) as ProjectItemStatus[];

      expect(statuses).toHaveLength(15);
      statuses.forEach(status => {
        expect(getClientStatusLabel(status)).toEqual(
          expect.any(String),
        );
        expect(getClientStatusLabel(status).length).toBeGreaterThan(0);
      });
    });

    it('maps a known status to its documented label', () => {
      expect(getClientStatusLabel('aguardando_aprovacao_cliente')).toBe(
        'Aguardando sua aprovação',
      );
    });
  });
});
