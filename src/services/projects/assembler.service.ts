import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import {
  AppUser,
  AssemblerAssignment,
  Project,
  ProjectItem,
  ProjectItemStatus,
  UserRole,
} from '@/types/projects';
import { canTransition } from '@/utils/projects/status';

import { db } from '../firebase';
import {
  ASSEMBLER_ASSIGNMENTS_SUBCOLLECTION,
  itemAssemblerAssignmentPath,
  itemAssemblerAssignmentsPath,
  projectItemPath,
  projectPath,
} from './paths';
import { updateItemStatus } from './status.service';

export interface AssignAssemblerInput {
  assemblerId: string;
  assemblerName?: string;
  amountToReceive: number;
  dueAt?: Timestamp;
}

export interface UpdateAssemblerAssignmentInput {
  amountToReceive?: number;
  assemblerName?: string;
  dueAt?: Timestamp | null;
}

export class AssemblerServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssemblerServiceError';
  }
}

function assertAdmin(actorRoles: UserRole[] | undefined): void {
  if (!actorRoles?.includes('admin')) {
    throw new AssemblerServiceError(
      'Apenas administradores podem alterar atribuicoes.',
    );
  }
}

function assertPositiveAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AssemblerServiceError('Valor a receber deve ser maior que zero.');
  }
}

export function canAssemblerTransition(
  from: ProjectItemStatus,
  to: ProjectItemStatus,
): boolean {
  const allowedTargets: ProjectItemStatus[] = [
    'em_producao',
    'pronto_para_montagem',
    'montagem_concluida',
  ];
  return allowedTargets.includes(to) && canTransition(from, to);
}

export function mapTelLink(phone?: string): string | undefined {
  const digits = phone?.replace(/\D/g, '');
  return digits ? `tel:${digits}` : undefined;
}

export function mapAddressLink(address?: string): string | undefined {
  if (!address?.trim()) return undefined;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address.trim(),
  )}`;
}

export function sortAssignmentsByDueDate(
  assignments: AssemblerAssignment[],
): AssemblerAssignment[] {
  return [...assignments].sort((left, right) => {
    const leftTime = left.dueAt?.toDate().getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightTime =
      right.dueAt?.toDate().getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });
}

export async function assignAssemblers(
  projectId: string,
  itemId: string,
  assignments: AssignAssemblerInput[],
  actor: Pick<AppUser, 'id' | 'name' | 'roles'>,
): Promise<AssemblerAssignment[]> {
  assertAdmin(actor.roles);
  if (assignments.length === 0) {
    throw new AssemblerServiceError('Informe ao menos um montador.');
  }

  const projectSnap = await getDoc(doc(db, projectPath(projectId)));
  const itemSnap = await getDoc(doc(db, projectItemPath(projectId, itemId)));
  if (!projectSnap.exists() || !itemSnap.exists()) {
    throw new AssemblerServiceError('Projeto ou item nao encontrado.');
  }

  const project = { id: projectSnap.id, ...projectSnap.data() } as Project;
  const item = { id: itemSnap.id, ...itemSnap.data() } as ProjectItem;

  if (!project.customerAddress?.trim()) {
    throw new AssemblerServiceError(
      'Preencha o endereço do cliente antes de atribuir um montador.',
    );
  }

  const now = Timestamp.now();

  const createdAssignments = assignments.map(input => {
    assertPositiveAmount(input.amountToReceive);
    return {
      id: input.assemblerId,
      projectId,
      itemId,
      assemblerId: input.assemblerId,
      assemblerName: input.assemblerName,
      customerName: project.customerName,
      customerPhone: project.customerPhone,
      customerAddress: project.customerAddress,
      itemName: item.name,
      itemEnvironment: item.environment,
      itemStatus: item.status,
      amountToReceive: input.amountToReceive,
      paymentStatus: 'nao_liberado',
      assignedAt: now,
      assignedBy: actor.id,
      ...(actor.name ? { assignedByName: actor.name } : {}),
      dueAt: input.dueAt ?? item.deadlineCurrent,
      createdAt: now,
      updatedAt: now,
    } satisfies AssemblerAssignment;
  });

  await Promise.all(
    createdAssignments.map(assignment =>
      setDoc(
        doc(db, itemAssemblerAssignmentPath(projectId, itemId, assignment.id)),
        assignment,
      ),
    ),
  );

  if (item.status === 'aguardando_atribuicao_montador') {
    await updateItemStatus(projectId, itemId, 'em_producao', {
      uid: actor.id,
      name: actor.name,
      role: 'admin',
    });
  }

  return createdAssignments;
}

export async function getAssemblerAssignments(
  assemblerId: string,
): Promise<AssemblerAssignment[]> {
  const snap = await getDocs(
    query(
      collectionGroup(db, ASSEMBLER_ASSIGNMENTS_SUBCOLLECTION),
      where('assemblerId', '==', assemblerId),
    ),
  );

  return sortAssignmentsByDueDate(
    snap.docs.map(d => ({ id: d.id, ...d.data() }) as AssemblerAssignment),
  );
}

export async function updateAssignment(
  projectId: string,
  itemId: string,
  assignmentId: string,
  input: UpdateAssemblerAssignmentInput,
  actor: Pick<AppUser, 'roles'>,
): Promise<void> {
  assertAdmin(actor.roles);
  if (
    input.amountToReceive !== undefined &&
    (!Number.isFinite(input.amountToReceive) || input.amountToReceive <= 0)
  ) {
    throw new AssemblerServiceError('Valor a receber deve ser maior que zero.');
  }

  const updates = {
    updatedAt: Timestamp.now(),
  } as {
    updatedAt: Timestamp;
    amountToReceive?: number;
    assemblerName?: string;
    dueAt?: Timestamp | null;
  };
  if (input.amountToReceive !== undefined) {
    updates.amountToReceive = input.amountToReceive;
  }
  if (input.assemblerName !== undefined) {
    updates.assemblerName = input.assemblerName;
  }
  if (input.dueAt !== undefined) {
    updates.dueAt = input.dueAt;
  }

  await updateDoc(
    doc(db, itemAssemblerAssignmentPath(projectId, itemId, assignmentId)),
    updates,
  );
}

export async function listItemAssemblerAssignments(
  projectId: string,
  itemId: string,
): Promise<AssemblerAssignment[]> {
  const snap = await getDocs(
    collection(db, itemAssemblerAssignmentsPath(projectId, itemId)),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AssemblerAssignment);
}
