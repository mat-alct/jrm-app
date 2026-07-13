import handler from '@/pages/api/assembler/update-status';
import { adminAuth, adminDb } from '@/services/firebaseAdmin';

jest.mock('@/services/firebaseAdmin', () => ({
  adminAuth: {
    verifySessionCookie: jest.fn(),
  },
  adminDb: {
    doc: jest.fn(),
    collection: jest.fn(),
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

describe('pages/api/assembler/update-status', () => {
  const itemUpdate = jest.fn().mockResolvedValue(undefined);
  const assignmentUpdate = jest.fn().mockResolvedValue(undefined);
  const projectUpdate = jest.fn().mockResolvedValue(undefined);
  const historySet = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAdminAuth.verifySessionCookie.mockResolvedValue({
      uid: 'assembler-1',
    } as never);
    mockedAdminDb.doc.mockImplementation((path: string) => {
      if (path === 'users/assembler-1') {
        return {
          id: 'assembler-1',
          get: jest.fn().mockResolvedValue({
            id: 'assembler-1',
            exists: true,
            data: () => ({ active: true, roles: ['assembler'] }),
          }),
        } as never;
      }
      if (
        path ===
        'projects/project-1/items/item-1/assemblerAssignments/assembler-1'
      ) {
        return {
          get: jest.fn().mockResolvedValue({ exists: true }),
          update: assignmentUpdate,
        } as never;
      }
      if (path === 'projects/project-1/items/item-1') {
        return {
          id: 'item-1',
          get: jest.fn().mockResolvedValue({
            id: 'item-1',
            exists: true,
            data: () => ({ status: 'aguardando_atribuicao_montador' }),
          }),
          update: itemUpdate,
        } as never;
      }
      if (path === 'projects/project-1') {
        return { update: projectUpdate } as never;
      }
      throw new Error(`Unexpected doc ${path}`);
    });

    mockedAdminDb.collection.mockImplementation((path: string) => {
      if (path === 'projects/project-1/items/item-1/statusHistory') {
        return {
          doc: jest.fn(() => ({ id: 'history-1', set: historySet })),
        } as never;
      }
      if (path === 'projects/project-1/items') {
        return {
          get: jest.fn().mockResolvedValue({
            docs: [{ data: () => ({ status: 'em_producao' }) }],
          }),
        } as never;
      }
      throw new Error(`Unexpected collection ${path}`);
    });
  });

  it('rejects methods other than POST', async () => {
    const res = createResponse();

    await handler({ method: 'GET', headers: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('requires the item to be assigned to the authenticated assembler', async () => {
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
      if (
        path ===
        'projects/project-1/items/item-1/assemblerAssignments/assembler-1'
      ) {
        return {
          get: jest.fn().mockResolvedValue({ exists: false }),
        } as never;
      }
      throw new Error(`Unexpected doc ${path}`);
    });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { cookie: 'session=session-token' },
        body: {
          projectId: 'project-1',
          itemId: 'item-1',
          nextStatus: 'em_producao',
        },
      } as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(403);
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
        body: {
          projectId: 'project-1',
          itemId: 'item-1',
          nextStatus: 'em_producao',
        },
      } as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('updates item, assignment and history for a valid assembler transition', async () => {
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: { cookie: 'session=session-token' },
        body: {
          projectId: 'project-1',
          itemId: 'item-1',
          nextStatus: 'em_producao',
        },
      } as never,
      res as never,
    );

    expect(itemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'em_producao',
        updatedBy: 'assembler-1',
      }),
    );
    expect(assignmentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ itemStatus: 'em_producao' }),
    );
    expect(historySet).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStatus: 'aguardando_atribuicao_montador',
        toStatus: 'em_producao',
        changedByRole: 'assembler',
      }),
    );
    expect(projectUpdate).toHaveBeenCalledWith({
      itemSummary: expect.objectContaining({ total: 1, emProducao: 1 }),
    });
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
