import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

import { AppUser, ItemBudget, ItemBudgetLine, ProjectItem } from '@/types/projects';
import { isAdmin } from '@/utils/projects/permissions';

import { db } from '../firebase';
import { projectItemPath } from './paths';
import { updateItemStatus } from './status.service';

export class BudgetServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetServiceError';
  }
}

export interface SaveItemBudgetInput {
  lines: Omit<ItemBudgetLine, 'id'>[];
  customerAmount: number;
  suggestedAssemblerAmount: number;
}

function assertCanManageBudget(
  actorRoles: AppUser['roles'] | undefined,
): void {
  if (!isAdmin(actorRoles) && !actorRoles?.includes('seller')) {
    throw new BudgetServiceError(
      'Apenas administradores ou vendedores podem editar o orçamento.',
    );
  }
}

export function computeBudgetTotals(
  lines: Omit<ItemBudgetLine, 'id'>[],
): number {
  return lines.reduce((total, line) => total + (line.amount || 0), 0);
}

export async function saveItemBudget(
  projectId: string,
  itemId: string,
  input: SaveItemBudgetInput,
  actor: Pick<AppUser, 'id' | 'name' | 'roles'>,
): Promise<ItemBudget> {
  assertCanManageBudget(actor.roles);

  const itemRef = doc(db, projectItemPath(projectId, itemId));
  const itemSnap = await getDoc(itemRef);
  if (!itemSnap.exists()) {
    throw new BudgetServiceError('Item nao encontrado.');
  }

  const item = itemSnap.data() as ProjectItem;
  if (item.status !== 'aguardando_orcamento') {
    throw new BudgetServiceError(
      'O orçamento só pode ser preenchido enquanto o item aguarda orçamento.',
    );
  }

  if (
    !Number.isFinite(input.customerAmount) ||
    input.customerAmount < 0 ||
    !Number.isFinite(input.suggestedAssemblerAmount) ||
    input.suggestedAssemblerAmount < 0
  ) {
    throw new BudgetServiceError('Valores do orçamento inválidos.');
  }

  const now = Timestamp.now();
  const existing = item.budget;
  const budget: ItemBudget = {
    lines: input.lines.map((line, index) => ({
      id: `${index}`,
      description: line.description,
      amount: line.amount,
    })),
    totalCost: computeBudgetTotals(input.lines),
    customerAmount: input.customerAmount,
    suggestedAssemblerAmount: input.suggestedAssemblerAmount,
    createdBy: existing?.createdBy ?? actor.id,
    createdByName: existing?.createdByName ?? actor.name,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await updateDoc(itemRef, { budget, updatedAt: now, updatedBy: actor.id });

  return budget;
}

export async function sendBudgetToClient(
  projectId: string,
  itemId: string,
  actor: Pick<AppUser, 'id' | 'roles'> & { role: AppUser['roles'][number] },
): Promise<void> {
  assertCanManageBudget(actor.roles);

  await updateItemStatus(projectId, itemId, 'aguardando_aprovacao_cliente', {
    uid: actor.id,
    role: actor.role,
  });
}
