import { parse } from 'cookie';
import { NextApiRequest } from 'next';

import { Project } from '@/types/projects';

import { adminDb } from '../firebaseAdmin';
import { isLinkExpired } from './clientAccess.service';
import { verifyClientSession } from './clientSession';

export class ClientPortalAuthError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ClientPortalAuthError';
    this.statusCode = statusCode;
  }
}

export async function requireClientProject(
  req: NextApiRequest,
): Promise<Project> {
  const token = parse(req.headers.cookie ?? '').client_session;
  const session = verifyClientSession(token);
  if (!session) {
    throw new ClientPortalAuthError(401, 'Sessao do cliente invalida.');
  }

  const projectQuery = await adminDb
    .collection('projects')
    .where('clientAccessPublicId', '==', session.publicId)
    .limit(1)
    .get();

  if (projectQuery.empty) {
    throw new ClientPortalAuthError(404, 'Projeto nao encontrado.');
  }

  const projectSnap = projectQuery.docs[0];
  const project = { id: projectSnap.id, ...projectSnap.data() } as Project;
  if (isLinkExpired(project)) {
    throw new ClientPortalAuthError(410, 'Link expirado.');
  }

  return project;
}
