import { NextApiRequest, NextApiResponse } from 'next';

import {
  ClientPortalAuthError,
  requireClientProject,
} from '@/services/projects/clientPortal.server';
import { approveAllClientItems } from '@/services/projects/statusAdmin.service';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const project = await requireClientProject(req);
    const approvedCount = await approveAllClientItems(project.id);
    return res.status(200).json({ status: true, approvedCount });
  } catch (error) {
    if (error instanceof ClientPortalAuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Client approve all error:', error);
    return res.status(500).json({ error: 'Erro inesperado.' });
  }
}

export default handler;
