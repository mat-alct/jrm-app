import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import { projectItemPath, projectPath } from '@/services/projects/paths';
import { listItemStatusHistory } from '@/services/projects/projectItem.service';
import {
  InvalidStatusTransitionError,
  MissingStatusNoteError,
  updateItemStatus,
} from '@/services/projects/status.service';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

describe('services/projects/status.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('applies a valid transition, records statusHistory and recalculates the summary', async () => {
    await signInAs('vendedor@seed.jrm');

    await updateItemStatus(
      'seed-project-1',
      'seed-item-1',
      'aguardando_atribuicao_montador',
      {
        uid: 'seed-seller',
        name: 'Vendedor Seed',
        role: 'seller',
      },
      'Cliente aprovou o orçamento',
    );

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-1'))
      .get();
    expect(itemSnap.data()).toMatchObject({
      status: 'aguardando_atribuicao_montador',
      updatedBy: 'seed-seller',
    });
    expect(itemSnap.data()?.approvedAt).toBeTruthy();

    await expect(
      listItemStatusHistory('seed-project-1', 'seed-item-1'),
    ).resolves.toEqual([
      expect.objectContaining({
        projectId: 'seed-project-1',
        itemId: 'seed-item-1',
        fromStatus: 'aguardando_aprovacao_cliente',
        toStatus: 'aguardando_atribuicao_montador',
        changedBy: 'seed-seller',
        changedByName: 'Vendedor Seed',
        changedByRole: 'seller',
        note: 'Cliente aprovou o orçamento',
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

  it('rejects an invalid transition without writing item or history', async () => {
    await signInAs('vendedor@seed.jrm');

    await expect(
      updateItemStatus('seed-project-1', 'seed-item-2', 'montagem_concluida', {
        uid: 'seed-seller',
        role: 'seller',
      }),
    ).rejects.toBeInstanceOf(InvalidStatusTransitionError);

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-2'))
      .get();
    expect(itemSnap.data()).toMatchObject({
      status: 'em_producao',
      updatedBy: 'seed-seller',
    });

    await expect(
      listItemStatusHistory('seed-project-1', 'seed-item-2'),
    ).resolves.toEqual([]);
  });

  it('rejects a request for more information without a justification', async () => {
    await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-1')).update({
      status: 'aguardando_desenho',
      designerId: 'seed-designer',
    });
    await signInAs('desenhista@seed.jrm');

    await expect(
      updateItemStatus(
        'seed-project-1',
        'seed-item-1',
        'aguardando_informacoes',
        { uid: 'seed-designer', role: 'designer' },
        '   ',
      ),
    ).rejects.toBeInstanceOf(MissingStatusNoteError);

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-1'))
      .get();
    expect(itemSnap.data()?.status).toBe('aguardando_desenho');
    const historySnap = await adminDb
      .collection('projects/seed-project-1/items/seed-item-1/statusHistory')
      .get();
    expect(historySnap.empty).toBe(true);
  });
});
