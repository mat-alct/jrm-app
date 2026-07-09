import {
  issueClientSession,
  serializeClientSessionCookie,
  serializeExpiredClientSessionCookie,
  verifyClientSession,
} from '@/services/projects/clientSession';

describe('services/projects/clientSession', () => {
  const secret = 'test-secret-with-enough-entropy';
  const now = new Date('2026-01-01T10:00:00Z');

  it('issues and verifies a 24 hour signed session token', () => {
    const session = issueClientSession('public-123', { secret, now });

    expect(session.expiresAt).toEqual(new Date('2026-01-02T10:00:00Z'));
    expect(
      verifyClientSession(session.token, {
        secret,
        now: new Date('2026-01-02T09:59:59Z'),
      }),
    ).toEqual({
      publicId: 'public-123',
      expiresAt: session.expiresAt.getTime(),
    });
  });

  it('rejects expired sessions', () => {
    const session = issueClientSession('public-123', { secret, now });

    expect(
      verifyClientSession(session.token, {
        secret,
        now: new Date('2026-01-02T10:00:00Z'),
      }),
    ).toBeNull();
  });

  it('rejects invalid signatures and publicId tampering', () => {
    const session = issueClientSession('public-123', { secret, now });
    const [encodedPayload, signature] = session.token.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        publicId: 'public-456',
        expiresAt: session.expiresAt.getTime(),
      }),
    ).toString('base64url');

    expect(
      verifyClientSession(`${encodedPayload}.invalid`, { secret, now }),
    ).toBeNull();
    expect(
      verifyClientSession(`${tamperedPayload}.${signature}`, { secret, now }),
    ).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifyClientSession(undefined, { secret, now })).toBeNull();
    expect(verifyClientSession('missing-signature', { secret, now })).toBeNull();
    expect(verifyClientSession('a.b.c', { secret, now })).toBeNull();
  });

  it('serializes the httpOnly session cookie', () => {
    const session = issueClientSession('public-123', { secret, now });
    const cookie = serializeClientSessionCookie(
      session.token,
      session.expiresAt,
    );

    expect(cookie).toContain('client_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('Expires=Fri, 02 Jan 2026 10:00:00 GMT');
  });

  it('serializes an expired cookie for logout', () => {
    expect(serializeExpiredClientSessionCookie()).toContain(
      'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    );
  });

  // Sem override de `secret`, e o process.env que manda — o caminho que roda
  // em producao e que nenhum teste cobria.
  describe('without an explicit secret override', () => {
    const originalSecret = process.env.CLIENT_ACCESS_SECRET;

    afterEach(() => {
      if (originalSecret === undefined) {
        delete process.env.CLIENT_ACCESS_SECRET;
      } else {
        process.env.CLIENT_ACCESS_SECRET = originalSecret;
      }
    });

    it('falls back to CLIENT_ACCESS_SECRET from the environment', () => {
      process.env.CLIENT_ACCESS_SECRET = 'secret-from-env';

      const session = issueClientSession('public-123', { now });

      expect(verifyClientSession(session.token, { now })).toEqual({
        publicId: 'public-123',
        expiresAt: session.expiresAt.getTime(),
      });
    });

    it('rejects a token signed with a different environment secret', () => {
      process.env.CLIENT_ACCESS_SECRET = 'secret-from-env';
      const session = issueClientSession('public-123', { now });

      process.env.CLIENT_ACCESS_SECRET = 'outro-secret';

      expect(verifyClientSession(session.token, { now })).toBeNull();
    });

    it('throws naming CLIENT_ACCESS_SECRET when it is not configured', () => {
      delete process.env.CLIENT_ACCESS_SECRET;

      expect(() => issueClientSession('public-123', { now })).toThrow(
        /CLIENT_ACCESS_SECRET/,
      );
    });

    it('throws on verify when CLIENT_ACCESS_SECRET is not configured', () => {
      delete process.env.CLIENT_ACCESS_SECRET;

      expect(() => verifyClientSession('payload.signature', { now })).toThrow(
        /CLIENT_ACCESS_SECRET/,
      );
    });

    it('treats a blank CLIENT_ACCESS_SECRET as not configured', () => {
      process.env.CLIENT_ACCESS_SECRET = '';

      expect(() => issueClientSession('public-123', { now })).toThrow(
        /CLIENT_ACCESS_SECRET/,
      );
    });
  });
});
