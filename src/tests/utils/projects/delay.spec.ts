import { Timestamp } from 'firebase/firestore';

import { isDelayed } from '@/utils/projects/delay';

describe('utils/projects/delay', () => {
  const now = new Date('2026-07-08T12:00:00Z');

  it('is not delayed when there is no deadline', () => {
    expect(
      isDelayed({ deadlineCurrent: undefined, status: 'em_producao' }, now),
    ).toBe(false);
  });

  it('is delayed when the deadline is in the past and status is not final', () => {
    const deadlineCurrent = Timestamp.fromDate(
      new Date('2026-07-01T12:00:00Z'),
    );

    expect(isDelayed({ deadlineCurrent, status: 'em_producao' }, now)).toBe(
      true,
    );
  });

  it('is not delayed when the deadline is in the future', () => {
    const deadlineCurrent = Timestamp.fromDate(
      new Date('2026-08-01T12:00:00Z'),
    );

    expect(isDelayed({ deadlineCurrent, status: 'em_producao' }, now)).toBe(
      false,
    );
  });

  it('is not delayed when the item is already final, even past the deadline', () => {
    const deadlineCurrent = Timestamp.fromDate(
      new Date('2026-07-01T12:00:00Z'),
    );

    expect(isDelayed({ deadlineCurrent, status: 'finalizado' }, now)).toBe(
      false,
    );
    expect(isDelayed({ deadlineCurrent, status: 'cancelado' }, now)).toBe(
      false,
    );
  });
});
