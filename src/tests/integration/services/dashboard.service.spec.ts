import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import {
  computeDashboardCounts,
  countPendingAssemblerPayments,
  filterDashboardItems,
  listAllProjectItems,
} from '@/services/projects/dashboard.service';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';
import { Project } from '@/types/projects';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

describe('services/projects/dashboard.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('lists project items through collection-group rules and computes seeded dashboard counts', async () => {
    await signInAs('admin@seed.jrm');

    const items = await listAllProjectItems();
    expect(items.map(item => item.id).sort()).toEqual([
      'seed-item-1',
      'seed-item-2',
      'seed-item-3',
      'seed-item-4',
      'seed-item-5',
    ]);

    const projectsSnap = await adminDb.collection('projects').get();
    const projects = projectsSnap.docs.map(
      doc => ({ id: doc.id, ...doc.data() }) as Project,
    );

    const counts = computeDashboardCounts(
      projects,
      items,
      new Date('2026-01-27T12:00:00.000Z'),
    );

    expect(counts).toMatchObject({
      projetosEmAberto: 2,
      atrasados: 4,
      aguardandoAprovacao: 1,
      emProducao: 2,
      emMontagem: 1,
      totalVendidoNoMes: 3900,
    });
  });

  it('filters seeded dashboard items and counts pending assembler payments', async () => {
    await signInAs('admin@seed.jrm');

    const items = await listAllProjectItems();
    const projectsSnap = await adminDb.collection('projects').get();
    const projectsById = Object.fromEntries(
      projectsSnap.docs.map(doc => [
        doc.id,
        { id: doc.id, ...doc.data() } as Project,
      ]),
    );

    const filtered = filterDashboardItems(
      items,
      projectsById,
      {
        sellerId: 'seed-seller',
        designerId: 'seed-designer',
        status: 'aguardando_aprovacao_cliente',
        search: 'cliente seed 1',
      },
      new Date('2026-01-27T12:00:00.000Z'),
    );

    expect(filtered.map(item => item.id)).toEqual(['seed-item-1']);
    await expect(countPendingAssemblerPayments()).resolves.toBe(1);
  });
});
