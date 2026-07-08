import { NextApiRequest, NextApiResponse } from 'next';

import {
  generateClientCredentials,
  hashAccessCode,
  resetClientAccessAttempts,
} from '@/services/projects/clientAccess.service';
import { ApiAuthError, requireInternalUser } from '@/services/projects/internalAuth.server';
import { projectPath } from '@/services/projects/paths';
import { adminDb } from '@/services/firebaseAdmin';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await requireInternalUser(req, ['admin', 'seller']);

    const { projectId } = req.body as { projectId?: string };
    if (!projectId) {
      return res.status(400).json({ error: 'projectId obrigatorio.' });
    }

    const projectRef = adminDb.doc(projectPath(projectId));
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      return res.status(404).json({ error: 'Projeto nao encontrado.' });
    }

    const credentials = generateClientCredentials();
    await projectRef.update({
      clientAccessPublicId: credentials.publicId,
      clientAccessCodeHash: hashAccessCode(credentials.accessCode),
      ...resetClientAccessAttempts(),
    });

    return res.status(200).json({
      publicId: credentials.publicId,
      accessCode: credentials.accessCode,
    });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Client access provision error:', error);
    return res.status(500).json({ error: 'Erro inesperado.' });
  }
}

export default handler;
