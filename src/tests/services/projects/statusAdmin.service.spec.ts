import { adminDb } from '@/services/firebaseAdmin';
import {
  applyClientItemTransition,
  approveAllClientItems,
} from '@/services/projects/statusAdmin.service';

jest.mock('@/services/firebaseAdmin', () => ({
  adminDb: {
    doc: jest.fn(),
    collection: jest.fn(),
  },
}));

const mockedAdminDb = adminDb as jest.Mocked<typeof adminDb>;

function itemSnap(data: Record<string, unknown>, id = 'item-1') {
  return {
    id,
    exists: true,
    data: () => data,
  };
}

describe('services/projects/statusAdmin.service', () => {
  const itemUpdate = jest.fn();
  const projectUpdate = jest.fn();
  const historySet = jest.fn();
  const historyDoc = jest.fn(() => ({ id: 'history-1', set: historySet }));

  beforeEach(() => {
    jest.clearAllMocks();
    itemUpdate.mockResolvedValue(undefined);
    projectUpdate.mockResolvedValue(undefined);
    historySet.mockResolvedValue(undefined);

    mockedAdminDb.doc.mockImplementation((path: string) => {
      if (path === 'projects/project-1/items/item-1') {
        return {
          get: jest.fn().mockResolvedValue(
            itemSnap({
              status: 'aguardando_aprovacao_cliente',
              clientApprovalStatus: 'aguardando',
            }),
          ),
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
        return { doc: historyDoc } as never;
      }
      if (path === 'projects/project-1/items') {
        return {
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: 'item-1',
                data: () => ({ status: 'aguardando_atribuicao_montador' }),
              },
            ],
          }),
        } as never;
      }
      throw new Error(`Unexpected collection ${path}`);
    });
  });

  it('applies a client approval, records history and recalculates summary', async () => {
    await applyClientItemTransition('project-1', 'item-1', 'aguardando_atribuicao_montador');

    expect(itemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'aguardando_atribuicao_montador',
        clientApprovalStatus: 'aprovado',
        updatedBy: 'client',
        approvedAt: expect.anything(),
      }),
    );
    expect(historySet).toHaveBeenCalledWith(
      expect.objectContaining({
        fromStatus: 'aguardando_aprovacao_cliente',
        toStatus: 'aguardando_atribuicao_montador',
        changedByRole: 'client',
      }),
    );
    expect(projectUpdate).toHaveBeenCalledWith({
      itemSummary: expect.objectContaining({ total: 1, aprovados: 1 }),
    });
  });

  it('rejects refusal or change requests for an already approved item', async () => {
    mockedAdminDb.doc.mockImplementation((path: string) => {
      if (path === 'projects/project-1/items/item-1') {
        return {
          get: jest.fn().mockResolvedValue(
            itemSnap({
              status: 'aguardando_atribuicao_montador',
              clientApprovalStatus: 'aprovado',
            }),
          ),
          update: itemUpdate,
        } as never;
      }
      return { update: projectUpdate } as never;
    });

    await expect(
      applyClientItemTransition(
        'project-1',
        'item-1',
        'alteracao_solicitada',
      ),
    ).rejects.toMatchObject({ statusCode: 409 });

    expect(itemUpdate).not.toHaveBeenCalled();
  });

  it('approve all only touches items waiting for client approval', async () => {
    const secondItemUpdate = jest.fn().mockResolvedValue(undefined);
    mockedAdminDb.doc.mockImplementation((path: string) => {
      if (path === 'projects/project-1/items/item-1') {
        return {
          get: jest.fn().mockResolvedValue(
            itemSnap(
              {
                status: 'aguardando_aprovacao_cliente',
                clientApprovalStatus: 'aguardando',
              },
              'item-1',
            ),
          ),
          update: itemUpdate,
        } as never;
      }
      if (path === 'projects/project-1/items/item-2') {
        return {
          get: jest.fn().mockResolvedValue(
            itemSnap(
              {
                status: 'aguardando_aprovacao_cliente',
                clientApprovalStatus: 'aguardando',
              },
              'item-2',
            ),
          ),
          update: secondItemUpdate,
        } as never;
      }
      if (path === 'projects/project-1') {
        return { update: projectUpdate } as never;
      }
      throw new Error(`Unexpected doc ${path}`);
    });
    mockedAdminDb.collection.mockImplementation((path: string) => {
      if (path.endsWith('/statusHistory')) {
        return { doc: historyDoc } as never;
      }
      if (path === 'projects/project-1/items') {
        return {
          get: jest.fn().mockResolvedValue({
            docs: [
              {
                id: 'item-1',
                data: () => ({ status: 'aguardando_aprovacao_cliente' }),
              },
              {
                id: 'item-2',
                data: () => ({ status: 'aguardando_aprovacao_cliente' }),
              },
              {
                id: 'item-3',
                data: () => ({ status: 'em_producao' }),
              },
            ],
          }),
        } as never;
      }
      throw new Error(`Unexpected collection ${path}`);
    });

    await expect(approveAllClientItems('project-1')).resolves.toBe(2);

    expect(itemUpdate).toHaveBeenCalled();
    expect(secondItemUpdate).toHaveBeenCalled();
  });
});
