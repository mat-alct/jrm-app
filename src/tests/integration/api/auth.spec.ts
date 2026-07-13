import loginHandler from '@/pages/api/login';
import logoutHandler from '@/pages/api/logout';
import { adminAuth } from '@/services/firebaseAdmin';
import {
  idTokenFor,
  mockReq,
  mockRes,
  signOutClient,
} from '@/tests/helpers/apiTest';
import { resetEmulator } from '@/tests/helpers/emulator';
import { seedEmulator } from '@/tests/helpers/seedEmulator';

function sessionCookieValue(
  headers: Record<string, string | string[]>,
): string {
  const raw = headers['Set-Cookie'];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (value ?? '').split(';')[0].replace('session=', '');
}

describe('api/login e api/logout integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOutClient();
  });

  it('troca um idToken real por um cookie de sessao verificavel pelo Admin SDK', async () => {
    const idToken = await idTokenFor('admin@seed.jrm');

    const res = mockRes();
    await loginHandler(
      mockReq({ method: 'POST', body: { token: idToken } }),
      res,
    );

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      status: true,
      message: 'Logged in successfully.',
    });

    const setCookie = res.headers['Set-Cookie'] as string;
    expect(setCookie).toContain('session=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('Path=/');
    expect(setCookie).toContain('SameSite=Strict');

    const decoded = await adminAuth.verifySessionCookie(
      sessionCookieValue(res.headers),
      true,
    );
    expect(decoded.uid).toBe('seed-admin');
  });

  it('rejeita token ausente com 400 e token invalido com 401', async () => {
    const missingTokenRes = mockRes();
    await loginHandler(mockReq({ method: 'POST', body: {} }), missingTokenRes);
    expect(missingTokenRes.statusCode).toBe(400);
    expect(missingTokenRes.headers['Set-Cookie']).toBeUndefined();

    const invalidTokenRes = mockRes();
    await loginHandler(
      mockReq({ method: 'POST', body: { token: 'nao-e-um-id-token' } }),
      invalidTokenRes,
    );
    expect(invalidTokenRes.statusCode).toBe(401);
    expect(invalidTokenRes.body).toEqual({ error: 'Authentication failed.' });
    expect(invalidTokenRes.headers['Set-Cookie']).toBeUndefined();
  });

  it('recusa metodo diferente de POST no login e no logout', async () => {
    const loginRes = mockRes();
    await loginHandler(mockReq({ method: 'GET' }), loginRes);
    expect(loginRes.statusCode).toBe(405);

    const logoutRes = mockRes();
    logoutHandler(mockReq({ method: 'GET' }), logoutRes);
    expect(logoutRes.statusCode).toBe(405);
  });

  it('logout expira o cookie de sessao', async () => {
    const res = mockRes();
    logoutHandler(mockReq({ method: 'POST' }), res);

    expect(res.statusCode).toBe(200);
    const setCookie = res.headers['Set-Cookie'] as string;
    expect(setCookie).toContain('session=;');
    expect(setCookie).toContain('Max-Age=-1');
  });
});
