import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { adminDb, adminStorage } from '@/services/firebaseAdmin';
import {
  itemAssemblerAssignmentPath,
  paymentPath,
} from '@/services/projects/paths';
import {
  confirmAssemblerPayment,
  createAssemblerPayment,
  listAssemblerPayments,
  listPendingAssemblerAssignments,
} from '@/services/projects/payment.service';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

function proofFile(): File {
  return new File(['proof-bytes'], 'Comprovante pagamento.pdf', {
    type: 'application/pdf',
  });
}

describe('services/projects/payment.service integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('lists pending assignments, creates a payment with proof upload and lists by assembler', async () => {
    await signInAs('admin@seed.jrm');

    await expect(listPendingAssemblerAssignments()).resolves.toEqual([
      expect.objectContaining({
        id: 'seed-assembler',
        assemblerId: 'seed-assembler',
        paymentStatus: 'pendente',
        amountToReceive: 250,
      }),
    ]);

    const payment = await createAssemblerPayment(
      {
        projectId: 'seed-project-1',
        itemId: 'seed-item-2',
        assignmentId: 'seed-assembler',
        proofFile: proofFile(),
        paidBy: 'seed-admin',
        paidByName: 'Admin Seed',
      },
      { id: 'seed-admin', roles: ['admin'] },
    );

    expect(payment).toMatchObject({
      projectId: 'seed-project-1',
      itemId: 'seed-item-2',
      assignmentId: 'seed-assembler',
      assemblerId: 'seed-assembler',
      assemblerName: 'Montador Seed',
      amount: 250,
      status: 'pago',
      paidBy: 'seed-admin',
      paidByName: 'Admin Seed',
    });
    expect(payment.proofStoragePath).toMatch(
      /^payments\/.+\/.+_Comprovante pagamento\.pdf$/,
    );

    const [proofExists] = await adminStorage
      .bucket()
      .file(payment.proofStoragePath as string)
      .exists();
    expect(proofExists).toBe(true);

    const paymentSnap = await adminDb.doc(paymentPath(payment.id)).get();
    expect(paymentSnap.data()).toMatchObject({
      id: payment.id,
      status: 'pago',
      amount: 250,
      proofStoragePath: payment.proofStoragePath,
    });

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
      paymentStatus: 'pago',
      paidBy: 'seed-admin',
      paymentId: payment.id,
    });

    await expect(listAssemblerPayments('seed-assembler')).resolves.toEqual([
      expect.objectContaining({
        id: payment.id,
        assemblerId: 'seed-assembler',
        status: 'pago',
      }),
    ]);
  });

  it('lets the owner assembler confirm a paid payment and updates the assignment', async () => {
    await signInAs('admin@seed.jrm');
    const payment = await createAssemblerPayment(
      {
        projectId: 'seed-project-1',
        itemId: 'seed-item-2',
        assignmentId: 'seed-assembler',
        proofFile: proofFile(),
        paidBy: 'seed-admin',
        paidByName: 'Admin Seed',
      },
      { id: 'seed-admin', roles: ['admin'] },
    );
    await signOut(auth);

    await signInAs('montador@seed.jrm');
    await confirmAssemblerPayment(payment.id, {
      id: 'seed-assembler',
      roles: ['assembler'],
    });

    const paymentSnap = await adminDb.doc(paymentPath(payment.id)).get();
    expect(paymentSnap.data()).toMatchObject({
      status: 'confirmado_pelo_montador',
    });
    expect(paymentSnap.data()?.confirmedAt).toBeTruthy();

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
      paymentStatus: 'confirmado_pelo_montador',
    });
    expect(assignmentSnap.data()?.paymentConfirmedAt).toBeTruthy();
  });
});
