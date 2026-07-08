import handler from '@/pages/api/assembler/confirm-payment';
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
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
}

describe('pages/api/assembler/confirm-payment', () => {
  const paymentUpdate = jest.fn().mockResolvedValue(undefined);
  const assignmentUpdate = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAdminAuth.verifySessionCookie.mockResolvedValue({ uid: 'assembler-1' } as never);
    mockedAdminDb.doc.mockImplementation((path: string) => {
      if (path === 'users/assembler-1') {
        return {
          get: jest.fn().mockResolvedValue({
            id: 'assembler-1',
            exists: true,
            data: () => ({ active: true, roles: ['assembler'] }),
          }),
        } as never;
      }
      if (path === 'payments/payment-1') {
        return {
          id: 'payment-1',
          get: jest.fn().mockResolvedValue({
            id: 'payment-1',
            exists: true,
            data: () => ({
              projectId: 'project-1',
              itemId: 'item-1',
              assignmentId: 'assembler-1',
              assemblerId: 'assembler-1',
              status: 'pago',
            }),
          }),
          update: paymentUpdate,
        } as never;
      }
      if (path === 'projects/project-1/items/item-1/assemblerAssignments/assembler-1') {
        return { update: assignmentUpdate } as never;
      }
      throw new Error(`Unexpected doc ${path}`);
    });
  });

  it('rejects methods other than POST', async () => {
    const res = createResponse();

    await handler({ method: 'GET', headers: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects authenticated users without assembler role', async () => {
    mockedAdminDb.doc.mockImplementation((path: string) => {
      if (path === 'users/assembler-1') {
        return {
          get: jest.fn().mockResolvedValue({
            id: 'assembler-1',
            exists: true,
            data: () => ({ active: true, roles: ['seller'] }),
          }),
        } as never;
      }
      throw new Error(`Unexpected doc ${path}`);
    });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { cookie: 'session=session-token' },
        body: { paymentId: 'payment-1' },
      } as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('rejects payments from another assembler', async () => {
    mockedAdminDb.doc.mockImplementation((path: string) => {
      if (path === 'users/assembler-1') {
        return {
          get: jest.fn().mockResolvedValue({
            id: 'assembler-1',
            exists: true,
            data: () => ({ active: true, roles: ['assembler'] }),
          }),
        } as never;
      }
      if (path === 'payments/payment-1') {
        return {
          id: 'payment-1',
          get: jest.fn().mockResolvedValue({
            id: 'payment-1',
            exists: true,
            data: () => ({ assemblerId: 'assembler-2', status: 'pago' }),
          }),
        } as never;
      }
      throw new Error(`Unexpected doc ${path}`);
    });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { cookie: 'session=session-token' },
        body: { paymentId: 'payment-1' },
      } as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(paymentUpdate).not.toHaveBeenCalled();
  });

  it('confirms the owner assembler payment and assignment', async () => {
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { cookie: 'session=session-token' },
        body: { paymentId: 'payment-1' },
      } as never,
      res as never,
    );

    expect(paymentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'confirmado_pelo_montador' }),
    );
    expect(assignmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ paymentStatus: 'confirmado_pelo_montador' }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
