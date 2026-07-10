import approveAllHandler from '@/pages/api/client-access/approve-all';
import approveItemHandler from '@/pages/api/client-access/approve-item';
import projectHandler from '@/pages/api/client-access/project';
import provisionHandler from '@/pages/api/client-access/provision';
import rejectItemHandler from '@/pages/api/client-access/reject-item';
import requestChangeHandler from '@/pages/api/client-access/request-change';
import verifyHandler from '@/pages/api/client-access/verify';
import { adminDb } from '@/services/firebaseAdmin';
import {
  itemAttachmentsPath,
  itemStatusHistoryPath,
  projectItemPath,
} from '@/services/projects/paths';
import { getSignedReadUrl } from '@/services/projects/storageSignedUrl.server';
import {
  cookieFromResponse,
  internalSessionCookie,
  mockReq,
  mockRes,
  signOutClient,
} from '@/tests/helpers/apiTest';
import { resetEmulator } from '@/tests/helpers/emulator';
import { seedEmulator } from '@/tests/helpers/seedEmulator';

// Unica fronteira mockada nesta suite: a assinatura de URL exige a chave privada da
// service account e nao funciona contra o emulador (PLANO-DE-TESTES.md, secao 14.2).
// Firestore, Storage, sessoes e transicoes de status rodam de verdade.
jest.mock('@/services/projects/storageSignedUrl.server', () => ({
  getSignedReadUrl: jest.fn(async (storagePath: string) =>
    `https://signed.test/${storagePath}?assinatura=fake`,
  ),
}));

const PROJECT_ID = 'seed-project-1';
/** Item em `aguardando_aprovacao_cliente` no seed. */
const PENDING_ITEM_ID = 'seed-item-1';
/** Item em `em_producao` no seed — nao aprovavel pelo cliente. */
const PRODUCTION_ITEM_ID = 'seed-item-2';

async function itemStatus(itemId: string): Promise<string> {
  const snap = await adminDb.doc(projectItemPath(PROJECT_ID, itemId)).get();
  return snap.data()?.status as string;
}

async function statusHistory(itemId: string) {
  const snap = await adminDb.collection(itemStatusHistoryPath(PROJECT_ID, itemId)).get();
  return snap.docs.map(doc => doc.data());
}

/** Provisiona o acesso e devolve o cookie `client_session` valido. */
async function clientSessionCookie(): Promise<string> {
  const internalCookie = await internalSessionCookie();

  const provisionRes = mockRes();
  await provisionHandler(
    mockReq({
      method: 'POST',
      cookie: internalCookie,
      body: { projectId: PROJECT_ID },
    }),
    provisionRes,
  );
  const { publicId, accessCode } = provisionRes.body as {
    publicId: string;
    accessCode: string;
  };

  const verifyRes = mockRes();
  await verifyHandler(
    mockReq({ method: 'POST', body: { publicId, accessCode } }),
    verifyRes,
  );

  const cookie = cookieFromResponse(verifyRes, 'client_session');
  if (!cookie) throw new Error('verify nao devolveu client_session');
  return cookie;
}

describe('api/client-access integration', () => {
  let clientCookie: string;

  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
    clientCookie = await clientSessionCookie();
  });

  afterEach(async () => {
    await signOutClient();
  });

  describe('approve-item', () => {
    it('aprova o item, grava historico com papel client e recalcula o resumo', async () => {
      const res = mockRes();
      await approveItemHandler(
        mockReq({
          method: 'POST',
          cookie: clientCookie,
          body: { itemId: PENDING_ITEM_ID },
        }),
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: true });

      const item = (
        await adminDb.doc(projectItemPath(PROJECT_ID, PENDING_ITEM_ID)).get()
      ).data();
      expect(item).toMatchObject({
        status: 'aguardando_atribuicao_montador',
        clientApprovalStatus: 'aprovado',
        updatedBy: 'client',
      });
      expect(item?.approvedAt).toBeDefined();

      const history = await statusHistory(PENDING_ITEM_ID);
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        fromStatus: 'aguardando_aprovacao_cliente',
        toStatus: 'aguardando_atribuicao_montador',
        changedBy: 'client',
        changedByRole: 'client',
      });

      const project = (await adminDb.doc(`projects/${PROJECT_ID}`).get()).data();
      expect(project?.itemSummary).toMatchObject({
        total: 2,
        aguardandoAprovacao: 0,
        aprovados: 1,
      });
    });

    it('recusa item em status nao aprovavel com 409 e nao grava nada', async () => {
      const res = mockRes();
      await approveItemHandler(
        mockReq({
          method: 'POST',
          cookie: clientCookie,
          body: { itemId: PRODUCTION_ITEM_ID },
        }),
        res,
      );

      expect(res.statusCode).toBe(409);
      expect(await itemStatus(PRODUCTION_ITEM_ID)).toBe('em_producao');
      expect(await statusHistory(PRODUCTION_ITEM_ID)).toHaveLength(0);
    });

    it('exige itemId, sessao valida e metodo POST', async () => {
      const missingItemRes = mockRes();
      await approveItemHandler(
        mockReq({ method: 'POST', cookie: clientCookie, body: {} }),
        missingItemRes,
      );
      expect(missingItemRes.statusCode).toBe(400);

      const noSessionRes = mockRes();
      await approveItemHandler(
        mockReq({ method: 'POST', body: { itemId: PENDING_ITEM_ID } }),
        noSessionRes,
      );
      expect(noSessionRes.statusCode).toBe(401);

      const forgedSessionRes = mockRes();
      await approveItemHandler(
        mockReq({
          method: 'POST',
          cookie: 'client_session=payload.assinatura-invalida',
          body: { itemId: PENDING_ITEM_ID },
        }),
        forgedSessionRes,
      );
      expect(forgedSessionRes.statusCode).toBe(401);

      const wrongMethodRes = mockRes();
      await approveItemHandler(
        mockReq({ method: 'GET', cookie: clientCookie }),
        wrongMethodRes,
      );
      expect(wrongMethodRes.statusCode).toBe(405);

      expect(await itemStatus(PENDING_ITEM_ID)).toBe('aguardando_aprovacao_cliente');
      expect(await statusHistory(PENDING_ITEM_ID)).toHaveLength(0);
    });
  });

  describe('reject-item e request-change', () => {
    it('recusa o item registrando motivo no historico', async () => {
      const res = mockRes();
      await rejectItemHandler(
        mockReq({
          method: 'POST',
          cookie: clientCookie,
          body: { itemId: PENDING_ITEM_ID, note: 'Nao gostei do acabamento' },
        }),
        res,
      );

      expect(res.statusCode).toBe(200);
      const item = (
        await adminDb.doc(projectItemPath(PROJECT_ID, PENDING_ITEM_ID)).get()
      ).data();
      expect(item).toMatchObject({
        status: 'recusado_pelo_cliente',
        clientApprovalStatus: 'recusado',
      });
      expect(item?.rejectedAt).toBeDefined();

      const history = await statusHistory(PENDING_ITEM_ID);
      expect(history[0]).toMatchObject({
        toStatus: 'recusado_pelo_cliente',
        changedByRole: 'client',
        note: 'Nao gostei do acabamento',
      });
    });

    it('solicita alteracao e marca clientApprovalStatus', async () => {
      const res = mockRes();
      await requestChangeHandler(
        mockReq({
          method: 'POST',
          cookie: clientCookie,
          body: { itemId: PENDING_ITEM_ID, note: 'Trocar puxadores' },
        }),
        res,
      );

      expect(res.statusCode).toBe(200);
      const item = (
        await adminDb.doc(projectItemPath(PROJECT_ID, PENDING_ITEM_ID)).get()
      ).data();
      expect(item).toMatchObject({
        status: 'alteracao_solicitada',
        clientApprovalStatus: 'alteracao_solicitada',
      });
      expect(item?.changeRequestedAt).toBeDefined();
    });

    it('nao permite recusar um item ja aprovado pelo cliente', async () => {
      const approveRes = mockRes();
      await approveItemHandler(
        mockReq({
          method: 'POST',
          cookie: clientCookie,
          body: { itemId: PENDING_ITEM_ID },
        }),
        approveRes,
      );
      expect(approveRes.statusCode).toBe(200);

      const rejectRes = mockRes();
      await rejectItemHandler(
        mockReq({
          method: 'POST',
          cookie: clientCookie,
          body: { itemId: PENDING_ITEM_ID },
        }),
        rejectRes,
      );

      expect(rejectRes.statusCode).toBe(409);
      expect(await itemStatus(PENDING_ITEM_ID)).toBe(
        'aguardando_atribuicao_montador',
      );
    });
  });

  describe('approve-all', () => {
    it('aprova apenas os itens pendentes e devolve a contagem', async () => {
      const res = mockRes();
      await approveAllHandler(
        mockReq({ method: 'POST', cookie: clientCookie }),
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: true, approvedCount: 1 });
      expect(await itemStatus(PENDING_ITEM_ID)).toBe(
        'aguardando_atribuicao_montador',
      );
      expect(await itemStatus(PRODUCTION_ITEM_ID)).toBe('em_producao');
    });

    it('exige sessao de cliente e metodo POST', async () => {
      const noSessionRes = mockRes();
      await approveAllHandler(mockReq({ method: 'POST' }), noSessionRes);
      expect(noSessionRes.statusCode).toBe(401);

      const wrongMethodRes = mockRes();
      await approveAllHandler(
        mockReq({ method: 'GET', cookie: clientCookie }),
        wrongMethodRes,
      );
      expect(wrongMethodRes.statusCode).toBe(405);

      expect(await itemStatus(PENDING_ITEM_ID)).toBe('aguardando_aprovacao_cliente');
    });
  });

  describe('project (DTO do portal)', () => {
    beforeEach(async () => {
      jest.mocked(getSignedReadUrl).mockClear();

      const attachments = adminDb.collection(
        itemAttachmentsPath(PROJECT_ID, PENDING_ITEM_ID),
      );
      await attachments.doc('anexo-cliente').set({
        fileName: 'projeto-final.pdf',
        originalFileName: 'projeto-final.pdf',
        mimeType: 'application/pdf',
        visibility: 'client',
        clientVisible: true,
        storagePath: `projects/${PROJECT_ID}/items/${PENDING_ITEM_ID}/desenho/anexo-cliente_projeto-final.pdf`,
      });
      await attachments.doc('anexo-interno').set({
        fileName: 'custos-internos.pdf',
        originalFileName: 'custos-internos.pdf',
        mimeType: 'application/pdf',
        visibility: 'internal',
        storagePath: `projects/${PROJECT_ID}/items/${PENDING_ITEM_ID}/desenho/anexo-interno_custos-internos.pdf`,
      });
    });

    it('devolve somente itens e anexos visiveis ao cliente', async () => {
      const res = mockRes();
      await projectHandler(mockReq({ method: 'GET', cookie: clientCookie }), res);

      expect(res.statusCode).toBe(200);
      const dto = res.body as {
        projectId: string;
        customerName: string;
        items: Array<{
          itemId: string;
          customerAmount?: number;
          attachments: Array<{ fileName: string; url: string }>;
        }>;
      };

      expect(dto.projectId).toBe(PROJECT_ID);
      expect(dto.customerName).toBe('Cliente Seed 1');
      expect(dto.items.map(item => item.itemId).sort()).toEqual([
        PENDING_ITEM_ID,
        PRODUCTION_ITEM_ID,
      ]);

      const pendingItem = dto.items.find(item => item.itemId === PENDING_ITEM_ID)!;
      expect(pendingItem.customerAmount).toBe(1200);

      const fileNames = pendingItem.attachments.map(a => a.fileName);
      expect(fileNames).toEqual(['projeto-final.pdf']);
      expect(fileNames).not.toContain('custos-internos.pdf');

      // O anexo `internal` nao pode nem chegar a ser assinado.
      const signedPaths = jest
        .mocked(getSignedReadUrl)
        .mock.calls.map(([storagePath]) => storagePath);
      expect(signedPaths).toEqual([
        `projects/${PROJECT_ID}/items/${PENDING_ITEM_ID}/desenho/anexo-cliente_projeto-final.pdf`,
      ]);
    });

    it('exige sessao valida e metodo GET', async () => {
      const noSessionRes = mockRes();
      await projectHandler(mockReq({ method: 'GET' }), noSessionRes);
      expect(noSessionRes.statusCode).toBe(401);

      const wrongMethodRes = mockRes();
      await projectHandler(
        mockReq({ method: 'POST', cookie: clientCookie }),
        wrongMethodRes,
      );
      expect(wrongMethodRes.statusCode).toBe(405);
    });
  });
});
