import { parse } from 'cookie';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { NextApiRequest, NextApiResponse } from 'next';

import { auth } from '@/services/firebase';
import { adminAuth } from '@/services/firebaseAdmin';

import { SEED_USER_PASSWORD } from './seedEmulator';

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

export interface TestApiResponse extends NextApiResponse {
  statusCode: number;
  body: unknown;
  headers: Record<string, string | string[]>;
}

export interface MockRequestInput {
  method: HttpMethod;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
  cookie?: string;
}

/**
 * Monta um NextApiRequest suficiente para os handlers do app: alguns leem
 * `req.headers.cookie` (parse manual) e outros `req.cookies` (parse do Next),
 * entao preenchemos os dois a partir da mesma string de cookie.
 */
export function mockReq(input: MockRequestInput): NextApiRequest {
  const cookie = input.cookie ?? '';
  return {
    method: input.method,
    body: input.body ?? {},
    query: input.query ?? {},
    headers: cookie ? { cookie } : {},
    cookies: cookie ? parse(cookie) : {},
  } as unknown as NextApiRequest;
}

export function mockRes(): TestApiResponse {
  const res = { headers: {} } as Partial<TestApiResponse>;

  res.status = jest.fn((statusCode: number) => {
    res.statusCode = statusCode;
    return res as TestApiResponse;
  }) as TestApiResponse['status'];

  res.json = jest.fn((body: unknown) => {
    res.body = body;
    return res as TestApiResponse;
  }) as TestApiResponse['json'];

  res.setHeader = jest.fn((name: string, value: string | string[]) => {
    res.headers![name] = value;
    return res as TestApiResponse;
  }) as TestApiResponse['setHeader'];

  res.end = jest.fn(() => res as TestApiResponse) as TestApiResponse['end'];

  return res as TestApiResponse;
}

export async function signInAs(email: string) {
  return signInWithEmailAndPassword(auth, email, SEED_USER_PASSWORD);
}

export async function signOutClient(): Promise<void> {
  await signOut(auth).catch(() => undefined);
}

/** idToken real emitido pelo Auth emulator. */
export async function idTokenFor(email: string): Promise<string> {
  const credential = await signInAs(email);
  return credential.user.getIdToken();
}

/** Cookie de sessao interno, do mesmo formato que /api/login produz. */
export async function internalSessionCookie(
  email = 'admin@seed.jrm',
): Promise<string> {
  const idToken = await idTokenFor(email);
  const sessionCookie = await adminAuth.createSessionCookie(idToken, {
    expiresIn: 60 * 60 * 1000,
  });
  return `session=${sessionCookie}`;
}

/** Extrai o valor de um cookie de um header Set-Cookie devolvido pelo handler. */
export function cookieFromResponse(
  res: TestApiResponse,
  name: string,
): string | undefined {
  const raw = res.headers['Set-Cookie'];
  const values = Array.isArray(raw) ? raw : [raw];
  for (const value of values) {
    if (typeof value === 'string' && value.startsWith(`${name}=`)) {
      const parsed = parse(value)[name];
      if (parsed) return `${name}=${parsed}`;
    }
  }
  return undefined;
}
