import handler from '@/pages/api/client-access/verify';
import { hashAccessCode } from '@/services/projects/clientAccess.service';
import { adminDb } from '@/services/firebaseAdmin';

jest.mock('@/services/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(),
  },
}));

const mockedAdminDb = adminDb as jest.Mocked<typeof adminDb>;

function createResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

function mockProjectQuery(projectData: Record<string, unknown>) {
  const update = jest.fn().mockResolvedValue(undefined);
  const get = jest.fn().mockResolvedValue({
    empty: false,
    docs: [
      {
        id: 'project-1',
        data: () => projectData,
        ref: { update },
      },
    ],
  });
  const limit = jest.fn(() => ({ get }));
  const where = jest.fn(() => ({ limit }));
  mockedAdminDb.collection.mockReturnValue({ where } as never);

  return { update, where, limit, get };
}

describe('pages/api/client-access/verify', () => {
  let warnSpy: jest.SpyInstance;
  const originalSecret = process.env.CLIENT_ACCESS_SECRET;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_ACCESS_SECRET = 'test-client-secret';
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
    if (originalSecret === undefined) {
      delete process.env.CLIENT_ACCESS_SECRET;
    } else {
      process.env.CLIENT_ACCESS_SECRET = originalSecret;
    }
  });

  it('rejects methods other than POST', async () => {
    const res = createResponse();

    await handler({ method: 'GET', headers: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects missing credentials', async () => {
    const res = createResponse();

    await handler({ method: 'POST', headers: {}, body: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('returns unauthorized when the public id is not found', async () => {
    const get = jest.fn().mockResolvedValue({ empty: true, docs: [] });
    const limit = jest.fn(() => ({ get }));
    const where = jest.fn(() => ({ limit }));
    mockedAdminDb.collection.mockReturnValue({ where } as never);
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: {},
        body: { publicId: 'public-1', accessCode: 'ABC234' },
      } as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('increments attempts and rejects a wrong access code', async () => {
    const { update } = mockProjectQuery({
      clientAccessPublicId: 'public-1',
      clientAccessCodeHash: hashAccessCode('ABC234'),
      clientAccessAttempts: 3,
    });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: {},
        body: { publicId: 'public-1', accessCode: 'ABC235' },
      } as never,
      res as never,
    );

    expect(update).toHaveBeenCalledWith({
      clientAccessAttempts: 4,
      clientAccessLockUntil: null,
    });
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('issues a session cookie and resets attempts for a valid access code', async () => {
    const { update } = mockProjectQuery({
      clientAccessPublicId: 'public-1',
      clientAccessCodeHash: hashAccessCode('ABC234'),
      clientAccessAttempts: 2,
    });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: {},
        body: { publicId: 'public-1', accessCode: 'ABC234' },
      } as never,
      res as never,
    );

    expect(update).toHaveBeenCalledWith({
      clientAccessAttempts: 0,
      clientAccessLockUntil: null,
    });
    expect(res.setHeader).toHaveBeenCalledWith(
      'Set-Cookie',
      expect.stringContaining('client_session='),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  // Regressao: com CLIENT_ACCESS_SECRET ausente, uma senha correta derrubava o
  // request com 500 depois de ja ter zerado as tentativas do projeto.
  describe('when CLIENT_ACCESS_SECRET is not configured', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
      delete process.env.CLIENT_ACCESS_SECRET;
      errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => undefined);
    });

    afterEach(() => {
      errorSpy.mockRestore();
    });

    it('fails with 500, issues no cookie and leaves the project untouched', async () => {
      const { update } = mockProjectQuery({
        clientAccessPublicId: 'public-1',
        clientAccessCodeHash: hashAccessCode('ABC234'),
        clientAccessAttempts: 2,
      });
      const res = createResponse();

      await handler(
        {
          method: 'POST',
          headers: {},
          body: { publicId: 'public-1', accessCode: 'ABC234' },
        } as never,
        res as never,
      );

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(update).not.toHaveBeenCalled();

      const [label, logged] = errorSpy.mock.calls[0] as [string, Error];
      expect(label).toBe('Client access verify error:');
      expect(logged.message).toContain('CLIENT_ACCESS_SECRET');
    });
  });
});
