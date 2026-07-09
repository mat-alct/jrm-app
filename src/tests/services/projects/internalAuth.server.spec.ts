import {
  ApiAuthError,
  requireInternalUser,
} from '@/services/projects/internalAuth.server';
import { UserRole } from '@/types/projects';

const mockVerifySessionCookie = jest.fn<Promise<unknown>, unknown[]>();
const mockDoc = jest.fn<unknown, unknown[]>();

// A factory do jest.mock e hoisteada acima dos `const`, entao ela nao pode ler
// os mocks no momento em que roda — so quando o codigo sob teste os chama.
jest.mock('@/services/firebaseAdmin', () => ({
  adminAuth: {
    verifySessionCookie: (...args: unknown[]) =>
      mockVerifySessionCookie(...args),
  },
  adminDb: {
    doc: (...args: unknown[]) => mockDoc(...args),
  },
}));

function mockUserDoc(data: Record<string, unknown> | null) {
  const get = jest.fn().mockResolvedValue({
    exists: data !== null,
    id: 'user-1',
    data: () => data,
  });
  mockDoc.mockReturnValue({ get });
  return { get };
}

function requestWithCookie(cookie?: string) {
  return { headers: cookie ? { cookie } : {} } as never;
}

async function expectAuthError(
  promise: Promise<unknown>,
  statusCode: number,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(ApiAuthError);
  await expect(promise).rejects.toMatchObject({ statusCode });
}

const ADMIN_ONLY: UserRole[] = ['admin'];

describe('services/projects/internalAuth.server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockVerifySessionCookie.mockResolvedValue({ uid: 'uid-1' });
  });

  it('rejects a request with no session cookie', async () => {
    await expectAuthError(
      requireInternalUser(requestWithCookie(), ADMIN_ONLY),
      401,
    );
    expect(mockVerifySessionCookie).not.toHaveBeenCalled();
  });

  it('does not accept the client portal cookie as an internal session', async () => {
    await expectAuthError(
      requireInternalUser(requestWithCookie('client_session=abc'), ADMIN_ONLY),
      401,
    );
    expect(mockVerifySessionCookie).not.toHaveBeenCalled();
  });

  it('rejects a session cookie that firebase refuses', async () => {
    mockVerifySessionCookie.mockRejectedValue(new Error('cookie invalido'));

    await expectAuthError(
      requireInternalUser(requestWithCookie('session=abc'), ADMIN_ONLY),
      401,
    );
  });

  it('checks the session cookie for revocation', async () => {
    mockUserDoc({ active: true, roles: ['admin'] });

    await requireInternalUser(requestWithCookie('session=abc'), ADMIN_ONLY);

    expect(mockVerifySessionCookie).toHaveBeenCalledWith('abc', true);
  });

  it('rejects an authenticated uid with no user profile', async () => {
    mockUserDoc(null);

    await expectAuthError(
      requireInternalUser(requestWithCookie('session=abc'), ADMIN_ONLY),
      403,
    );
  });

  it('rejects a deactivated user even when the role matches', async () => {
    mockUserDoc({ active: false, roles: ['admin'] });

    await expectAuthError(
      requireInternalUser(requestWithCookie('session=abc'), ADMIN_ONLY),
      403,
    );
  });

  it('rejects an active user whose roles are not allowed', async () => {
    mockUserDoc({ active: true, roles: ['assembler', 'designer'] });

    await expectAuthError(
      requireInternalUser(requestWithCookie('session=abc'), ADMIN_ONLY),
      403,
    );
  });

  it('rejects an active user with an empty role list', async () => {
    mockUserDoc({ active: true, roles: [] });

    await expectAuthError(
      requireInternalUser(requestWithCookie('session=abc'), ADMIN_ONLY),
      403,
    );
  });

  it('accepts a user holding any one of the allowed roles', async () => {
    mockUserDoc({ active: true, roles: ['designer', 'admin'] });

    const user = await requireInternalUser(requestWithCookie('session=abc'), [
      'admin',
      'seller',
    ]);

    expect(user).toMatchObject({ uid: 'uid-1', id: 'user-1', active: true });
  });

  it('looks the profile up by the uid from the verified cookie', async () => {
    mockVerifySessionCookie.mockResolvedValue({ uid: 'uid-do-token' });
    mockUserDoc({ active: true, roles: ['admin'] });

    await requireInternalUser(requestWithCookie('session=abc'), ADMIN_ONLY);

    expect(mockDoc).toHaveBeenCalledWith('users/uid-do-token');
  });
});
