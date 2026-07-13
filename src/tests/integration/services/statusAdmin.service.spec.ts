import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import { projectItemPath, projectPath } from '@/services/projects/paths';
import {
  applyClientItemTransition,
  approveAllClientItems,
  recalculateProjectSummaryAdmin,
} from '@/services/projects/statusAdmin.service';
import {
  getProjectSummary,
  recalculateProjectSummary,
} from '@/services/projects/summary';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

describe('services/projects/statusAdmin.service and summary integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('applies a client item transition with Admin SDK, writes history and recalculates summary', async () => {
    await applyClientItemTransition(
      'seed-project-1',
      'seed-item-1',
      'aguardando_atribuicao_montador',
      'Aprovado pelo cliente no portal',
    );

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-1'))
      .get();
    expect(itemSnap.data()).toMatchObject({
      status: 'aguardando_atribuicao_montador',
      clientApprovalStatus: 'aprovado',
      updatedBy: 'client',
    });
    expect(itemSnap.data()?.approvedAt).toBeTruthy();

    const historySnap = await adminDb
      .collection('projects/seed-project-1/items/seed-item-1/statusHistory')
      .get();
    expect(historySnap.docs.map(doc => doc.data())).toEqual([
      expect.objectContaining({
        projectId: 'seed-project-1',
        itemId: 'seed-item-1',
        fromStatus: 'aguardando_aprovacao_cliente',
        toStatus: 'aguardando_atribuicao_montador',
        changedBy: 'client',
        changedByRole: 'client',
        note: 'Aprovado pelo cliente no portal',
      }),
    ]);

    const projectSnap = await adminDb.doc(projectPath('seed-project-1')).get();
    expect(projectSnap.data()).toMatchObject({
      itemSummary: {
        total: 2,
        aguardandoAprovacao: 0,
        aprovados: 1,
        emProducao: 1,
        emMontagem: 0,
        finalizados: 0,
        atrasados: 2,
      },
    });
  });

  it('approves all pending client items and recalculates the admin summary', async () => {
    await expect(approveAllClientItems('seed-project-1')).resolves.toBe(1);

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-1'))
      .get();
    expect(itemSnap.data()).toMatchObject({
      status: 'aguardando_atribuicao_montador',
      clientApprovalStatus: 'aprovado',
    });

    await recalculateProjectSummaryAdmin('seed-project-1');
    const projectSnap = await adminDb.doc(projectPath('seed-project-1')).get();
    expect(projectSnap.data()?.itemSummary).toMatchObject({
      total: 2,
      aprovados: 1,
      emProducao: 1,
    });
  });

  it('recalculates and reads project summary through client Firestore APIs', async () => {
    await signInAs('vendedor@seed.jrm');

    await adminDb
      .doc(projectItemPath('seed-project-2', 'seed-item-4'))
      .update({ status: 'finalizado' });

    await recalculateProjectSummary('seed-project-2');

    await expect(getProjectSummary('seed-project-2')).resolves.toMatchObject({
      total: 3,
      aguardandoAprovacao: 0,
      aprovados: 0,
      emProducao: 1,
      emMontagem: 0,
      finalizados: 2,
      atrasados: 1,
    });
    expect(
      (await adminDb.doc(projectPath('seed-project-2')).get()).data(),
    ).toMatchObject({
      totalCustomerValue: 2700,
    });
  });
});
