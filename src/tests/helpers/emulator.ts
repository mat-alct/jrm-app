import { adminAuth, adminStorage } from '@/services/firebaseAdmin';

export const TEST_PROJECT_ID = 'demo-jrm';
export const TEST_STORAGE_BUCKET = 'demo-jrm.appspot.com';

const FIRESTORE_EMULATOR_ORIGIN = 'http://127.0.0.1:8080';
const AUTH_EMULATOR_ORIGIN = 'http://127.0.0.1:9099';

async function deleteEmulatorData(
  url: string,
  init?: RequestInit,
): Promise<void> {
  const response = await fetch(url, { method: 'DELETE', ...init });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Falha ao resetar emulador (${response.status}): ${body}`);
  }
}

export async function resetFirestoreEmulator(): Promise<void> {
  await deleteEmulatorData(
    `${FIRESTORE_EMULATOR_ORIGIN}/emulator/v1/projects/${TEST_PROJECT_ID}/databases/(default)/documents`,
  );
}

export async function resetAuthEmulator(): Promise<void> {
  await deleteEmulatorData(
    `${AUTH_EMULATOR_ORIGIN}/emulator/v1/projects/${TEST_PROJECT_ID}/accounts`,
    { headers: { Authorization: 'Bearer owner' } },
  );
}

export async function resetStorageEmulator(): Promise<void> {
  await adminStorage.bucket().deleteFiles({ force: true });
}

export async function resetEmulator(): Promise<void> {
  await resetFirestoreEmulator();
  await resetAuthEmulator();
  await resetStorageEmulator();
}

export async function ensureAuthUser(input: {
  uid: string;
  email: string;
  password: string;
  displayName: string;
}): Promise<void> {
  try {
    await adminAuth.createUser(input);
  } catch (error: any) {
    if (error?.code !== 'auth/uid-already-exists') {
      throw error;
    }
    await adminAuth.updateUser(input.uid, {
      email: input.email,
      password: input.password,
      displayName: input.displayName,
    });
  }
}
