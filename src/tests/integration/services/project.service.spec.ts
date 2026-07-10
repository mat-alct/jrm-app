import { Timestamp } from 'firebase-admin/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import {
  createProject,
  getProject,
  listProjects,
  updateProject,
} from '@/services/projects/project.service';
import { projectPath } from '@/services/projects/paths';
import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import { resetEmulator } from '@/tests/helpers/emulator';
import { seedEmulator, SEED_USER_PASSWORD } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

describe('services/projects/project.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('creates a normalized project with zeroed summary and actor metadata', async () => {
    await signInAs('vendedor@seed.jrm');

    const projectId = await createProject(
      {
        customerName: '  Cliente Novo  ',
        customerPhone: ' 24999991111 ',
        customerEmail: ' novo@example.com ',
        customerAddress: ' Rua Nova, 123 ',
      },
      { uid: 'seed-seller', name: 'Vendedor Seed' },
    );

    const snap = await adminDb.doc(projectPath(projectId)).get();
    expect(snap.exists).toBe(true);
    expect(snap.data()).toMatchObject({
      customerName: 'Cliente Novo',
      customerPhone: '24999991111',
      customerEmail: 'novo@example.com',
      customerAddress: 'Rua Nova, 123',
      sellerId: 'seed-seller',
      sellerName: 'Vendedor Seed',
      clientAccessCodeHash: '',
      clientAccessPublicId: '',
      itemSummary: {
        total: 0,
        aguardandoAprovacao: 0,
        aprovados: 0,
        emProducao: 0,
        emMontagem: 0,
        finalizados: 0,
        atrasados: 0,
      },
      totalCustomerValue: 0,
      createdBy: 'seed-seller',
      createdByName: 'Vendedor Seed',
      updatedBy: 'seed-seller',
    });
    expect(snap.data()?.createdAt).toBeTruthy();
    expect(snap.data()?.updatedAt).toBeTruthy();
  });

  it('gets, updates and returns null for missing projects', async () => {
    await signInAs('admin@seed.jrm');

    await expect(getProject('missing-project')).resolves.toBeNull();

    await updateProject(
      'seed-project-1',
      {
        customerName: 'Cliente Seed Atualizado',
        customerPhone: '24000000000',
      },
      'seed-admin',
    );

    const project = await getProject('seed-project-1');
    expect(project).toMatchObject({
      id: 'seed-project-1',
      customerName: 'Cliente Seed Atualizado',
      customerPhone: '24000000000',
      updatedBy: 'seed-admin',
    });

    const snap = await adminDb.doc(projectPath('seed-project-1')).get();
    expect(snap.data()).toMatchObject({
      customerName: 'Cliente Seed Atualizado',
      customerPhone: '24000000000',
      updatedBy: 'seed-admin',
    });
  });

  it('lists projects by sellerId and customer-name search', async () => {
    await adminDb.collection('projects').doc('other-seller-project').set({
      customerName: 'Cliente Seed 1 Fora do Filtro',
      customerPhone: '24999993333',
      customerEmail: 'outro@example.com',
      customerAddress: 'Rua Outro, 321',
      sellerId: 'other-seller',
      sellerName: 'Outro Vendedor',
      clientAccessCodeHash: '',
      clientAccessPublicId: '',
      itemSummary: {
        total: 0,
        aguardandoAprovacao: 0,
        aprovados: 0,
        emProducao: 0,
        emMontagem: 0,
        finalizados: 0,
        atrasados: 0,
      },
      totalCustomerValue: 0,
      createdAt: Timestamp.fromDate(new Date('2026-01-16T12:00:00.000Z')),
      updatedAt: Timestamp.fromDate(new Date('2026-01-16T12:00:00.000Z')),
      createdBy: 'other-seller',
      updatedBy: 'other-seller',
    });
    await signInAs('vendedor@seed.jrm');

    const projects = await listProjects({
      sellerId: 'seed-seller',
      search: 'cliente seed 1',
    });

    expect(projects).toEqual([
      expect.objectContaining({
        id: 'seed-project-1',
        customerName: 'Cliente Seed 1',
        sellerId: 'seed-seller',
      }),
    ]);
  });
});
