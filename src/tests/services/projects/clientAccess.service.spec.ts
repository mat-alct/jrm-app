import { Timestamp } from 'firebase/firestore';

import {
  generateClientCredentials,
  hashAccessCode,
  isClientAccessLocked,
  isLinkExpired,
  registerFailedClientAccessAttempt,
  resetClientAccessAttempts,
  verifyAccessCode,
} from '@/services/projects/clientAccess.service';

describe('services/projects/clientAccess.service', () => {
  it('generates URL-safe public ids and readable short access codes', () => {
    const credentials = generateClientCredentials();

    expect(credentials.publicId).toMatch(/^[0-9A-Za-z]{12}$/);
    expect(credentials.accessCode).toMatch(/^[2-9A-HJ-NP-Z]{6}$/);
  });

  it('hashes access codes with a per-record salt and verifies the correct code', () => {
    const firstHash = hashAccessCode('ABC234');
    const secondHash = hashAccessCode('ABC234');

    expect(firstHash).toMatch(/^scrypt:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
    expect(secondHash).not.toBe(firstHash);
    expect(verifyAccessCode('ABC234', firstHash)).toBe(true);
    expect(verifyAccessCode('ABC235', firstHash)).toBe(false);
  });

  it('rejects malformed or tampered hashes', () => {
    const hash = hashAccessCode('ABC234');
    const tampered = `${hash.slice(0, -2)}xx`;

    expect(verifyAccessCode('ABC234', 'invalid')).toBe(false);
    expect(verifyAccessCode('ABC234', tampered)).toBe(false);
  });

  it('expires the client link using the explicit expiration date when available', () => {
    const expiresAt = Timestamp.fromDate(new Date('2026-02-01T12:00:00Z'));

    expect(
      isLinkExpired(
        { clientLinkExpiresAt: expiresAt, completedAt: undefined },
        new Date('2026-02-01T11:59:59Z'),
      ),
    ).toBe(false);
    expect(
      isLinkExpired(
        { clientLinkExpiresAt: expiresAt, completedAt: undefined },
        new Date('2026-02-01T12:00:01Z'),
      ),
    ).toBe(true);
  });

  it('falls back to one month after completedAt and keeps unfinished projects active', () => {
    const completedAt = Timestamp.fromDate(new Date('2026-01-10T00:00:00Z'));

    expect(
      isLinkExpired(
        { completedAt, clientLinkExpiresAt: undefined },
        new Date('2026-02-09T23:59:59Z'),
      ),
    ).toBe(false);
    expect(
      isLinkExpired(
        { completedAt, clientLinkExpiresAt: undefined },
        new Date('2026-02-11T00:00:00Z'),
      ),
    ).toBe(true);
    expect(
      isLinkExpired(
        { completedAt: undefined, clientLinkExpiresAt: undefined },
        new Date('2026-02-11T00:00:00Z'),
      ),
    ).toBe(false);
  });

  it('locks access on the fifth consecutive failed attempt for fifteen minutes', () => {
    const now = new Date('2026-01-01T10:00:00Z');

    const fourthAttempt = registerFailedClientAccessAttempt(
      { clientAccessAttempts: 3, clientAccessLockUntil: undefined },
      now,
    );
    expect(fourthAttempt.clientAccessAttempts).toBe(4);
    expect(fourthAttempt.clientAccessLockUntil).toBeNull();

    const fifthAttempt = registerFailedClientAccessAttempt(
      { clientAccessAttempts: 4, clientAccessLockUntil: undefined },
      now,
    );
    expect(fifthAttempt.clientAccessAttempts).toBe(5);
    expect(fifthAttempt.clientAccessLockUntil).toBeDefined();
    expect(fifthAttempt.clientAccessLockUntil?.toDate()).toEqual(
      new Date('2026-01-01T10:15:00Z'),
    );
    expect(
      isClientAccessLocked(
        { clientAccessLockUntil: fifthAttempt.clientAccessLockUntil! },
        new Date('2026-01-01T10:14:59Z'),
      ),
    ).toBe(true);
  });

  it('starts a new attempt counter after an expired lockout', () => {
    const update = registerFailedClientAccessAttempt(
      {
        clientAccessAttempts: 5,
        clientAccessLockUntil: Timestamp.fromDate(
          new Date('2026-01-01T10:15:00Z'),
        ),
      },
      new Date('2026-01-01T10:16:00Z'),
    );

    expect(update).toEqual({
      clientAccessAttempts: 1,
      clientAccessLockUntil: null,
    });
  });

  it('resets failed attempts after successful verification', () => {
    expect(resetClientAccessAttempts()).toEqual({
      clientAccessAttempts: 0,
      clientAccessLockUntil: null,
    });
  });
});
