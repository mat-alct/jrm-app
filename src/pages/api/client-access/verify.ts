import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { NextApiRequest, NextApiResponse } from 'next';

import { adminDb } from '@/services/firebaseAdmin';
import {
  isClientAccessLocked,
  isLinkExpired,
  registerFailedClientAccessAttempt,
  resetClientAccessAttempts,
  verifyAccessCode,
} from '@/services/projects/clientAccess.service';
import {
  issueClientSession,
  serializeClientSessionCookie,
} from '@/services/projects/clientSession';
import { Project } from '@/types/projects';

function normalizeAttemptUpdate(
  update: ReturnType<typeof registerFailedClientAccessAttempt>,
) {
  return {
    clientAccessAttempts: update.clientAccessAttempts,
    clientAccessLockUntil: update.clientAccessLockUntil
      ? AdminTimestamp.fromDate(update.clientAccessLockUntil.toDate())
      : null,
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { publicId, accessCode } = req.body as {
    publicId?: string;
    accessCode?: string;
  };

  if (!publicId || !accessCode) {
    return res
      .status(400)
      .json({ error: 'publicId e accessCode obrigatorios.' });
  }

  try {
    const projectQuery = await adminDb
      .collection('projects')
      .where('clientAccessPublicId', '==', publicId)
      .limit(1)
      .get();

    if (projectQuery.empty) {
      return res.status(401).json({ error: 'Credenciais invalidas.' });
    }

    const projectSnap = projectQuery.docs[0];
    const project = { id: projectSnap.id, ...projectSnap.data() } as Project;

    if (isLinkExpired(project)) {
      return res.status(410).json({ error: 'Link expirado.' });
    }

    if (isClientAccessLocked(project)) {
      return res
        .status(429)
        .json({ error: 'Acesso temporariamente bloqueado.' });
    }

    if (!verifyAccessCode(accessCode, project.clientAccessCodeHash)) {
      const attemptUpdate = registerFailedClientAccessAttempt(project);
      await projectSnap.ref.update(normalizeAttemptUpdate(attemptUpdate));
      return res.status(401).json({ error: 'Credenciais invalidas.' });
    }

    // Emitida antes da escrita: se o segredo de sessao estiver ausente, o
    // request falha sem ter zerado as tentativas do projeto.
    const session = issueClientSession(publicId);

    await projectSnap.ref.update({ ...resetClientAccessAttempts() });

    res.setHeader(
      'Set-Cookie',
      serializeClientSessionCookie(session.token, session.expiresAt),
    );

    return res.status(200).json({ status: true });
  } catch (error) {
    console.error('Client access verify error:', error);
    return res.status(500).json({ error: 'Erro inesperado.' });
  }
}

export default handler;
