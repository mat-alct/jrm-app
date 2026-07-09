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
import { ref, uploadBytes } from 'firebase/storage';
import { v4 } from 'uuid';

import {
  AppUser,
  AssemblerAssignment,
  AssemblerPayment,
  AssemblerPaymentStatus,
} from '@/types/projects';

import { db, storage } from '../firebase';
import {
  ASSEMBLER_ASSIGNMENTS_SUBCOLLECTION,
  itemAssemblerAssignmentPath,
  paymentPath,
  paymentProofStoragePath,
  PAYMENTS_COLLECTION,
} from './paths';

export interface PendingByAssembler {
  assemblerId: string;
  assemblerName?: string;
  total: number;
  assignments: AssemblerAssignment[];
}

export interface CreateAssemblerPaymentParams {
  projectId: string;
  itemId: string;
  assignmentId: string;
  proofFile: File;
  paidBy: string;
  paidByName?: string;
}

export class PaymentServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentServiceError';
  }
}

function assertAdmin(actorRoles: AppUser['roles'] | undefined): void {
  if (!actorRoles?.includes('admin')) {
    throw new PaymentServiceError('Apenas administradores podem pagar montadores.');
  }
}

export function canCreateAssemblerPayment(
  paymentStatus: AssemblerPaymentStatus,
  hasProof: boolean,
): boolean {
  return paymentStatus === 'pendente' && hasProof;
}

export function canConfirmAssemblerPayment(
  payment: Pick<AssemblerPayment, 'assemblerId' | 'status'>,
  assemblerId: string,
): boolean {
  return payment.status === 'pago' && payment.assemblerId === assemblerId;
}

export function aggregatePendingByAssembler(
  assignments: AssemblerAssignment[],
): PendingByAssembler[] {
  const grouped = assignments
    .filter(assignment => assignment.paymentStatus === 'pendente')
    .reduce<Record<string, PendingByAssembler>>((acc, assignment) => {
      const current = acc[assignment.assemblerId] ?? {
        assemblerId: assignment.assemblerId,
        assemblerName: assignment.assemblerName,
        total: 0,
        assignments: [],
      };
      current.total += assignment.amountToReceive;
      current.assignments.push(assignment);
      acc[assignment.assemblerId] = current;
      return acc;
    }, {});

  return Object.values(grouped).sort((left, right) =>
    (left.assemblerName ?? left.assemblerId).localeCompare(
      right.assemblerName ?? right.assemblerId,
    ),
  );
}

export async function listPendingAssemblerAssignments(): Promise<
  AssemblerAssignment[]
> {
  const snap = await getDocs(
    query(
      collectionGroup(db, ASSEMBLER_ASSIGNMENTS_SUBCOLLECTION),
      where('paymentStatus', '==', 'pendente'),
    ),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AssemblerAssignment);
}

export async function listAssemblerPayments(
  assemblerId?: string,
): Promise<AssemblerPayment[]> {
  const paymentsQuery = assemblerId
    ? query(
        collection(db, PAYMENTS_COLLECTION),
        where('assemblerId', '==', assemblerId),
      )
    : collection(db, PAYMENTS_COLLECTION);
  const snap = await getDocs(paymentsQuery);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AssemblerPayment);
}

export async function createAssemblerPayment(
  params: CreateAssemblerPaymentParams,
  actor: Pick<AppUser, 'id' | 'roles'>,
): Promise<AssemblerPayment> {
  assertAdmin(actor.roles);
  if (!params.proofFile) {
    throw new PaymentServiceError('Comprovante obrigatorio.');
  }

  const assignmentRef = doc(
    db,
    itemAssemblerAssignmentPath(
      params.projectId,
      params.itemId,
      params.assignmentId,
    ),
  );
  const assignmentSnap = await getDoc(assignmentRef);
  if (!assignmentSnap.exists()) {
    throw new PaymentServiceError('Atribuicao nao encontrada.');
  }

  const assignment = {
    id: assignmentSnap.id,
    ...assignmentSnap.data(),
  } as AssemblerAssignment;
  if (!canCreateAssemblerPayment(assignment.paymentStatus, true)) {
    throw new PaymentServiceError('Pagamento nao liberado para esta atribuicao.');
  }

  const paymentId = v4();
  const proofStoragePath = paymentProofStoragePath(
    paymentId,
    v4(),
    params.proofFile.name,
  );
  await uploadBytes(ref(storage, proofStoragePath), params.proofFile, {
    contentType: params.proofFile.type,
  });

  const now = Timestamp.now();
  const payment: AssemblerPayment = {
    id: paymentId,
    projectId: params.projectId,
    itemId: params.itemId,
    assignmentId: params.assignmentId,
    assemblerId: assignment.assemblerId,
    assemblerName: assignment.assemblerName,
    amount: assignment.amountToReceive,
    status: 'pago',
    proofStoragePath,
    paidAt: now,
    paidBy: params.paidBy,
    ...(params.paidByName ? { paidByName: params.paidByName } : {}),
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, paymentPath(paymentId)), payment);
  await updateDoc(assignmentRef, {
    paymentStatus: 'pago',
    paidAt: now,
    paidBy: params.paidBy,
    paymentId,
    updatedAt: now,
  });

  return payment;
}

export async function confirmAssemblerPayment(
  paymentId: string,
  actor: Pick<AppUser, 'id' | 'roles'>,
): Promise<void> {
  if (!actor.roles.includes('assembler')) {
    throw new PaymentServiceError('Apenas o montador confirma recebimento.');
  }

  const paymentRef = doc(db, paymentPath(paymentId));
  const paymentSnap = await getDoc(paymentRef);
  if (!paymentSnap.exists()) {
    throw new PaymentServiceError('Pagamento nao encontrado.');
  }

  const payment = { id: paymentSnap.id, ...paymentSnap.data() } as AssemblerPayment;
  if (!canConfirmAssemblerPayment(payment, actor.id)) {
    throw new PaymentServiceError('Pagamento nao pode ser confirmado por este usuario.');
  }

  const now = Timestamp.now();
  await updateDoc(paymentRef, {
    status: 'confirmado_pelo_montador',
    confirmedAt: now,
    updatedAt: now,
  });
  await updateDoc(
    doc(
      db,
      itemAssemblerAssignmentPath(
        payment.projectId,
        payment.itemId,
        payment.assignmentId,
      ),
    ),
    {
      paymentStatus: 'confirmado_pelo_montador',
      paymentConfirmedAt: now,
      updatedAt: now,
    },
  );
}
