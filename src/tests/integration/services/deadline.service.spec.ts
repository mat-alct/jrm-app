import { Timestamp } from 'firebase-admin/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import {
  assignAssemblers,
  listItemAssemblerAssignments,
} from '@/services/projects/assembler.service';
import {
  computeDeadline,
  FALLBACK_DEADLINE_DEFAULTS,
  getDeadlineDefaults,
} from '@/services/projects/deadline.service';
import { saveDeadlineDefaults } from '@/services/projects/deadlineAdmin';
import { projectItemPath } from '@/services/projects/paths';
import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import { resetEmulator } from '@/tests/helpers/emulator';
import { seedEmulator, SEED_USER_PASSWORD } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

describe('services/projects/deadline integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('reads fallback defaults when settings/deadlineDefaults is missing', async () => {
    await adminDb.collection('settings').doc('deadlineDefaults').delete();
    await signInAs('admin@seed.jrm');

    await expect(getDeadlineDefaults()).resolves.toEqual(
      FALLBACK_DEADLINE_DEFAULTS,
    );
  });

  it('saves and reads deadline defaults through the real settings document', async () => {
    await signInAs('admin@seed.jrm');

    await saveDeadlineDefaults(
      {
        desenhoDias: 4,
        orcamentoDias: 3,
        aprovacaoClienteDias: 2,
        atribuicaoMontadorDias: 1,
        producaoDias: 8,
        montagemDias: 6,
      },
      'seed-admin',
    );

    await expect(getDeadlineDefaults()).resolves.toEqual({
      desenhoDias: 4,
      orcamentoDias: 3,
      aprovacaoClienteDias: 2,
      atribuicaoMontadorDias: 1,
      producaoDias: 8,
      montagemDias: 6,
    });

    const snap = await adminDb.collection('settings').doc('deadlineDefaults').get();
    expect(snap.data()).toMatchObject({
      desenhoDias: 4,
      orcamentoDias: 3,
      aprovacaoClienteDias: 2,
      atribuicaoMontadorDias: 1,
      producaoDias: 8,
      montagemDias: 6,
      updatedBy: 'seed-admin',
    });

    const deadline = computeDeadline(
      'em_producao',
      await getDeadlineDefaults(),
      new Date('2026-07-09T12:00:00.000Z'),
    );
    expect(deadline?.toDate().toISOString().slice(0, 10)).toBe('2026-07-17');
  });

  it('uses the item current deadline as the assembler assignment due date', async () => {
    const itemDeadline = Timestamp.fromDate(
      new Date('2026-08-10T12:00:00.000Z'),
    );
    await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-1')).update({
      status: 'aguardando_atribuicao_montador',
      deadlineCurrent: itemDeadline,
    });
    await signInAs('admin@seed.jrm');

    const assignments = await assignAssemblers(
      'seed-project-1',
      'seed-item-1',
      [
        {
          assemblerId: 'seed-assembler',
          assemblerName: 'Montador Seed',
          amountToReceive: 350,
        },
      ],
      { id: 'seed-admin', name: 'Admin Seed', roles: ['admin'] },
    );

    expect(assignments).toHaveLength(1);
    expect(assignments[0]).toMatchObject({
      id: 'seed-assembler',
      projectId: 'seed-project-1',
      itemId: 'seed-item-1',
      amountToReceive: 350,
      paymentStatus: 'nao_liberado',
      assignedBy: 'seed-admin',
      assignedByName: 'Admin Seed',
    });
    expect(assignments[0].dueAt?.toDate().toISOString()).toBe(
      '2026-08-10T12:00:00.000Z',
    );

    await expect(
      listItemAssemblerAssignments('seed-project-1', 'seed-item-1'),
    ).resolves.toEqual([
      expect.objectContaining({
        assemblerId: 'seed-assembler',
        dueAt: expect.objectContaining({}),
      }),
    ]);

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-1'))
      .get();
    expect(itemSnap.data()).toMatchObject({
      status: 'em_producao',
      updatedBy: 'seed-admin',
    });
  });
});
