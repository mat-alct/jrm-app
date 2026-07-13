import {
  ClientPortalAuthError,
  requireClientProject,
} from '@/services/projects/clientPortal.server';
import { issueClientSession } from '@/services/projects/clientSession';

const mockCollection = jest.fn<unknown, unknown[]>();

// A factory do jest.mock e hoisteada acima do `const`, entao ela nao pode ler
// `mockCollection` no momento em que roda — so quando o codigo sob teste chama.
jest.mock('@/services/firebaseAdmin', () => ({
  adminDb: {
    collection: (...args: unknown[]) => mockCollection(...args),
  },
}));

function mockProjectQuery(
  projects: Array<{ id: string; data: Record<string, unknown> }>,
) {
  const get = jest.fn().mockResolvedValue({
    empty: projects.length === 0,
    docs: projects.map(project => ({
      id: project.id,
      data: () => project.data,
    })),
  });
  const limit = jest.fn(() => ({ get }));
  const where = jest.fn(() => ({ limit }));
  mockCollection.mockReturnValue({ where });

  return { where, limit, get };
}

function requestWithCookie(cookie?: string) {
  return { headers: cookie ? { cookie } : {} } as never;
}

async function expectAuthError(
  promise: Promise<unknown>,
  statusCode: number,
): Promise<void> {
  await expect(promise).rejects.toBeInstanceOf(ClientPortalAuthError);
  await expect(promise).rejects.toMatchObject({ statusCode });
}

describe('services/projects/clientPortal.server', () => {
  const originalSecret = process.env.CLIENT_ACCESS_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_ACCESS_SECRET = 'test-client-secret';
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CLIENT_ACCESS_SECRET;
    } else {
      process.env.CLIENT_ACCESS_SECRET = originalSecret;
    }
  });

  function validCookie(publicId = 'public-1') {
    return `client_session=${issueClientSession(publicId).token}`;
  }

  describe('rejects unauthenticated requests with 401', () => {
    it('when no cookie is sent', async () => {
      await expectAuthError(requireClientProject(requestWithCookie()), 401);
      expect(mockCollection).not.toHaveBeenCalled();
    });

    it('when the session cookie is absent among other cookies', async () => {
      await expectAuthError(
        requireClientProject(requestWithCookie('theme=dark; session=abc')),
        401,
      );
      expect(mockCollection).not.toHaveBeenCalled();
    });

    it('when the token is malformed', async () => {
      await expectAuthError(
        requireClientProject(
          requestWithCookie('client_session=nao-e-um-token'),
        ),
        401,
      );
    });

    it('when the signature does not match the payload', async () => {
      const token = issueClientSession('public-1').token;
      const [payload] = token.split('.');

      await expectAuthError(
        requireClientProject(
          requestWithCookie(`client_session=${payload}.assinatura-falsa`),
        ),
        401,
      );
    });

    it('when the payload is tampered to point at another project', async () => {
      const token = issueClientSession('public-1').token;
      const [, signature] = token.split('.');
      const forged = Buffer.from(
        JSON.stringify({
          publicId: 'public-vitima',
          expiresAt: Date.now() + 60_000,
        }),
      ).toString('base64url');

      await expectAuthError(
        requireClientProject(
          requestWithCookie(`client_session=${forged}.${signature}`),
        ),
        401,
      );
      expect(mockCollection).not.toHaveBeenCalled();
    });

    it('when the session has expired', async () => {
      const token = issueClientSession('public-1', {
        now: new Date(Date.now() - 25 * 60 * 60 * 1000),
      }).token;

      await expectAuthError(
        requireClientProject(requestWithCookie(`client_session=${token}`)),
        401,
      );
    });

    it('when the token was signed with a different secret', async () => {
      const token = issueClientSession('public-1', {
        secret: 'segredo-de-outra-instalacao',
      }).token;

      await expectAuthError(
        requireClientProject(requestWithCookie(`client_session=${token}`)),
        401,
      );
    });
  });

  it('returns 404 when the session is valid but the project is gone', async () => {
    mockProjectQuery([]);

    await expectAuthError(
      requireClientProject(requestWithCookie(validCookie())),
      404,
    );
  });

  it('returns 410 when the client link has expired', async () => {
    mockProjectQuery([
      {
        id: 'project-1',
        data: {
          clientAccessPublicId: 'public-1',
          clientLinkExpiresAt: new Date(Date.now() - 60_000),
        },
      },
    ]);

    await expectAuthError(
      requireClientProject(requestWithCookie(validCookie())),
      410,
    );
  });

  it('resolves the project scoped to the publicId inside the token', async () => {
    const { where } = mockProjectQuery([
      {
        id: 'project-1',
        data: { clientAccessPublicId: 'public-1', name: 'Cozinha' },
      },
    ]);

    const project = await requireClientProject(
      requestWithCookie(validCookie('public-1')),
    );

    expect(project).toMatchObject({ id: 'project-1', name: 'Cozinha' });
    // A consulta precisa filtrar pelo publicId assinado, nunca por algo do request.
    expect(where).toHaveBeenCalledWith(
      'clientAccessPublicId',
      '==',
      'public-1',
    );
  });

  it('does not expire a link that has no expiration set', async () => {
    mockProjectQuery([
      {
        id: 'project-1',
        data: { clientAccessPublicId: 'public-1' },
      },
    ]);

    await expect(
      requireClientProject(requestWithCookie(validCookie())),
    ).resolves.toMatchObject({ id: 'project-1' });
  });
});
