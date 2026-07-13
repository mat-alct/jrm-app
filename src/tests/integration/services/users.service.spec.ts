import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { NextApiRequest, NextApiResponse } from 'next';

import handler from '@/pages/api/admin/users';
import { auth } from '@/services/firebase';
import { adminAuth, adminDb } from '@/services/firebaseAdmin';
import {
  createAdminUser,
  listUsers,
  listUsersByRole,
  updateAdminUser,
} from '@/services/projects/adminUsers';
import { userPath } from '@/services/projects/paths';
import { getAppUser } from '@/services/projects/users.service';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

type JsonResponse = {
  statusCode?: number;
  body?: unknown;
};

async function signInAs(email: string) {
  return signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

async function adminSessionCookie(): Promise<string> {
  const credential = await signInAs('admin@seed.jrm');
  const idToken = await credential.user.getIdToken();
  return adminAuth.createSessionCookie(idToken, { expiresIn: 60 * 60 * 1000 });
}

function mockReq(
  method: 'POST' | 'PATCH',
  session: string,
  body: Record<string, unknown>,
): NextApiRequest {
  return {
    method,
    cookies: { session },
    body,
  } as unknown as NextApiRequest;
}

function mockRes(): NextApiResponse & JsonResponse {
  const res: Partial<NextApiResponse & JsonResponse> = {};
  res.status = jest.fn((statusCode: number) => {
    res.statusCode = statusCode;
    return res as NextApiResponse;
  });
  res.json = jest.fn((body: unknown) => {
    res.body = body;
    return res as NextApiResponse;
  });
  return res as NextApiResponse & JsonResponse;
}

describe('services/projects/users.service and adminUsers integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('reads the current app user and lists users by role through Firestore rules', async () => {
    await signInAs('admin@seed.jrm');

    await expect(getAppUser('seed-admin')).resolves.toMatchObject({
      id: 'seed-admin',
      name: 'Admin Seed',
      roles: ['admin'],
      active: true,
    });

    const users = await listUsers();
    expect(users.map(user => user.id).sort()).toEqual([
      'seed-admin',
      'seed-assembler',
      'seed-designer',
      'seed-seller',
      'seed-woodworker',
    ]);

    await expect(listUsersByRole('designer')).resolves.toEqual([
      expect.objectContaining({
        id: 'seed-designer',
        email: 'desenhista@seed.jrm',
        roles: ['designer'],
      }),
    ]);
  });

  it('creates and updates users through the admin API backed by Auth and Firestore', async () => {
    const session = await adminSessionCookie();

    const createRes = mockRes();
    await handler(
      mockReq('POST', session, {
        name: 'Usuaria Integracao',
        email: 'integracao@seed.jrm',
        phone: '(11) 99999-0000',
        password: 'Seed@12345',
        roles: ['seller'],
      }),
      createRes,
    );

    expect(createRes.statusCode).toBe(201);
    expect(createRes.body).toEqual({ id: expect.any(String) });
    const createdId = (createRes.body as { id: string }).id;

    await expect(adminAuth.getUser(createdId)).resolves.toMatchObject({
      uid: createdId,
      email: 'integracao@seed.jrm',
      displayName: 'Usuaria Integracao',
    });
    expect((await adminDb.doc(userPath(createdId)).get()).data()).toMatchObject(
      {
        name: 'Usuaria Integracao',
        email: 'integracao@seed.jrm',
        phone: '+5511999990000',
        roles: ['seller'],
        active: true,
      },
    );

    const updateRes = mockRes();
    await handler(
      mockReq('PATCH', session, {
        id: createdId,
        name: 'Usuaria Editada',
        phone: '(21) 98888-7777',
        roles: ['designer'],
        active: false,
      }),
      updateRes,
    );

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body).toEqual({ id: createdId });
    await expect(adminAuth.getUser(createdId)).resolves.toMatchObject({
      displayName: 'Usuaria Editada',
    });
    expect((await adminDb.doc(userPath(createdId)).get()).data()).toMatchObject(
      {
        name: 'Usuaria Editada',
        phone: '+5521988887777',
        roles: ['designer'],
        active: false,
      },
    );
  });

  it('routes adminUsers create/update helpers through the admin API endpoint', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ id: 'created-user' }),
    });
    global.fetch = fetchMock;

    await expect(
      createAdminUser({
        name: 'Nova',
        email: 'nova@example.com',
        password: 'Seed@12345',
        roles: ['seller'],
      }),
    ).resolves.toEqual({ id: 'created-user' });
    await expect(
      updateAdminUser({
        id: 'created-user',
        active: false,
        roles: ['designer'],
      }),
    ).resolves.toEqual({ id: 'created-user' });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/admin/users',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/admin/users',
      expect.objectContaining({ method: 'PATCH' }),
    );

    global.fetch = originalFetch;
  });
});
