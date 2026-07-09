import { addMonths } from 'date-fns';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { ProjectItem, ProjectItemStatus, UserRole } from '@/types/projects';

import { canTransition, isFinalStatus } from '../../utils/projects/status';
import { db } from '../firebase';
import {
  itemAssemblerAssignmentsPath,
  itemStatusHistoryPath,
  projectItemPath,
  projectItemsPath,
  projectPath,
} from './paths';
import { recalculateProjectSummary } from './summary';

export interface StatusActor {
  uid: string;
  name?: string;
  role: UserRole | 'client';
}

export class InvalidStatusTransitionError extends Error {
  constructor(from: ProjectItemStatus, to: ProjectItemStatus) {
    super(`Transição de status invalida: ${from} -> ${to}`);
    this.name = 'InvalidStatusTransitionError';
  }
}

function itemTimestampFieldFor(
  next: ProjectItemStatus,
): keyof Pick<
  ProjectItem,
  'approvedAt' | 'rejectedAt' | 'changeRequestedAt' | 'completedAt'
> | null {
  switch (next) {
    case 'aguardando_atribuicao_montador':
      return 'approvedAt';
    case 'recusado_pelo_cliente':
      return 'rejectedAt';
    case 'alteracao_solicitada':
      return 'changeRequestedAt';
    case 'finalizado':
      return 'completedAt';
    default:
      return null;
  }
}

async function releasePendingAssignments(
  projectId: string,
  itemId: string,
  now: Timestamp,
): Promise<void> {
  const assignmentsSnap = await getDocs(
    query(
      collection(db, itemAssemblerAssignmentsPath(projectId, itemId)),
      where('paymentStatus', '==', 'nao_liberado'),
    ),
  );
  if (assignmentsSnap.empty) return;

  const batch = writeBatch(db);
  assignmentsSnap.docs.forEach(assignmentDoc => {
    batch.update(assignmentDoc.ref, {
      paymentStatus: 'pendente',
      updatedAt: now,
    });
  });
  await batch.commit();
}

async function maybeCompleteProject(
  projectId: string,
  now: Timestamp,
): Promise<void> {
  const itemsSnap = await getDocs(collection(db, projectItemsPath(projectId)));
  const items = itemsSnap.docs.map(d => d.data() as ProjectItem);

  if (items.length === 0 || !items.every(item => isFinalStatus(item.status))) {
    return;
  }

  await updateDoc(doc(db, projectPath(projectId)), {
    completedAt: now,
    clientLinkExpiresAt: Timestamp.fromDate(addMonths(now.toDate(), 1)),
  });
}

export async function updateItemStatus(
  projectId: string,
  itemId: string,
  next: ProjectItemStatus,
  actor: StatusActor,
  note?: string,
): Promise<void> {
  const itemRef = doc(db, projectItemPath(projectId, itemId));
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) {
    throw new Error(`Item ${itemId} nao encontrado no projeto ${projectId}`);
  }

  const current = itemSnap.data() as ProjectItem;
  const isAdmin = actor.role === 'admin';

  if (!canTransition(current.status, next, { isAdmin })) {
    throw new InvalidStatusTransitionError(current.status, next);
  }

  const now = Timestamp.now();
  const timestampField = itemTimestampFieldFor(next);

  await updateDoc(itemRef, {
    status: next,
    updatedAt: now,
    updatedBy: actor.uid,
    ...(timestampField ? { [timestampField]: now } : {}),
  });

  const historyRef = doc(
    collection(db, itemStatusHistoryPath(projectId, itemId)),
  );
  await setDoc(historyRef, {
    id: historyRef.id,
    projectId,
    itemId,
    fromStatus: current.status,
    toStatus: next,
    changedBy: actor.uid,
    ...(actor.name ? { changedByName: actor.name } : {}),
    changedByRole: actor.role,
    note: note ?? null,
    createdAt: now,
  });

  if (next === 'aguardando_pagamento_montador') {
    await releasePendingAssignments(projectId, itemId, now);
  }

  await recalculateProjectSummary(projectId);

  if (isFinalStatus(next)) {
    await maybeCompleteProject(projectId, now);
  }
}
