import { NextApiRequest, NextApiResponse } from 'next';

import { adminDb } from '@/services/firebaseAdmin';
import {
  ClientPortalAuthError,
  requireClientProject,
} from '@/services/projects/clientPortal.server';
import {
  itemAttachmentsPath,
  projectItemsPath,
} from '@/services/projects/paths';
import { getSignedReadUrl } from '@/services/projects/storageSignedUrl.server';
import {
  Attachment,
  ClientAttachmentDTO,
  ClientProjectDTO,
  Project,
  ProjectItem,
} from '@/types/projects';
import { inferAttachmentFileKind } from '@/utils/projects/attachments';
import { getClientStatusLabel } from '@/utils/projects/status';

const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

function toIsoString(
  value: { toDate: () => Date } | Date | undefined,
): string | undefined {
  if (!value) return undefined;
  const date = value instanceof Date ? value : value.toDate();
  return date.toISOString();
}

async function signedAttachmentUrl(storagePath: string): Promise<string> {
  return getSignedReadUrl(storagePath, Date.now() + SIGNED_URL_TTL_MS);
}

async function clientAttachmentsForItem(
  projectId: string,
  itemId: string,
): Promise<ClientAttachmentDTO[]> {
  const snap = await adminDb
    .collection(itemAttachmentsPath(projectId, itemId))
    .get();
  const attachments = snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }) as Attachment)
    .filter(attachment => attachment.audience.client);

  return Promise.all(
    attachments.map(async attachment => {
      const fileName = attachment.originalFileName || attachment.fileName;
      const fileKind =
        attachment.fileKind ??
        inferAttachmentFileKind({ name: fileName, type: attachment.mimeType });

      return {
        fileName,
        mimeType: attachment.mimeType,
        ...(fileKind === 'model_3d' ? { fileKind } : {}),
        url: await signedAttachmentUrl(attachment.storagePath),
      };
    }),
  );
}

async function buildClientProjectDTO(
  project: Project,
): Promise<ClientProjectDTO> {
  const itemsSnap = await adminDb
    .collection(projectItemsPath(project.id))
    .get();
  const items = await Promise.all(
    itemsSnap.docs.map(async itemDoc => {
      const item = { id: itemDoc.id, ...itemDoc.data() } as ProjectItem;
      return {
        itemId: item.id,
        name: item.name,
        environment: item.environment,
        customerAmount: item.budget?.customerAmount,
        approvalStatus: item.clientApprovalStatus,
        clientStatusLabel: getClientStatusLabel(item.status),
        estimatedDeliveryDate: toIsoString(item.estimatedDeliveryDate),
        attachments: await clientAttachmentsForItem(project.id, item.id),
      };
    }),
  );

  return {
    projectId: project.id,
    customerName: project.customerName,
    sellerContactPhone: undefined,
    expiresAt: toIsoString(project.clientLinkExpiresAt),
    items,
  };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const project = await requireClientProject(req);

    return res.status(200).json(await buildClientProjectDTO(project));
  } catch (error) {
    if (error instanceof ClientPortalAuthError) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error('Client project DTO error:', error);
    return res.status(500).json({ error: 'Erro inesperado.' });
  }
}

export default handler;
