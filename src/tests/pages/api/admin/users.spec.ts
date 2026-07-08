import { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/admin/users';
import { adminAuth, adminDb } from '@/services/firebaseAdmin';

jest.mock('@/services/firebaseAdmin', () => ({
  adminAuth: {
    verifySessionCookie: jest.fn(),
    createUser: jest.fn(),
  },
  adminDb: {
    doc: jest.fn(),
  },
}));

const mockedVerifySessionCookie = adminAuth.verifySessionCookie as jest.Mock;
const mockedCreateUser = adminAuth.createUser as jest.Mock;
const mockedDoc = adminDb.doc as jest.Mock;

function mockRes(): NextApiResponse {
  const res: Partial<NextApiResponse> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as NextApiResponse;
}

function mockReq(overrides: Partial<NextApiRequest>): NextApiRequest {
  return {
    method: 'POST',
    cookies: {},
    body: {},
    ...overrides,
  } as NextApiRequest;
}

function mockAdminDoc(data: unknown, exists = true) {
  return {
    get: jest.fn().mockResolvedValue({ exists, data: () => data }),
    set: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue(undefined),
  };
}

describe('pages/api/admin/users', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects methods other than POST/PATCH', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects requests without a session cookie', async () => {
    const req = mockReq({ cookies: {} });
    const res = mockRes();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockedVerifySessionCookie).not.toHaveBeenCalled();
  });

  it('rejects requests from a non-admin user', async () => {
    const req = mockReq({ cookies: { session: 'valid' } });
    const res = mockRes();

    mockedVerifySessionCookie.mockResolvedValue({ uid: 'u1' });
    mockedDoc.mockReturnValue(mockAdminDoc({ roles: ['seller'] }));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects when the session cookie is invalid', async () => {
    const req = mockReq({ cookies: { session: 'bad' } });
    const res = mockRes();

    mockedVerifySessionCookie.mockRejectedValue(new Error('invalid'));

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  describe('POST (create)', () => {
    beforeEach(() => {
      mockedVerifySessionCookie.mockResolvedValue({ uid: 'admin-1' });
    });

    it('validates required fields', async () => {
      mockedDoc.mockReturnValue(mockAdminDoc({ roles: ['admin'] }));
      const req = mockReq({
        cookies: { session: 'valid' },
        body: { name: 'Fulano' },
      });
      const res = mockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(mockedCreateUser).not.toHaveBeenCalled();
    });

    it('creates the user in Auth and Firestore on success', async () => {
      const adminDoc = mockAdminDoc({ roles: ['admin'] });
      const newUserDoc = mockAdminDoc(undefined);
      mockedDoc
        .mockReturnValueOnce(adminDoc)
        .mockReturnValueOnce(newUserDoc);
      mockedCreateUser.mockResolvedValue({ uid: 'new-uid' });

      const req = mockReq({
        cookies: { session: 'valid' },
        body: {
          name: 'Fulano',
          email: 'fulano@example.com',
          password: 'segredo123',
          roles: ['seller'],
        },
      });
      const res = mockRes();

      await handler(req, res);

      expect(mockedCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'fulano@example.com' }),
      );
      expect(newUserDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Fulano', roles: ['seller'] }),
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ id: 'new-uid' });
    });

    it('returns 409 when the e-mail already exists', async () => {
      mockedDoc.mockReturnValue(mockAdminDoc({ roles: ['admin'] }));
      mockedCreateUser.mockRejectedValue({ code: 'auth/email-already-exists' });

      const req = mockReq({
        cookies: { session: 'valid' },
        body: {
          name: 'Fulano',
          email: 'fulano@example.com',
          password: 'segredo123',
          roles: ['seller'],
        },
      });
      const res = mockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
    });
  });

  describe('PATCH (update)', () => {
    beforeEach(() => {
      mockedVerifySessionCookie.mockResolvedValue({ uid: 'admin-1' });
    });

    it('requires an id', async () => {
      mockedDoc.mockReturnValue(mockAdminDoc({ roles: ['admin'] }));
      const req = mockReq({
        method: 'PATCH',
        cookies: { session: 'valid' },
        body: { active: false },
      });
      const res = mockRes();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('updates roles and active flag', async () => {
      const adminDoc = mockAdminDoc({ roles: ['admin'] });
      const targetDoc = mockAdminDoc(undefined);
      mockedDoc.mockReturnValueOnce(adminDoc).mockReturnValueOnce(targetDoc);

      const req = mockReq({
        method: 'PATCH',
        cookies: { session: 'valid' },
        body: { id: 'target-uid', roles: ['designer'], active: false },
      });
      const res = mockRes();

      await handler(req, res);

      expect(targetDoc.update).toHaveBeenCalledWith(
        expect.objectContaining({ roles: ['designer'], active: false }),
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });
});
