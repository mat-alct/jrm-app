import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import {
  createProjectItem,
  getProjectItem,
  listProjectItems,
  updateProjectItem,
} from '@/services/projects/projectItem.service';
import { projectItemPath, projectPath } from '@/services/projects/paths';
import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import { resetEmulator } from '@/tests/helpers/emulator';
import { seedEmulator, SEED_USER_PASSWORD } from '@/tests/helpers/seedEmulator';
import type { UpdateProjectItemInput } from '@/services/projects/projectItem.service';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

describe('services/projects/projectItem.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('creates, gets and lists an item while recalculating the project summary', async () => {
    await signInAs('vendedor@seed.jrm');

    const itemId = await createProjectItem(
      'seed-project-1',
      {
        name: '  Ilha gourmet  ',
        environment: '  Cozinha  ',
        description: 'Complemento do ambiente',
        material: 'MDF',
        notes: 'Medir parede esquerda',
      },
      'seed-seller',
    );

    const itemSnap = await adminDb.doc(projectItemPath('seed-project-1', itemId)).get();
    expect(itemSnap.exists).toBe(true);
    expect(itemSnap.data()).toMatchObject({
      projectId: 'seed-project-1',
      name: 'Ilha gourmet',
      environment: 'Cozinha',
      description: 'Complemento do ambiente',
      material: 'MDF',
      notes: 'Medir parede esquerda',
      status: 'projeto_criado',
      clientApprovalStatus: 'aguardando',
      createdBy: 'seed-seller',
      updatedBy: 'seed-seller',
    });

    await expect(getProjectItem('seed-project-1', itemId)).resolves.toMatchObject({
      id: itemId,
      name: 'Ilha gourmet',
      status: 'projeto_criado',
    });

    const items = await listProjectItems('seed-project-1');
    expect(items.map(item => item.id)).toEqual([
      'seed-item-1',
      'seed-item-2',
      itemId,
    ]);

    const projectSnap = await adminDb.doc(projectPath('seed-project-1')).get();
    expect(projectSnap.data()).toMatchObject({
      itemSummary: {
        total: 3,
        aguardandoAprovacao: 1,
        aprovados: 0,
        emProducao: 1,
        emMontagem: 0,
        finalizados: 0,
        atrasados: 2,
      },
      totalCustomerValue: 1200,
    });
  });

  it('updates an item and recalculates summary and customer value', async () => {
    await signInAs('vendedor@seed.jrm');
    const update = {
      name: 'Cozinha revisada',
      status: 'finalizado',
      budget: {
        lines: [{ id: 'line-2', description: 'Adicional', amount: 800 }],
        totalCost: 800,
        customerAmount: 1600,
        suggestedAssemblerAmount: 400,
        createdBy: 'seed-seller',
        createdByName: 'Vendedor Seed',
        createdAt: new Date('2026-01-16T12:00:00.000Z') as any,
        updatedAt: new Date('2026-01-16T12:00:00.000Z') as any,
      },
    } as UpdateProjectItemInput;

    await updateProjectItem('seed-project-1', 'seed-item-1', update, 'seed-seller');

    await expect(
      getProjectItem('seed-project-1', 'seed-item-1'),
    ).resolves.toMatchObject({
      id: 'seed-item-1',
      name: 'Cozinha revisada',
      status: 'finalizado',
      updatedBy: 'seed-seller',
      budget: expect.objectContaining({ customerAmount: 1600 }),
    });

    const projectSnap = await adminDb.doc(projectPath('seed-project-1')).get();
    expect(projectSnap.data()).toMatchObject({
      itemSummary: {
        total: 2,
        aguardandoAprovacao: 0,
        aprovados: 0,
        emProducao: 1,
        emMontagem: 0,
        finalizados: 1,
        atrasados: 1,
      },
      totalCustomerValue: 1600,
    });
  });

  it('returns null for a missing item', async () => {
    await signInAs('vendedor@seed.jrm');

    await expect(
      getProjectItem('seed-project-1', 'missing-item'),
    ).resolves.toBeNull();
  });
});
