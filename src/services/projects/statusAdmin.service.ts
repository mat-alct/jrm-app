import { Timestamp as AdminTimestamp } from 'firebase-admin/firestore';

import {
  ClientApprovalStatus,
  ProjectItem,
  ProjectItemStatus,
  ProjectItemSummary,
} from '@/types/projects';
import { canTransition, isFinalStatus } from '@/utils/projects/status';

import { adminDb } from '../firebaseAdmin';
import {
  itemStatusHistoryPath,
  projectItemPath,
  projectItemsPath,
  projectPath,
} from './paths';

export class ClientStatusTransitionError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.name = 'ClientStatusTransitionError';
    this.statusCode = statusCode;
  }
}

function approvalStatusFor(
  status: ProjectItemStatus,
): ClientApprovalStatus | undefined {
  switch (status) {
    case 'aprovado':
      return 'aprovado';
    case 'recusado_pelo_cliente':
      return 'recusado';
    case 'alteracao_solicitada':
      return 'alteracao_solicitada';
    default:
      return undefined;
  }
}

function timestampFieldFor(status: ProjectItemStatus): string | undefined {
  switch (status) {
    case 'aprovado':
      return 'approvedAt';
    case 'recusado_pelo_cliente':
      return 'rejectedAt';
    case 'alteracao_solicitada':
      return 'changeRequestedAt';
    default:
      return undefined;
  }
}

function emptySummary(): ProjectItemSummary {
  return {
    total: 0,
    aguardandoAprovacao: 0,
    aprovados: 0,
    emProducao: 0,
    emMontagem: 0,
    finalizados: 0,
    atrasados: 0,
  };
}

export async function recalculateProjectSummaryAdmin(
  projectId: string,
): Promise<void> {
  const snap = await adminDb.collection(projectItemsPath(projectId)).get();
  const now = Date.now();
  const summary = snap.docs.reduce((acc, doc) => {
    const item = doc.data() as ProjectItem;
    acc.total += 1;
    if (item.status === 'aguardando_aprovacao_cliente') {
      acc.aguardandoAprovacao += 1;
    }
    if (item.status === 'aprovado') acc.aprovados += 1;
    if (item.status === 'em_producao') acc.emProducao += 1;
    if (item.status === 'em_montagem') acc.emMontagem += 1;
    if (isFinalStatus(item.status)) acc.finalizados += 1;
    if (
      item.deadlineCurrent &&
      item.deadlineCurrent.toDate().getTime() < now &&
      !isFinalStatus(item.status)
    ) {
      acc.atrasados += 1;
    }
    return acc;
  }, emptySummary());

  await adminDb.doc(projectPath(projectId)).update({ itemSummary: summary });
}

export async function applyClientItemTransition(
  projectId: string,
  itemId: string,
  nextStatus: ProjectItemStatus,
  note?: string,
): Promise<void> {
  const itemRef = adminDb.doc(projectItemPath(projectId, itemId));
  const itemSnap = await itemRef.get();
  if (!itemSnap.exists) {
    throw new ClientStatusTransitionError(404, 'Item nao encontrado.');
  }

  const item = { id: itemSnap.id, ...itemSnap.data() } as ProjectItem;
  if (item.status === 'aprovado' && nextStatus !== 'aprovado') {
    throw new ClientStatusTransitionError(
      409,
      'Item aprovado nao pode ser recusado ou alterado pelo link.',
    );
  }
  if (!canTransition(item.status, nextStatus)) {
    throw new ClientStatusTransitionError(409, 'Transicao nao permitida.');
  }

  const now = AdminTimestamp.now();
  const timestampField = timestampFieldFor(nextStatus);
  const approvalStatus = approvalStatusFor(nextStatus);

  await itemRef.update({
    status: nextStatus,
    ...(approvalStatus ? { clientApprovalStatus: approvalStatus } : {}),
    ...(timestampField ? { [timestampField]: now } : {}),
    updatedAt: now,
    updatedBy: 'client',
  });

  const historyRef = adminDb.collection(itemStatusHistoryPath(projectId, itemId)).doc();
  await historyRef.set({
    id: historyRef.id,
    projectId,
    itemId,
    fromStatus: item.status,
    toStatus: nextStatus,
    changedBy: 'client',
    changedByRole: 'client',
    note: note ?? null,
    createdAt: now,
  });

  await recalculateProjectSummaryAdmin(projectId);
}

export async function approveAllClientItems(projectId: string): Promise<number> {
  const snap = await adminDb.collection(projectItemsPath(projectId)).get();
  const pendingItems = snap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }) as ProjectItem)
    .filter(item => item.status === 'aguardando_aprovacao_cliente');

  for (const item of pendingItems) {
    await applyClientItemTransition(projectId, item.id, 'aprovado');
  }

  return pendingItems.length;
}
