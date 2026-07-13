import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { NextApiRequest, NextApiResponse } from 'next';

import provisionHandler from '@/pages/api/client-access/provision';
import verifyHandler from '@/pages/api/client-access/verify';
import { auth } from '@/services/firebase';
import { adminAuth, adminDb } from '@/services/firebaseAdmin';
import { verifyAccessCode } from '@/services/projects/clientAccess.service';
import { requireClientProject } from '@/services/projects/clientPortal.server';
import { requireInternalUser } from '@/services/projects/internalAuth.server';
import { projectPath } from '@/services/projects/paths';
import { resetEmulator } from '@/tests/helpers/emulator';
import { SEED_USER_PASSWORD, seedEmulator } from '@/tests/helpers/seedEmulator';

type JsonResponse = {
  statusCode?: number;
  body?: unknown;
  headers: Record<string, string | string[]>;
};

async function signInAs(email: string) {
  return signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

async function internalSessionCookie(
  email = 'admin@seed.jrm',
): Promise<string> {
  const credential = await signInAs(email);
  const idToken = await credential.user.getIdToken();
  return adminAuth.createSessionCookie(idToken, { expiresIn: 60 * 60 * 1000 });
}

function mockReq(input: {
  method: 'GET' | 'POST';
  body?: Record<string, unknown>;
  cookie?: string;
}): NextApiRequest {
  return {
    method: input.method,
    body: input.body ?? {},
    headers: input.cookie ? { cookie: input.cookie } : {},
  } as unknown as NextApiRequest;
}

function mockRes(): NextApiResponse & JsonResponse {
  const res: Partial<NextApiResponse & JsonResponse> = { headers: {} };
  res.status = jest.fn((statusCode: number) => {
    res.statusCode = statusCode;
    return res as NextApiResponse;
  });
  res.json = jest.fn((body: unknown) => {
    res.body = body;
    return res as NextApiResponse;
  });
  const setHeader = jest.fn((name: string, value: string | string[]) => {
    res.headers![name] = value;
    return res as NextApiResponse;
  });
  (res as unknown as { setHeader: typeof setHeader }).setHeader = setHeader;
  return res as NextApiResponse & JsonResponse;
}

describe('services/projects/client access integration', () => {
  beforeEach(async () => {
    await resetEmulator();
    await seedEmulator();
  });

  afterEach(async () => {
    await signOut(auth);
  });

  it('provisions credentials, verifies access attempts, and validates the client portal session', async () => {
    const internalSession = await internalSessionCookie();
    await expect(
      requireInternalUser(
        mockReq({ method: 'GET', cookie: `session=${internalSession}` }),
        ['admin'],
      ),
    ).resolves.toMatchObject({
      uid: 'seed-admin',
      roles: ['admin'],
      active: true,
    });

    const provisionRes = mockRes();
    await provisionHandler(
      mockReq({
        method: 'POST',
        cookie: `session=${internalSession}`,
        body: { projectId: 'seed-project-1' },
      }),
      provisionRes,
    );

    expect(provisionRes.statusCode).toBe(200);
    expect(provisionRes.body).toEqual({
      publicId: expect.stringMatching(/^[0-9A-Za-z]{12}$/),
      accessCode: expect.stringMatching(/^[2-9A-HJ-NP-Z]{6}$/),
    });

    const credentials = provisionRes.body as {
      publicId: string;
      accessCode: string;
    };
    const provisionedProjectSnap = await adminDb
      .doc(projectPath('seed-project-1'))
      .get();
    const provisionedProject = provisionedProjectSnap.data();
    expect(provisionedProject).toMatchObject({
      clientAccessPublicId: credentials.publicId,
      clientAccessAttempts: 0,
      clientAccessLockUntil: null,
    });
    expect(
      verifyAccessCode(
        credentials.accessCode,
        provisionedProject?.clientAccessCodeHash,
      ),
    ).toBe(true);

    const failedVerifyRes = mockRes();
    await verifyHandler(
      mockReq({
        method: 'POST',
        body: {
          publicId: credentials.publicId,
          accessCode: 'ERRADO',
        },
      }),
      failedVerifyRes,
    );

    expect(failedVerifyRes.statusCode).toBe(401);
    expect(
      (await adminDb.doc(projectPath('seed-project-1')).get()).data(),
    ).toMatchObject({
      clientAccessAttempts: 1,
      clientAccessLockUntil: null,
    });

    const verifyRes = mockRes();
    await verifyHandler(
      mockReq({
        method: 'POST',
        body: {
          publicId: credentials.publicId,
          accessCode: credentials.accessCode,
        },
      }),
      verifyRes,
    );

    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.body).toEqual({ status: true });
    expect(
      (await adminDb.doc(projectPath('seed-project-1')).get()).data(),
    ).toMatchObject({
      clientAccessAttempts: 0,
      clientAccessLockUntil: null,
    });

    const clientCookie = verifyRes.headers['Set-Cookie'];
    expect(clientCookie).toEqual(expect.stringContaining('client_session='));
    await expect(
      requireClientProject(
        mockReq({ method: 'GET', cookie: clientCookie as string }),
      ),
    ).resolves.toMatchObject({
      id: 'seed-project-1',
      clientAccessPublicId: credentials.publicId,
      customerName: 'Cliente Seed 1',
    });
  });
});
