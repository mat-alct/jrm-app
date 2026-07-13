import { Timestamp } from 'firebase/firestore';

import {
  computeItemSummary,
  computeTotalCustomerValue,
} from '@/services/projects/summary';
import { ProjectItemStatus } from '@/types/projects';

const now = new Date('2026-07-08T12:00:00Z');
const past = Timestamp.fromDate(new Date('2026-07-01T12:00:00Z'));
const future = Timestamp.fromDate(new Date('2026-08-01T12:00:00Z'));

function item(
  status: ProjectItemStatus,
  deadlineCurrent?: Timestamp,
  customerPrice = 100,
) {
  return { status, deadlineCurrent, customerPrice };
}

describe('services/projects/summary', () => {
  describe('computeItemSummary', () => {
    it('returns all zeros for an empty list', () => {
      expect(computeItemSummary([], now)).toEqual({
        total: 0,
        aguardandoAprovacao: 0,
        aprovados: 0,
        emProducao: 0,
        emMontagem: 0,
        finalizados: 0,
        atrasados: 0,
      });
    });

    it('counts each status bucket independently', () => {
      const items = [
        item('aguardando_aprovacao_cliente'),
        item('aguardando_atribuicao_montador'),
        item('em_producao'),
        item('pronto_para_montagem'),
        item('montagem_concluida'),
        item('aguardando_pagamento_montador'),
        item('finalizado'),
        item('projeto_criado'),
      ];

      expect(computeItemSummary(items, now)).toEqual({
        total: 8,
        aguardandoAprovacao: 1,
        aprovados: 1,
        emProducao: 2,
        emMontagem: 2,
        finalizados: 1,
        atrasados: 0,
      });
    });

    it('counts delayed non-final items and ignores delayed final items', () => {
      const items = [
        item('em_producao', past),
        item('em_producao', future),
        item('finalizado', past),
      ];

      expect(computeItemSummary(items, now).atrasados).toBe(1);
    });

    it('handles a mixed batch of statuses and delays', () => {
      const items = [
        item('aguardando_aprovacao_cliente', past),
        item('aguardando_atribuicao_montador', future),
        item('cancelado', past),
      ];

      const summary = computeItemSummary(items, now);

      expect(summary.total).toBe(3);
      expect(summary.aguardandoAprovacao).toBe(1);
      expect(summary.aprovados).toBe(1);
      expect(summary.atrasados).toBe(1);
    });
  });

  describe('computeTotalCustomerValue', () => {
    it('sums the customer amount of every item budget', () => {
      const items = [
        { budget: { customerAmount: 100 } },
        { budget: { customerAmount: 250.5 } },
        { budget: { customerAmount: 0 } },
        {},
      ];

      expect(
        computeTotalCustomerValue(
          items as Parameters<typeof computeTotalCustomerValue>[0],
        ),
      ).toBe(350.5);
    });

    it('returns 0 for an empty list', () => {
      expect(computeTotalCustomerValue([])).toBe(0);
    });
  });
});
