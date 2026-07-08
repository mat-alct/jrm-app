import { useQuery, UseQueryResult } from '@tanstack/react-query';
import {
  collection,
  collectionGroup,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';

import { ProjectItem, ProjectItemVersion } from '@/types/projects';

import { uploadAttachment } from './attachment.service';
import { db } from '../firebase';
import { itemVersionsPath } from './paths';
import { updateProjectItem } from './projectItem.service';
import { StatusActor, updateItemStatus } from './status.service';

// Collection group query em `items` filtrada por designerId — Firestore pede
// um indice de collection group para o campo `designerId` na primeira
// execucao; o link para criar aparece no erro do console (Firestore >
// Indexes > Add collection group index em `items`, campo `designerId`).
export async function getDesignerQueue(
  designerId: string,
): Promise<ProjectItem[]> {
  const snap = await getDocs(
    query(collectionGroup(db, 'items'), where('designerId', '==', designerId)),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ProjectItem);
}

export function useDesignerQueue(
  designerId: string | undefined,
): UseQueryResult<ProjectItem[]> {
  return useQuery({
    queryKey: ['projects', 'designerQueue', designerId],
    queryFn: () => getDesignerQueue(designerId as string),
    enabled: !!designerId,
  });
}

function nextVersionNumber(existing: ProjectItemVersion[]): number {
  return existing.reduce((max, v) => Math.max(max, v.versionNumber), 0) + 1;
}

export async function listItemVersions(
  projectId: string,
  itemId: string,
): Promise<ProjectItemVersion[]> {
  const snap = await getDocs(
    collection(db, itemVersionsPath(projectId, itemId)),
  );
  return snap.docs
    .map(d => d.data() as ProjectItemVersion)
    .sort((a, b) => b.versionNumber - a.versionNumber);
}

export function useItemVersions(
  projectId: string,
  itemId: string,
): UseQueryResult<ProjectItemVersion[]> {
  return useQuery({
    queryKey: ['projects', projectId, 'items', itemId, 'versions'],
    queryFn: () => listItemVersions(projectId, itemId),
    enabled: !!projectId && !!itemId,
  });
}

export async function submitDesignerVersion(
  projectId: string,
  itemId: string,
  files: File[],
  description: string | undefined,
  actor: StatusActor,
): Promise<string> {
  const versionsSnap = await getDocs(
    collection(db, itemVersionsPath(projectId, itemId)),
  );
  const existingVersions = versionsSnap.docs.map(
    d => d.data() as ProjectItemVersion,
  );
  const versionNumber = nextVersionNumber(existingVersions);

  const attachmentIds: string[] = [];
  for (const file of files) {
    // eslint-disable-next-line no-await-in-loop
    const attachment = await uploadAttachment({
      projectId,
      itemId,
      file,
      category: `versao-${versionNumber}`,
      visibility: 'client',
      uploadedBy: actor.uid,
      uploadedByRole: 'designer',
    });
    attachmentIds.push(attachment.id);
  }

  const versionRef = doc(collection(db, itemVersionsPath(projectId, itemId)));
  const version: ProjectItemVersion = {
    id: versionRef.id,
    projectId,
    itemId,
    versionNumber,
    ...(description ? { description } : {}),
    attachmentIds,
    createdBy: actor.uid,
    createdAt: Timestamp.now(),
    visibleToClient: true,
  };
  await setDoc(versionRef, version);

  await updateProjectItem(
    projectId,
    itemId,
    { currentVersionId: versionRef.id },
    actor.uid,
  );

  await updateItemStatus(projectId, itemId, 'projeto_desenhado', actor);
  await updateItemStatus(
    projectId,
    itemId,
    'aguardando_aprovacao_cliente',
    actor,
  );

  return versionRef.id;
}
