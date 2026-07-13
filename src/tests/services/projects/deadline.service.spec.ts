import {
  computeDeadline,
  FALLBACK_DEADLINE_DEFAULTS,
} from '@/services/projects/deadline.service';

describe('services/projects/deadline.service', () => {
  describe('computeDeadline', () => {
    const from = new Date('2026-07-08T12:00:00Z');

    it('adds desenhoDias for aguardando_desenho', () => {
      const deadline = computeDeadline(
        'aguardando_desenho',
        FALLBACK_DEADLINE_DEFAULTS,
        from,
      );

      expect(deadline?.toDate().toISOString().slice(0, 10)).toBe('2026-07-13');
    });

    it('adds producaoDias for em_producao', () => {
      const deadline = computeDeadline(
        'em_producao',
        FALLBACK_DEADLINE_DEFAULTS,
        from,
      );

      expect(deadline?.toDate().toISOString().slice(0, 10)).toBe('2026-07-18');
    });

    it('returns undefined for a status without a configured deadline', () => {
      expect(
        computeDeadline(
          'recusado_pelo_cliente',
          FALLBACK_DEADLINE_DEFAULTS,
          from,
        ),
      ).toBeUndefined();
      expect(
        computeDeadline('finalizado', FALLBACK_DEADLINE_DEFAULTS, from),
      ).toBeUndefined();
    });
  });
});
