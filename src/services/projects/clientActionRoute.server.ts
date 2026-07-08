import { NextApiRequest, NextApiResponse } from 'next';

import { ProjectItemStatus } from '@/types/projects';

import {
  ClientPortalAuthError,
  requireClientProject,
} from './clientPortal.server';
import {
  applyClientItemTransition,
  ClientStatusTransitionError,
} from './statusAdmin.service';

export async function handleClientItemTransitionRoute(
  req: NextApiRequest,
  res: NextApiResponse,
  nextStatus: ProjectItemStatus,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { itemId, note } = req.body as { itemId?: string; note?: string };
    if (!itemId) {
      return res.status(400).json({ error: 'itemId obrigatorio.' });
    }

    const project = await requireClientProject(req);
    await applyClientItemTransition(project.id, itemId, nextStatus, note);
    return res.status(200).json({ status: true });
  } catch (error) {
    if (
      error instanceof ClientPortalAuthError ||
      error instanceof ClientStatusTransitionError
    ) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Client item transition error:', error);
    return res.status(500).json({ error: 'Erro inesperado.' });
  }
}
