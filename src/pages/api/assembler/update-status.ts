import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';
import { NextApiRequest, NextApiResponse } from 'next';

import { adminDb } from '@/services/firebaseAdmin';
import { canAssemblerTransition } from '@/services/projects/assembler.service';
import {
  ApiAuthError,
  requireInternalUser,
} from '@/services/projects/internalAuth.server';
import {
  itemAssemblerAssignmentPath,
  itemStatusHistoryPath,
  projectItemPath,
} from '@/services/projects/paths';
import { recalculateProjectSummaryAdmin } from '@/services/projects/statusAdmin.service';
import { ProjectItem, ProjectItemStatus } from '@/types/projects';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const user = await requireInternalUser(req, ['assembler']);
    const { projectId, itemId, nextStatus } = req.body as {
      projectId?: string;
      itemId?: string;
      nextStatus?: ProjectItemStatus;
    };

    if (!projectId || !itemId || !nextStatus) {
      return res
        .status(400)
        .json({ error: 'projectId, itemId e nextStatus obrigatorios.' });
    }

    const assignmentRef = adminDb.doc(
      itemAssemblerAssignmentPath(projectId, itemId, user.uid),
    );
    const assignmentSnap = await assignmentRef.get();
    if (!assignmentSnap.exists) {
      return res.status(403).json({ error: 'Item nao atribuido ao montador.' });
    }

    const itemRef = adminDb.doc(projectItemPath(projectId, itemId));
    const itemSnap = await itemRef.get();
    if (!itemSnap.exists) {
      return res.status(404).json({ error: 'Item nao encontrado.' });
    }

    const item = { id: itemSnap.id, ...itemSnap.data() } as ProjectItem;
    if (!canAssemblerTransition(item.status, nextStatus)) {
      return res.status(409).json({ error: 'Transicao nao permitida.' });
    }

    const now = AdminTimestamp.now();
    await itemRef.update({
      status: nextStatus,
      updatedAt: now,
      updatedBy: user.uid,
      ...(nextStatus === 'montagem_concluida' ? { completedAt: now } : {}),
    });
    await assignmentRef.update({
      itemStatus: nextStatus,
      updatedAt: now,
      ...(nextStatus === 'montagem_concluida' ? { completedAt: now } : {}),
    });

    const historyRef = adminDb
      .collection(itemStatusHistoryPath(projectId, itemId))
      .doc();
    await historyRef.set({
      id: historyRef.id,
      projectId,
      itemId,
      fromStatus: item.status,
      toStatus: nextStatus,
      changedBy: user.uid,
      ...(user.name ? { changedByName: user.name } : {}),
      changedByRole: 'assembler',
      note: null,
      createdAt: now,
    });

    await recalculateProjectSummaryAdmin(projectId);
    return res.status(200).json({ status: true });
  } catch (error) {
    if (error instanceof ApiAuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Assembler status update error:', error);
    return res.status(500).json({ error: 'Erro inesperado.' });
  }
}

export default handler;
