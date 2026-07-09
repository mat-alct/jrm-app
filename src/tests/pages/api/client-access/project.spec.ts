import handler from '@/pages/api/client-access/project';
import { adminDb, adminStorage } from '@/services/firebaseAdmin';
import { issueClientSession } from '@/services/projects/clientSession';

jest.mock('@/services/firebaseAdmin', () => ({
  adminDb: {
    collection: jest.fn(),
  },
  adminStorage: {
    bucket: jest.fn(),
  },
}));

const mockedAdminDb = adminDb as jest.Mocked<typeof adminDb>;
const mockedAdminStorage = adminStorage as jest.Mocked<typeof adminStorage>;

function createResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

function docs(items: Array<{ id: string; data: Record<string, unknown> }>) {
  return {
    empty: items.length === 0,
    docs: items.map(item => ({
      id: item.id,
      data: () => item.data,
    })),
  };
}

describe('pages/api/client-access/project', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.CLIENT_ACCESS_SECRET = 'test-client-secret';
    mockedAdminStorage.bucket.mockReturnValue({
      file: jest.fn(() => ({
        getSignedUrl: jest.fn().mockResolvedValue(['https://signed.test/file']),
      })),
    } as never);
  });

  it('rejects methods other than GET', async () => {
    const res = createResponse();

    await handler({ method: 'POST', headers: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('requires a valid client session cookie', async () => {
    const res = createResponse();

    await handler({ method: 'GET', headers: {} } as never, res as never);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns a safe client DTO with signed URLs only for client-visible attachments', async () => {
    const session = issueClientSession('public-1', {
      secret: 'test-client-secret',
      now: new Date('2026-07-08T10:00:00Z'),
    });

    const getProjects = jest.fn().mockResolvedValue(
      docs([
        {
          id: 'project-1',
          data: {
            customerName: 'Cliente Teste',
            customerPhone: '11999999999',
            clientAccessPublicId: 'public-1',
            assemblerAssignments: [{ amountToReceive: 100 }],
            payments: [{ amount: 100 }],
          },
        },
      ]),
    );
    const limit = jest.fn(() => ({ get: getProjects }));
    const where = jest.fn(() => ({ limit }));

    mockedAdminDb.collection.mockImplementation((path: string) => {
      if (path === 'projects') {
        return { where } as never;
      }
      if (path === 'projects/project-1/items') {
        return {
          get: jest.fn().mockResolvedValue(
            docs([
              {
                id: 'item-1',
                data: {
                  name: 'Armario',
                  environment: 'Quarto',
                  budget: {
                    lines: [{ id: '0', description: 'Material', amount: 800 }],
                    totalCost: 800,
                    customerAmount: 1200,
                    suggestedAssemblerAmount: 400,
                  },
                  amountToReceive: 400,
                  assemblerAssignments: [{ amountToReceive: 400 }],
                  payments: [{ amount: 400 }],
                  designerId: 'designer-1',
                  currentVersionId: 'version-new',
                  versions: [{ id: 'version-old' }],
                  clientApprovalStatus: 'aguardando',
                  status: 'aguardando_aprovacao_cliente',
                },
              },
            ]),
          ),
        } as never;
      }
      if (path === 'projects/project-1/items/item-1/attachments') {
        return {
          get: jest.fn().mockResolvedValue(
            docs([
              {
                id: 'attachment-client',
                data: {
                  originalFileName: 'projeto.pdf',
                  fileName: 'projeto.pdf',
                  mimeType: 'application/pdf',
                  storagePath: 'projects/project-1/items/item-1/projeto.pdf',
                  visibility: 'client',
                  clientVisible: true,
                },
              },
              {
                id: 'attachment-internal',
                data: {
                  originalFileName: 'interno.pdf',
                  fileName: 'interno.pdf',
                  mimeType: 'application/pdf',
                  storagePath: 'internal.pdf',
                  visibility: 'internal',
                  clientVisible: false,
                },
              },
            ]),
          ),
        } as never;
      }
      throw new Error(`Unexpected collection ${path}`);
    });
    const res = createResponse();

    await handler(
      {
        method: 'GET',
        headers: { cookie: `client_session=${session.token}` },
      } as never,
      res as never,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    const dto = (res.json as jest.Mock).mock.calls[0][0];
    expect(dto).toEqual({
      projectId: 'project-1',
      customerName: 'Cliente Teste',
      sellerContactPhone: undefined,
      expiresAt: undefined,
      items: [
        {
          itemId: 'item-1',
          name: 'Armario',
          environment: 'Quarto',
          customerAmount: 1200,
          approvalStatus: 'aguardando',
          clientStatusLabel: 'Aguardando sua aprovação',
          estimatedDeliveryDate: undefined,
          attachments: [
            {
              fileName: 'projeto.pdf',
              mimeType: 'application/pdf',
              url: 'https://signed.test/file',
            },
          ],
        },
      ],
    });
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain('amountToReceive');
    expect(serialized).not.toContain('assemblerAssignments');
    expect(serialized).not.toContain('payments');
    expect(serialized).not.toContain('designerId');
    expect(serialized).not.toContain('version-old');
    expect(serialized).not.toContain('version-new');
    expect(serialized).not.toContain('interno.pdf');
    expect(serialized).not.toContain('totalCost');
    expect(serialized).not.toContain('suggestedAssemblerAmount');
    expect(serialized).not.toContain('"lines"');
    expect(serialized).not.toContain('Material');
  });
});
