import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';
import {
  collection,
  collectionGroup,
  deleteField,
  doc,
  getDocs,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import {
  AppUser,
  ProjectItem,
  ProjectItemStatus,
  ProjectItemVersion,
} from '@/types/projects';

import { db } from '../firebase';
import { uploadAttachment } from './attachment.service';
import { computeDeadline, getDeadlineDefaults } from './deadline.service';
import { itemVersionsPath, projectItemPath } from './paths';
import { updateProjectItem } from './projectItem.service';
import { StatusActor, updateItemStatus } from './status.service';

const DESIGN_QUEUE_STATUSES: ProjectItemStatus[] = [
  'aguardando_desenho',
  'alteracao_solicitada',
];

export async function getDesignQueue(): Promise<ProjectItem[]> {
  const snap = await getDocs(
    query(
      collectionGroup(db, 'items'),
      where('status', 'in', DESIGN_QUEUE_STATUSES),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ProjectItem);
}

export function useDesignQueue(enabled = true): UseQueryResult<ProjectItem[]> {
  return useQuery({
    queryKey: ['projects', 'designQueue'],
    queryFn: getDesignQueue,
    enabled,
  });
}

/**
 * Vendedor/admin libera o item para desenho sem escolher desenhista — ele entra
 * na fila compartilhada e qualquer desenhista pode assumi-lo.
 */
export async function approveItemForDesign(
  projectId: string,
  itemId: string,
  actor: StatusActor,
): Promise<void> {
  const defaults = await getDeadlineDefaults();
  const deadlineCurrent = computeDeadline('aguardando_desenho', defaults);
  if (deadlineCurrent) {
    await updateProjectItem(
      projectId,
      itemId,
      { deadlineCurrent },
      actor.uid,
      { recalculateSummary: false },
    );
  }
  await updateItemStatus(projectId, itemId, 'aguardando_desenho', actor);
}

export class DesignClaimError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DesignClaimError';
  }
}

/**
 * Desenhista assume um item da fila compartilhada. So grava se ainda nao houver
 * desenhista atribuido — usa transacao para evitar corrida entre dois desenhistas.
 */
export async function claimDesignItem(
  projectId: string,
  itemId: string,
  actor: { uid: string; name?: string },
): Promise<void> {
  const itemRef = doc(db, projectItemPath(projectId, itemId));

  await runTransaction(db, async transaction => {
    const snap = await transaction.get(itemRef);
    if (!snap.exists()) {
      throw new DesignClaimError(
        `Item ${itemId} nao encontrado no projeto ${projectId}`,
      );
    }
    const current = snap.data() as ProjectItem;
    if (current.designerId) {
      throw new DesignClaimError(
        'Este item ja foi assumido por outro desenhista.',
      );
    }

    transaction.update(itemRef, {
      designerId: actor.uid,
      ...(actor.name ? { designerName: actor.name } : {}),
      updatedAt: Timestamp.now(),
      updatedBy: actor.uid,
    });
  });
}

/**
 * Admin atribui/reatribui o desenhista por nome (opcoes rapidas Renato/Marcio ou
 * "Outros" livre). Se o nome bater com um desenhista ativo, grava designerId
 * tambem; senao fica so o nome (limpa designerId anterior, se houver).
 */
export async function assignDesignerByName(
  projectId: string,
  itemId: string,
  name: string,
  activeDesigners: Pick<AppUser, 'id' | 'name'>[],
  actor: { uid: string },
): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Informe o nome do desenhista.');
  }
  const matched = activeDesigners.find(
    designer => designer.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );

  const itemRef = doc(db, projectItemPath(projectId, itemId));
  await updateDoc(itemRef, {
    designerName: matched ? matched.name : trimmed,
    designerId: matched ? matched.id : deleteField(),
    updatedAt: Timestamp.now(),
    updatedBy: actor.uid,
  });
}

export function useAssignDesignerByName(): UseMutationResult<
  void,
  Error,
  {
    projectId: string;
    itemId: string;
    name: string;
    activeDesigners: Pick<AppUser, 'id' | 'name'>[];
    actor: { uid: string };
  }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, itemId, name, activeDesigners, actor }) =>
      assignDesignerByName(projectId, itemId, name, activeDesigners, actor),
    onSuccess: (_data, { projectId, itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', 'designQueue'],
      });
    },
  });
}

export function useClaimDesignItem(): UseMutationResult<
  void,
  Error,
  { projectId: string; itemId: string; actor: { uid: string; name?: string } }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, itemId, actor }) =>
      claimDesignItem(projectId, itemId, actor),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', 'designQueue'],
      });
    },
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
    const attachment = await uploadAttachment({
      projectId,
      itemId,
      file,
      category: `versao-${versionNumber}`,
      uploadedBy: actor.uid,
      uploadedByName: actor.name,
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
    { recalculateSummary: false },
  );

  await updateItemStatus(projectId, itemId, 'aguardando_orcamento', actor);

  return versionRef.id;
}
