import { parse } from 'cookie';
import { NextApiRequest } from 'next';

import { AppUser, UserRole } from '@/types/projects';

import { adminAuth, adminDb } from '../firebaseAdmin';
import { userPath } from './paths';

export class ApiAuthError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ApiAuthError';
    this.statusCode = statusCode;
  }
}

export interface InternalApiUser extends AppUser {
  uid: string;
}

export async function requireInternalUser(
  req: NextApiRequest,
  allowedRoles: UserRole[],
): Promise<InternalApiUser> {
  const sessionCookie = parse(req.headers.cookie ?? '').session;
  if (!sessionCookie) {
    throw new ApiAuthError(401, 'Sessao interna obrigatoria.');
  }

  let decoded: { uid: string };
  try {
    decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    throw new ApiAuthError(401, 'Sessao interna invalida.');
  }
  const userSnap = await adminDb.doc(userPath(decoded.uid)).get();
  if (!userSnap.exists) {
    throw new ApiAuthError(403, 'Usuario interno sem perfil.');
  }

  const appUser = {
    uid: decoded.uid,
    id: userSnap.id,
    ...userSnap.data(),
  } as InternalApiUser;

  const hasAllowedRole = appUser.active
    ? appUser.roles.some(role => allowedRoles.includes(role))
    : false;
  if (!hasAllowedRole) {
    throw new ApiAuthError(403, 'Permissao insuficiente.');
  }

  return appUser;
}
