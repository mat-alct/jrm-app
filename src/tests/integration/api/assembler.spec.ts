import { Timestamp } from 'firebase-admin/firestore';

import confirmPaymentHandler from '@/pages/api/assembler/confirm-payment';
import updateStatusHandler from '@/pages/api/assembler/update-status';
import { adminDb } from '@/services/firebaseAdmin';
import {
  itemAssemblerAssignmentPath,
  itemStatusHistoryPath,
  paymentPath,
  projectItemPath,
} from '@/services/projects/paths';
import {
  internalSessionCookie,
  mockReq,
  mockRes,
  signOutClient,
} from '@/tests/helpers/apiTest';
import { resetEmulator } from '@/tests/helpers/emulator';
import { seedEmulator } from '@/tests/helpers/seedEmulator';

const PROJECT_ID = 'seed-project-1';
/** Item `em_producao` com `assemblerAssignments/seed-assembler` no seed. */
const ASSIGNED_ITEM_ID = 'seed-item-2';
/** Item sem atribuicao de montador no seed. */
const UNASSIGNED_ITEM_ID = 'seed-item-1';

async function assemblerCookie(): Promise<string> {
  return internalSessionCookie('montador@seed.jrm');
}

async function itemData(itemId: string) {
  return (await adminDb.doc(projectItemPath(PROJECT_ID, itemId)).get()).data();
}

async function seedPayment(
  paymentId: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const now = Timestamp.now();
  await adminDb.doc(paymentPath(paymentId)).set({
    projectId: PROJECT_ID,
    itemId: ASSIGNED_ITEM_ID,
    assignmentId: 'seed-assembler',
    assemblerId: 'seed-assembler',
    amount: 250,
    status: 'pago',
    paidAt: now,
    paidBy: 'seed-admin',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
  await adminDb
    .doc(itemAssemblerAssignmentPath(PROJECT_ID, ASSIGNED_ITEM_ID, 'seed-assembler'))
    .update({ paymentStatus: 'pago', paymentId });
}

describe('api/assembler integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOutClient();
  });

  describe('update-status', () => {
    it('avanca o item atribuido, grava historico e recalcula o resumo', async () => {
      const cookie = await assemblerCookie();

      const readyRes = mockRes();
      await updateStatusHandler(
        mockReq({
          method: 'POST',
          cookie,
          body: {
            projectId: PROJECT_ID,
            itemId: ASSIGNED_ITEM_ID,
            nextStatus: 'pronto_para_montagem',
          },
        }),
        readyRes,
      );
      expect(readyRes.statusCode).toBe(200);

      const doneRes = mockRes();
      await updateStatusHandler(
        mockReq({
          method: 'POST',
          cookie,
          body: {
            projectId: PROJECT_ID,
            itemId: ASSIGNED_ITEM_ID,
            nextStatus: 'montagem_concluida',
          },
        }),
        doneRes,
      );
      expect(doneRes.statusCode).toBe(200);

      const item = await itemData(ASSIGNED_ITEM_ID);
      expect(item).toMatchObject({
        status: 'montagem_concluida',
        updatedBy: 'seed-assembler',
      });
      expect(item?.completedAt).toBeDefined();

      const assignment = (
        await adminDb
          .doc(
            itemAssemblerAssignmentPath(PROJECT_ID, ASSIGNED_ITEM_ID, 'seed-assembler'),
          )
          .get()
      ).data();
      expect(assignment).toMatchObject({ itemStatus: 'montagem_concluida' });
      expect(assignment?.completedAt).toBeDefined();

      const history = (
        await adminDb.collection(itemStatusHistoryPath(PROJECT_ID, ASSIGNED_ITEM_ID)).get()
      ).docs.map(doc => doc.data());
      expect(history).toHaveLength(2);
      expect(history.map(entry => entry.toStatus).sort()).toEqual([
        'montagem_concluida',
        'pronto_para_montagem',
      ]);
      expect(history.every(entry => entry.changedByRole === 'assembler')).toBe(true);
      expect(history.every(entry => entry.changedBy === 'seed-assembler')).toBe(true);

      const project = (await adminDb.doc(`projects/${PROJECT_ID}`).get()).data();
      expect(project?.itemSummary).toMatchObject({ total: 2, emProducao: 0 });
    });

    it('nega montador nao atribuido com 403 sem alterar o item', async () => {
      const res = mockRes();
      await updateStatusHandler(
        mockReq({
          method: 'POST',
          cookie: await assemblerCookie(),
          body: {
            projectId: PROJECT_ID,
            itemId: UNASSIGNED_ITEM_ID,
            nextStatus: 'pronto_para_montagem',
          },
        }),
        res,
      );

      expect(res.statusCode).toBe(403);
      expect((await itemData(UNASSIGNED_ITEM_ID))?.status).toBe(
        'aguardando_aprovacao_cliente',
      );
      expect(
        (await adminDb.collection(itemStatusHistoryPath(PROJECT_ID, UNASSIGNED_ITEM_ID)).get())
          .size,
      ).toBe(0);
    });

    it('nega transicao invalida com 409 sem alterar o item', async () => {
      const res = mockRes();
      await updateStatusHandler(
        mockReq({
          method: 'POST',
          cookie: await assemblerCookie(),
          body: {
            projectId: PROJECT_ID,
            itemId: ASSIGNED_ITEM_ID,
            nextStatus: 'finalizado',
          },
        }),
        res,
      );

      expect(res.statusCode).toBe(409);
      expect((await itemData(ASSIGNED_ITEM_ID))?.status).toBe('em_producao');
    });

    it('valida metodo, sessao, papel e campos obrigatorios', async () => {
      const wrongMethodRes = mockRes();
      await updateStatusHandler(mockReq({ method: 'GET' }), wrongMethodRes);
      expect(wrongMethodRes.statusCode).toBe(405);

      const noSessionRes = mockRes();
      await updateStatusHandler(mockReq({ method: 'POST' }), noSessionRes);
      expect(noSessionRes.statusCode).toBe(401);

      const wrongRoleRes = mockRes();
      await updateStatusHandler(
        mockReq({
          method: 'POST',
          cookie: await internalSessionCookie('vendedor@seed.jrm'),
          body: {
            projectId: PROJECT_ID,
            itemId: ASSIGNED_ITEM_ID,
            nextStatus: 'pronto_para_montagem',
          },
        }),
        wrongRoleRes,
      );
      expect(wrongRoleRes.statusCode).toBe(403);

      const missingFieldsRes = mockRes();
      await updateStatusHandler(
        mockReq({ method: 'POST', cookie: await assemblerCookie(), body: {} }),
        missingFieldsRes,
      );
      expect(missingFieldsRes.statusCode).toBe(400);

      const missingItemRes = mockRes();
      await updateStatusHandler(
        mockReq({
          method: 'POST',
          cookie: await assemblerCookie(),
          body: {
            projectId: PROJECT_ID,
            itemId: 'item-inexistente',
            nextStatus: 'pronto_para_montagem',
          },
        }),
        missingItemRes,
      );
      expect(missingItemRes.statusCode).toBe(403);

      expect((await itemData(ASSIGNED_ITEM_ID))?.status).toBe('em_producao');
    });
  });

  describe('confirm-payment', () => {
    it('o montador dono confirma um pagamento pago e a atribuicao acompanha', async () => {
      await seedPayment('payment-1');

      const res = mockRes();
      await confirmPaymentHandler(
        mockReq({
          method: 'POST',
          cookie: await assemblerCookie(),
          body: { paymentId: 'payment-1' },
        }),
        res,
      );

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({ status: true });

      const payment = (await adminDb.doc(paymentPath('payment-1')).get()).data();
      expect(payment).toMatchObject({
        status: 'confirmado_pelo_montador',
        amount: 250,
        assemblerId: 'seed-assembler',
      });
      expect(payment?.confirmedAt).toBeDefined();

      const assignment = (
        await adminDb
          .doc(
            itemAssemblerAssignmentPath(PROJECT_ID, ASSIGNED_ITEM_ID, 'seed-assembler'),
          )
          .get()
      ).data();
      expect(assignment).toMatchObject({
        paymentStatus: 'confirmado_pelo_montador',
      });
      expect(assignment?.paymentConfirmedAt).toBeDefined();
    });

    it('nega confirmacao de pagamento de outro montador', async () => {
      await seedPayment('payment-de-outro', { assemblerId: 'outro-montador' });

      const res = mockRes();
      await confirmPaymentHandler(
        mockReq({
          method: 'POST',
          cookie: await assemblerCookie(),
          body: { paymentId: 'payment-de-outro' },
        }),
        res,
      );

      expect(res.statusCode).toBe(403);
      expect(
        (await adminDb.doc(paymentPath('payment-de-outro')).get()).data()?.status,
      ).toBe('pago');
    });

    it('nega confirmacao de pagamento que nao esta em pago', async () => {
      await seedPayment('payment-pendente', { status: 'aguardando_liberacao' });

      const res = mockRes();
      await confirmPaymentHandler(
        mockReq({
          method: 'POST',
          cookie: await assemblerCookie(),
          body: { paymentId: 'payment-pendente' },
        }),
        res,
      );

      expect(res.statusCode).toBe(403);
      expect(
        (await adminDb.doc(paymentPath('payment-pendente')).get()).data()?.status,
      ).toBe('aguardando_liberacao');
    });

    it('valida metodo, sessao, paymentId e pagamento inexistente', async () => {
      const wrongMethodRes = mockRes();
      await confirmPaymentHandler(mockReq({ method: 'GET' }), wrongMethodRes);
      expect(wrongMethodRes.statusCode).toBe(405);

      const noSessionRes = mockRes();
      await confirmPaymentHandler(mockReq({ method: 'POST' }), noSessionRes);
      expect(noSessionRes.statusCode).toBe(401);

      const missingIdRes = mockRes();
      await confirmPaymentHandler(
        mockReq({ method: 'POST', cookie: await assemblerCookie(), body: {} }),
        missingIdRes,
      );
      expect(missingIdRes.statusCode).toBe(400);

      const notFoundRes = mockRes();
      await confirmPaymentHandler(
        mockReq({
          method: 'POST',
          cookie: await assemblerCookie(),
          body: { paymentId: 'nao-existe' },
        }),
        notFoundRes,
      );
      expect(notFoundRes.statusCode).toBe(404);
    });
  });
});
