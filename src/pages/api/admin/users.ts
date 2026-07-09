import { Timestamp } from 'firebase-admin/firestore';
import { NextApiRequest, NextApiResponse } from 'next';

import { adminAuth, adminDb } from '@/services/firebaseAdmin';
import { userPath } from '@/services/projects/paths';
import { AppUser, UserRole } from '@/types/projects';
import { toE164BR } from '@/utils/phone';

const ALL_ROLES: UserRole[] = [
  'admin',
  'seller',
  'designer',
  'assembler',
  'woodworker',
];

function isValidRoles(roles: unknown): roles is UserRole[] {
  return (
    Array.isArray(roles) &&
    roles.length > 0 &&
    roles.every(role => ALL_ROLES.includes(role))
  );
}

async function getRequestingAdminUid(
  req: NextApiRequest,
): Promise<string | null> {
  const sessionCookie = req.cookies.session;
  if (!sessionCookie) return null;

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    const snap = await adminDb.doc(userPath(decoded.uid)).get();
    if (!snap.exists) return null;

    const data = snap.data() as AppUser;
    if (!data.roles?.includes('admin')) return null;

    return decoded.uid;
  } catch {
    return null;
  }
}

async function handleCreate(req: NextApiRequest, res: NextApiResponse) {
  const { name, email, phone, password, roles } = req.body ?? {};

  if (!name || !email || !password || !isValidRoles(roles)) {
    return res.status(400).json({ error: 'Dados inválidos.' });
  }

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    const now = Timestamp.now();
    await adminDb
      .doc(userPath(userRecord.uid))
      .set({
        name,
        email,
        ...(phone ? { phone: toE164BR(phone) ?? phone.trim() } : {}),
        roles,
        active: true,
        createdAt: now,
        updatedAt: now,
      });

    return res.status(201).json({ id: userRecord.uid });
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/email-already-exists') {
      return res
        .status(409)
        .json({ error: 'Já existe um usuário com esse e-mail.' });
    }
    if (code === 'auth/invalid-email') {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }
    if (code === 'auth/invalid-password') {
      return res
        .status(400)
        .json({ error: 'Senha inválida. Use ao menos 6 caracteres.' });
    }

    console.error('admin/users POST error', error);
    return res.status(500).json({ error: 'Erro ao criar usuário.' });
  }
}

async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
  const { id, name, phone, roles, active } = req.body ?? {};

  if (!id) {
    return res.status(400).json({ error: 'id é obrigatório.' });
  }

  if (roles !== undefined && !isValidRoles(roles)) {
    return res.status(400).json({ error: 'roles inválidos.' });
  }

  const update: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = toE164BR(phone) ?? phone.trim();
  if (roles !== undefined) update.roles = roles;
  if (active !== undefined) update.active = !!active;

  try {
    if (name !== undefined) {
      await adminAuth.updateUser(id, { displayName: name });
    }
    await adminDb.doc(userPath(id)).update(update);
    return res.status(200).json({ id });
  } catch (error) {
    console.error('admin/users PATCH error', error);
    return res.status(500).json({ error: 'Erro ao atualizar usuário.' });
  }
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const adminUid = await getRequestingAdminUid(req);
  if (!adminUid) {
    return res
      .status(403)
      .json({ error: 'Acesso restrito a administradores.' });
  }

  if (req.method === 'POST') {
    return handleCreate(req, res);
  }

  return handleUpdate(req, res);
};

export default handler;
