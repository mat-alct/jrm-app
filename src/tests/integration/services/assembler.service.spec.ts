import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';

import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import {
  assignAssemblers,
  getAssemblerAssignments,
  listItemAssemblerAssignments,
  updateAssignment,
} from '@/services/projects/assembler.service';
import {
  itemAssemblerAssignmentPath,
  projectItemPath,
} from '@/services/projects/paths';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

describe('services/projects/assembler.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('assigns assemblers, creates docs with assembler id and moves item to production', async () => {
    await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-1')).update({
      status: 'aguardando_atribuicao_montador',
      deadlineCurrent: AdminTimestamp.fromDate(
        new Date('2026-08-15T12:00:00.000Z'),
      ),
    });
    await signInAs('admin@seed.jrm');

    const result = await assignAssemblers(
      'seed-project-1',
      'seed-item-1',
      [
        {
          assemblerId: 'seed-assembler',
          assemblerName: 'Montador Seed',
          amountToReceive: 375,
        },
      ],
      { id: 'seed-admin', name: 'Admin Seed', roles: ['admin'] },
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: 'seed-assembler',
        assemblerId: 'seed-assembler',
        assemblerName: 'Montador Seed',
        projectId: 'seed-project-1',
        itemId: 'seed-item-1',
        customerName: 'Cliente Seed 1',
        customerPhone: '24999990000',
        itemName: 'Cozinha planejada',
        itemEnvironment: 'Cozinha',
        itemStatus: 'aguardando_atribuicao_montador',
        amountToReceive: 375,
        paymentStatus: 'nao_liberado',
        assignedBy: 'seed-admin',
        assignedByName: 'Admin Seed',
      }),
    ]);
    expect(result[0].dueAt?.toDate().toISOString()).toBe(
      '2026-08-15T12:00:00.000Z',
    );

    const assignmentSnap = await adminDb
      .doc(
        itemAssemblerAssignmentPath(
          'seed-project-1',
          'seed-item-1',
          'seed-assembler',
        ),
      )
      .get();
    expect(assignmentSnap.exists).toBe(true);
    expect(assignmentSnap.data()).toMatchObject({
      id: 'seed-assembler',
      assemblerId: 'seed-assembler',
      amountToReceive: 375,
      paymentStatus: 'nao_liberado',
    });

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-1'))
      .get();
    expect(itemSnap.data()).toMatchObject({
      status: 'em_producao',
      updatedBy: 'seed-admin',
    });
  });

  it('lists assignments by assembler and by item, sorted by due date', async () => {
    await signInAs('admin@seed.jrm');
    await assignAssemblers(
      'seed-project-1',
      'seed-item-1',
      [
        {
          assemblerId: 'seed-assembler',
          assemblerName: 'Montador Seed',
          amountToReceive: 375,
          dueAt: Timestamp.fromDate(new Date('2026-08-01T12:00:00.000Z')),
        },
      ],
      { id: 'seed-admin', name: 'Admin Seed', roles: ['admin'] },
    );
    await signOut(auth);

    await signInAs('montador@seed.jrm');
    const byAssembler = await getAssemblerAssignments('seed-assembler');
    expect(byAssembler.map(assignment => assignment.itemId)).toEqual([
      'seed-item-1',
      'seed-item-2',
    ]);

    await signOut(auth);
    await signInAs('admin@seed.jrm');
    await expect(
      listItemAssemblerAssignments('seed-project-1', 'seed-item-1'),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'seed-assembler',
        assemblerId: 'seed-assembler',
        amountToReceive: 375,
      }),
    ]);
  });

  it('updates assignment fields only for admin users', async () => {
    await signInAs('admin@seed.jrm');

    await updateAssignment(
      'seed-project-1',
      'seed-item-2',
      'seed-assembler',
      {
        amountToReceive: 425,
        assemblerName: 'Montador Atualizado',
        dueAt: Timestamp.fromDate(new Date('2026-08-20T12:00:00.000Z')),
      },
      { roles: ['admin'] },
    );

    const assignmentSnap = await adminDb
      .doc(
        itemAssemblerAssignmentPath(
          'seed-project-1',
          'seed-item-2',
          'seed-assembler',
        ),
      )
      .get();
    expect(assignmentSnap.data()).toMatchObject({
      amountToReceive: 425,
      assemblerName: 'Montador Atualizado',
    });
    expect(assignmentSnap.data()?.dueAt.toDate().toISOString()).toBe(
      '2026-08-20T12:00:00.000Z',
    );
  });
});
