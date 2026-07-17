import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getBytes, ref, uploadBytes } from 'firebase/storage';

import { auth } from '@/services/firebase';
import { storage } from '@/services/firebase';
import { resetEmulator, TEST_STORAGE_BUCKET } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

describe('Firebase Emulator integration smoke', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('writes and reads a file through the real Storage SDK', async () => {
    await signInWithEmailAndPassword(
      auth,
      'vendedor@seed.jrm',
      SEED_USER_PASSWORD,
    );
    const fileRef = ref(
      storage,
      'projects/seed-project-1/items/seed-item-1/geral/storage-upload.txt',
    );
    const bytes = new TextEncoder().encode('storage emulator smoke');

    const result = await uploadBytes(fileRef, bytes, {
      contentType: 'text/plain',
    });

    expect(result.metadata.bucket).toBe(TEST_STORAGE_BUCKET);
    const downloaded = await getBytes(fileRef);
    expect(Buffer.from(downloaded)).toEqual(Buffer.from(bytes));
  });
});
