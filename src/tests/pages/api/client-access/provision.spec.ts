import handler from '@/pages/api/client-access/provision';
import { adminAuth, adminDb } from '@/services/firebaseAdmin';

jest.mock('@/services/firebaseAdmin', () => ({
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
  adminDb: {
    doc: jest.fn(),
  },
}));

const mockedAdminAuth = adminAuth as jest.Mocked<typeof adminAuth>;
const mockedAdminDb = adminDb as jest.Mocked<typeof adminDb>;

function createResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('pages/api/client-access/provision', () => {
  const userRef = {
    id: 'user-1',
    exists: true,
    data: () => ({ active: true, roles: ['seller'] }),
  };
  const projectUpdate = jest.fn();
  const projectRef = {
    get: jest.fn(),
    update: projectUpdate,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAdminAuth.verifySessionCookie.mockResolvedValue({
      uid: 'user-1',
    } as never);
    mockedAdminDb.doc.mockImplementation((path: string) => {
      if (path === 'users/user-1') {
        return { get: jest.fn().mockResolvedValue(userRef) } as never;
      }
      if (path === 'projects/project-1') {
        return projectRef as never;
      }
      throw new Error(`Unexpected path ${path}`);
    });
    projectRef.get.mockResolvedValue({ exists: true });
    projectUpdate.mockResolvedValue(undefined);
  });

  it('rejects methods other than POST', async () => {
    const res = createResponse();

    await handler({ method: 'GET', headers: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('requires an internal session cookie', async () => {
    const res = createResponse();

    await handler(
      { method: 'POST', headers: {}, body: { projectId: 'project-1' } } as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('rejects internal users without admin or seller role', async () => {
    mockedAdminDb.doc.mockImplementation((path: string) => {
      if (path === 'users/user-1') {
        return {
          get: jest.fn().mockResolvedValue({
            ...userRef,
            data: () => ({ active: true, roles: ['designer'] }),
          }),
        } as never;
      }
      return projectRef as never;
    });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { cookie: 'session=session-token' },
        body: { projectId: 'project-1' },
      } as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('stores regenerated credentials and returns the plain code once', async () => {
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { cookie: 'session=session-token' },
        body: { projectId: 'project-1' },
      } as never,
      res as never,
    );

    expect(projectUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientAccessPublicId: expect.stringMatching(/^[0-9A-Za-z]{12}$/),
        clientAccessCodeHash: expect.stringMatching(/^scrypt:/),
        clientAccessAttempts: 0,
        clientAccessLockUntil: null,
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        publicId: expect.stringMatching(/^[0-9A-Za-z]{12}$/),
        accessCode: expect.stringMatching(/^[2-9A-HJ-NP-Z]{6}$/),
      }),
    );
  });
});
