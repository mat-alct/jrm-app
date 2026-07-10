import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

import { auth } from '@/services/firebase';
import { adminDb } from '@/services/firebaseAdmin';
import { getSellerByPassword } from '@/services/sellers';
import { resetEmulator } from '@/tests/helpers/emulator';
import { seedEmulator, SEED_USER_PASSWORD } from '@/tests/helpers/seedEmulator';

async function signInAs(email: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

describe('services/sellers integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
    await adminDb.doc('sellers/senha-direta').set({
      name: 'Vendedor Direto',
    });
    await adminDb.doc('sellers/legacy-doc').set({
      name: 'Vendedor Legado',
      password: 'senha-legada',
    });
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('finds sellers by safe document id and by legacy password field', async () => {
    await signInAs('vendedor@seed.jrm');

    await expect(getSellerByPassword('  senha-direta  ')).resolves.toEqual({
      id: 'senha-direta',
      name: 'Vendedor Direto',
    });
    await expect(getSellerByPassword('senha-legada')).resolves.toEqual({
      id: 'legacy-doc',
      name: 'Vendedor Legado',
    });
  });

  it('returns null for invalid ids and unknown passwords', async () => {
    await signInAs('vendedor@seed.jrm');

    await expect(getSellerByPassword('../senha-direta')).resolves.toBeNull();
    await expect(getSellerByPassword('__bad__')).resolves.toBeNull();
    await expect(getSellerByPassword('nao-existe')).resolves.toBeNull();
  });
});
