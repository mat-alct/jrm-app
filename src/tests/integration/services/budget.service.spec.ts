import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import {
  BudgetServiceError,
  saveItemBudget,
  sendBudgetToClient,
} from '@/services/projects/budget.service';
import { projectItemPath } from '@/services/projects/paths';
import { listItemStatusHistory } from '@/services/projects/projectItem.service';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

async function makeItemWaitForBudget(): Promise<void> {
  await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-2')).update({
    status: 'aguardando_orcamento',
  });
}

describe('services/projects/budget.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
    await makeItemWaitForBudget();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('saves budget totals on the item and preserves creation metadata on edit', async () => {
    await signInAs('vendedor@seed.jrm');

    const firstBudget = await saveItemBudget(
      'seed-project-1',
      'seed-item-2',
      {
        lines: [
          { description: 'MDF', amount: 300 },
          { description: 'Ferragens', amount: 75.5 },
        ],
        customerAmount: 800,
        suggestedAssemblerAmount: 250,
      },
      { id: 'seed-seller', name: 'Vendedor Seed', roles: ['seller'] },
    );

    expect(firstBudget).toMatchObject({
      lines: [
        { id: '0', description: 'MDF', amount: 300 },
        { id: '1', description: 'Ferragens', amount: 75.5 },
      ],
      totalCost: 375.5,
      customerAmount: 800,
      suggestedAssemblerAmount: 250,
      createdBy: 'seed-seller',
      createdByName: 'Vendedor Seed',
    });

    const secondBudget = await saveItemBudget(
      'seed-project-1',
      'seed-item-2',
      {
        lines: [{ description: 'MDF revisado', amount: 420 }],
        customerAmount: 950,
        suggestedAssemblerAmount: 300,
      },
      { id: 'seed-admin', name: 'Admin Seed', roles: ['admin'] },
    );

    expect(secondBudget).toMatchObject({
      lines: [{ id: '0', description: 'MDF revisado', amount: 420 }],
      totalCost: 420,
      customerAmount: 950,
      suggestedAssemblerAmount: 300,
      createdBy: 'seed-seller',
      createdByName: 'Vendedor Seed',
    });
    expect(secondBudget.createdAt.toMillis()).toBe(
      firstBudget.createdAt.toMillis(),
    );
    expect(secondBudget.updatedAt.toMillis()).toBeGreaterThanOrEqual(
      firstBudget.updatedAt.toMillis(),
    );

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-2'))
      .get();
    expect(itemSnap.data()).toMatchObject({
      updatedBy: 'seed-admin',
      budget: {
        lines: [{ id: '0', description: 'MDF revisado', amount: 420 }],
        totalCost: 420,
        customerAmount: 950,
        suggestedAssemblerAmount: 300,
        createdBy: 'seed-seller',
        createdByName: 'Vendedor Seed',
      },
    });
  });

  it('rejects invalid actors and invalid item states without writing a budget', async () => {
    await signInAs('desenhista@seed.jrm');

    await expect(
      saveItemBudget(
        'seed-project-1',
        'seed-item-2',
        {
          lines: [{ description: 'MDF', amount: 300 }],
          customerAmount: 800,
          suggestedAssemblerAmount: 250,
        },
        { id: 'seed-designer', name: 'Desenhista Seed', roles: ['designer'] },
      ),
    ).rejects.toBeInstanceOf(BudgetServiceError);

    await signOut(auth);
    await signInAs('vendedor@seed.jrm');
    await adminDb.doc(projectItemPath('seed-project-1', 'seed-item-2')).update({
      status: 'em_producao',
    });

    await expect(
      saveItemBudget(
        'seed-project-1',
        'seed-item-2',
        {
          lines: [{ description: 'MDF', amount: 300 }],
          customerAmount: 800,
          suggestedAssemblerAmount: 250,
        },
        { id: 'seed-seller', name: 'Vendedor Seed', roles: ['seller'] },
      ),
    ).rejects.toBeInstanceOf(BudgetServiceError);

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-2'))
      .get();
    expect(itemSnap.data()).not.toHaveProperty('budget');
  });

  it('sends a saved budget to the client through the real status service', async () => {
    await signInAs('vendedor@seed.jrm');
    await saveItemBudget(
      'seed-project-1',
      'seed-item-2',
      {
        lines: [{ description: 'MDF', amount: 300 }],
        customerAmount: 800,
        suggestedAssemblerAmount: 250,
      },
      { id: 'seed-seller', name: 'Vendedor Seed', roles: ['seller'] },
    );

    await sendBudgetToClient('seed-project-1', 'seed-item-2', {
      id: 'seed-seller',
      name: 'Vendedor Seed',
      roles: ['seller'],
      role: 'seller',
    });

    const itemSnap = await adminDb
      .doc(projectItemPath('seed-project-1', 'seed-item-2'))
      .get();
    expect(itemSnap.data()).toMatchObject({
      status: 'aguardando_aprovacao_cliente',
      updatedBy: 'seed-seller',
    });

    await expect(
      listItemStatusHistory('seed-project-1', 'seed-item-2'),
    ).resolves.toEqual([
      expect.objectContaining({
        fromStatus: 'aguardando_orcamento',
        toStatus: 'aguardando_aprovacao_cliente',
        changedBy: 'seed-seller',
        changedByName: 'Vendedor Seed',
        changedByRole: 'seller',
      }),
    ]);
  });
});
