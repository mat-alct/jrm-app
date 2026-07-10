import './testEnv';

import { expect, loginAs, test } from './fixtures';

const PROJECT_ID = 'seed-project-1';
/** Item `em_producao` com atribuição para `seed-assembler` no seed. */
const ITEM_ID = 'seed-item-2';

const PROOF_FILE = {
  name: 'comprovante.pdf',
  mimeType: 'application/pdf',
  buffer: Buffer.from('%PDF comprovante'),
};

test.describe('jornada Via B — montador e financeiro', () => {
  test('o montador vê a atribuição e avança até montagem concluída', async ({
    page,
    adminDb,
  }) => {
    await loginAs(page, 'assembler');

    await expect(page.getByText('Minha montagem').first()).toBeVisible();
    await expect(page.getByText('Armario de quarto')).toBeVisible();
    await expect(page.getByText(/250,00/)).toBeVisible();

    await page.getByRole('button', { name: 'Abrir item' }).click();
    await expect(page).toHaveURL(`/montador/item/${PROJECT_ID}/${ITEM_ID}`, {
      timeout: 20_000,
    });

    await page
      .getByRole('button', { name: 'Atualizar etapa para pronto_para_montagem' })
      .click();
    await expect
      .poll(async () => {
        const snap = await adminDb.doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`).get();
        return snap.data()?.status;
      })
      .toBe('pronto_para_montagem');

    await page
      .getByRole('button', { name: 'Atualizar etapa para montagem_concluida' })
      .click();
    await expect
      .poll(async () => {
        const snap = await adminDb.doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`).get();
        return snap.data()?.status;
      })
      .toBe('montagem_concluida');

    // Verificação dupla: histórico com papel assembler e assignment atualizado.
    const history = await adminDb
      .collection(`projects/${PROJECT_ID}/items/${ITEM_ID}/statusHistory`)
      .get();
    expect(history.size).toBe(2);
    expect(history.docs.every(doc => doc.data().changedByRole === 'assembler')).toBe(
      true,
    );

    const assignment = await adminDb
      .doc(
        `projects/${PROJECT_ID}/items/${ITEM_ID}/assemblerAssignments/seed-assembler`,
      )
      .get();
    expect(assignment.data()).toMatchObject({ itemStatus: 'montagem_concluida' });
  });

  test('admin paga e o montador confirma o recebimento', async ({ page, adminDb }) => {
    // Estado de partida: montagem concluída, pagamento pendente de liberação.
    await adminDb
      .doc(`projects/${PROJECT_ID}/items/${ITEM_ID}`)
      .update({ status: 'montagem_concluida' });
    await adminDb
      .doc(
        `projects/${PROJECT_ID}/items/${ITEM_ID}/assemblerAssignments/seed-assembler`,
      )
      .update({ itemStatus: 'montagem_concluida', paymentStatus: 'pendente' });

    // ---------- admin paga com comprovante ----------
    await loginAs(page, 'admin');
    await page.goto('/administracao/financeiro-montadores');

    await expect(page.getByText('Montador Seed').first()).toBeVisible();
    await page.locator('input[type="file"]').first().setInputFiles(PROOF_FILE);
    await page.getByRole('button', { name: 'Pagar' }).click();

    await expect
      .poll(async () => (await adminDb.collection('payments').get()).size)
      .toBe(1);

    const paymentSnap = (await adminDb.collection('payments').get()).docs[0];
    expect(paymentSnap.data()).toMatchObject({
      assemblerId: 'seed-assembler',
      amount: 250,
      status: 'pago',
    });
    expect(paymentSnap.data().proofStoragePath).toBeTruthy();

    // ---------- montador confirma o recebimento ----------
    await loginAs(page, 'assembler');
    await page.goto('/montador/financeiro');

    await expect(page.getByText('Meu financeiro').first()).toBeVisible();
    await page.getByRole('button', { name: 'Confirmar recebimento' }).click();

    // Verificação dupla: doc de pagamento e assignment refletem a confirmação.
    await expect
      .poll(async () => {
        const snap = await adminDb.doc(`payments/${paymentSnap.id}`).get();
        return snap.data()?.status;
      })
      .toBe('confirmado_pelo_montador');

    const assignment = await adminDb
      .doc(
        `projects/${PROJECT_ID}/items/${ITEM_ID}/assemblerAssignments/seed-assembler`,
      )
      .get();
    expect(assignment.data()?.paymentStatus).toBe('confirmado_pelo_montador');
  });

  test('o montador não vê a atribuição de outro montador', async ({
    page,
    adminDb,
  }) => {
    // Transfere a atribuição para outro montador, mantendo o item no projeto.
    const assignmentRef = adminDb.doc(
      `projects/${PROJECT_ID}/items/${ITEM_ID}/assemblerAssignments/seed-assembler`,
    );
    const data = (await assignmentRef.get()).data()!;
    await assignmentRef.delete();
    await adminDb
      .doc(`projects/${PROJECT_ID}/items/${ITEM_ID}/assemblerAssignments/outro-montador`)
      .set({ ...data, assemblerId: 'outro-montador', assemblerName: 'Outro Montador' });

    await loginAs(page, 'assembler');

    await expect(page.getByText('Minha montagem').first()).toBeVisible();
    await expect(page.getByText('Armario de quarto')).toHaveCount(0);
    await expect(page.getByText('Nenhum item atribuído')).toBeVisible();
  });
});
