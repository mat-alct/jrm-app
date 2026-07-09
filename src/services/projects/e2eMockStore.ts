import { Timestamp } from 'firebase/firestore';

import {
  AppUser,
  AssemblerAssignment,
  AssemblerPayment,
  Attachment,
  ItemBudget,
  Project,
  ProjectItem,
  ProjectItemStatus,
  ProjectItemVersion,
  StatusHistory,
  UserRole,
} from '@/types/projects';
import { inferAttachmentFileKind } from '@/utils/projects/attachments';
import { canTransition } from '@/utils/projects/status';

export const E2E_MOCKS_ENABLED =
  process.env.NEXT_PUBLIC_E2E_USE_MOCKS === '1';

const E2E_ROLE_NAMES: Record<UserRole, string> = {
  admin: 'Admin E2E',
  seller: 'Vendedor E2E',
  designer: 'Desenhista E2E',
  assembler: 'Montador E2E',
  woodworker: 'Marceneiro E2E',
};

function isE2ERole(role: string | null | undefined): role is UserRole {
  if (
    role === 'admin' ||
    role === 'seller' ||
    role === 'designer' ||
    role === 'assembler' ||
    role === 'woodworker'
  ) {
    return true;
  }
  return false;
}

function getE2ERole(): UserRole {
  const browserRole =
    typeof window !== 'undefined'
      ? window.localStorage.getItem('jrm:e2e-role')
      : undefined;
  const role = browserRole ?? process.env.NEXT_PUBLIC_E2E_ROLE;
  return isE2ERole(role) ? role : 'admin';
}

const E2E_ROLE = getE2ERole();
const E2E_USER_ID = `e2e-${E2E_ROLE}`;

type E2EStore = {
  nextProject: number;
  nextItem: number;
  nextAttachment: number;
  nextAssignment: number;
  projects: Project[];
  itemsByProject: Record<string, ProjectItem[]>;
  historyByItem: Record<string, StatusHistory[]>;
  attachmentsByKey: Record<string, Attachment[]>;
  assignmentsByItem: Record<string, AssemblerAssignment[]>;
  payments: AssemblerPayment[];
};

declare global {
  var __JRM_E2E_PROJECTS_STORE__: E2EStore | undefined;
}

function now() {
  return Timestamp.now();
}

function itemKey(projectId: string, itemId: string) {
  return `${projectId}/${itemId}`;
}

function attachmentsKey(projectId: string, itemId?: string) {
  return itemId ? `${projectId}/${itemId}` : projectId;
}

function createProjectSummary(items: ProjectItem[]) {
  return {
    total: items.length,
    aguardandoAprovacao: items.filter(
      item => item.status === 'aguardando_aprovacao_cliente',
    ).length,
    aprovados: items.filter(
      item =>
        item.status === 'aguardando_atribuicao_montador' ||
        item.status === 'em_producao' ||
        item.status === 'pronto_para_montagem' ||
        item.status === 'montagem_concluida' ||
        item.status === 'aguardando_pagamento_montador' ||
        item.status === 'finalizado',
    ).length,
    emProducao: items.filter(item => item.status === 'em_producao').length,
    emMontagem: items.filter(
      item =>
        item.status === 'pronto_para_montagem' ||
        item.status === 'montagem_concluida',
    ).length,
    finalizados: items.filter(item => item.status === 'finalizado').length,
    atrasados: 0,
  };
}

function makeProject(id: string, name: string, totalCustomerValue = 0): Project {
  const timestamp = now();
  return {
    id,
    customerName: name,
    customerPhone: '(11) 99999-0000',
    customerEmail: `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
    customerAddress: 'Rua dos Testes, 123',
    sellerId: E2E_USER_ID,
    sellerName: 'Admin E2E',
    clientAccessCodeHash: '',
    clientAccessPublicId: '',
    itemSummary: createProjectSummary([]),
    totalCustomerValue,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: E2E_USER_ID,
    createdByName: 'Admin E2E',
    updatedBy: E2E_USER_ID,
  };
}

function makeItem(
  projectId: string,
  id: string,
  name: string,
  environment: string,
  status: ProjectItemStatus = 'projeto_criado',
): ProjectItem {
  const timestamp = now();
  const delayedDeadline = Timestamp.fromDate(
    new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  );
  return {
    id,
    projectId,
    name,
    environment,
    material: 'MDF',
    description: 'Item criado para testes E2E.',
    notes: 'Sem observacoes.',
    status,
    clientApprovalStatus: 'aguardando',
    ...(status === 'aguardando_orcamento'
      ? {
          budget: {
            lines: [{ id: '0', description: 'Corte inicial', amount: 250 }],
            totalCost: 250,
            customerAmount: 500,
            suggestedAssemblerAmount: 180,
            createdBy: E2E_USER_ID,
            createdByName: 'Admin E2E',
            createdAt: timestamp,
            updatedAt: timestamp,
          },
        }
      : {}),
    ...(status === 'aguardando_atribuicao_montador' ||
    status === 'aguardando_orcamento'
      ? { deadlineCurrent: delayedDeadline }
      : {}),
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: E2E_USER_ID,
    updatedBy: E2E_USER_ID,
  };
}

function createInitialStore(): E2EStore {
  const alpha = makeProject('e2e-projeto-alpha', 'Cliente Alpha', 1200);
  const beta = makeProject('e2e-projeto-beta', 'Cliente Beta', 800);
  const alphaItems = [
    makeItem(alpha.id, 'e2e-item-cozinha', 'Cozinha planejada', 'Cozinha'),
    makeItem(
      alpha.id,
      'e2e-item-suite',
      'Armario da suite',
      'Suite',
      'aguardando_desenho',
    ),
    makeItem(
      alpha.id,
      'e2e-item-orcamento',
      'Lavanderia compacta',
      'Lavanderia',
      'aguardando_orcamento',
    ),
  ];
  const betaItems = [
    makeItem(
      beta.id,
      'e2e-item-painel',
      'Painel ripado',
      'Sala',
      'aguardando_atribuicao_montador',
    ),
  ];

  alpha.itemSummary = createProjectSummary(alphaItems);
  beta.itemSummary = createProjectSummary(betaItems);

  if (E2E_ROLE === 'designer') {
    alphaItems[1].designerId = E2E_USER_ID;
    alphaItems[1].designerName = E2E_ROLE_NAMES.designer;
  }

  const assemblerAssignments =
    E2E_ROLE === 'assembler'
      ? {
          [itemKey(beta.id, betaItems[0].id)]: [
            {
              id: 'e2e-assignment-initial',
              projectId: beta.id,
              itemId: betaItems[0].id,
              assemblerId: E2E_USER_ID,
              assemblerName: E2E_ROLE_NAMES.assembler,
              customerName: beta.customerName,
              customerPhone: beta.customerPhone,
              customerAddress: beta.customerAddress,
              itemName: betaItems[0].name,
              itemEnvironment: betaItems[0].environment,
              itemStatus: betaItems[0].status,
              amountToReceive: 450,
              paymentStatus: 'nao_liberado' as const,
              assignedAt: now(),
              assignedBy: 'e2e-admin',
              assignedByName: E2E_ROLE_NAMES.admin,
              dueAt: Timestamp.fromDate(
                new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              ),
              createdAt: now(),
              updatedAt: now(),
            },
          ],
        }
      : {};

  return {
    nextProject: 1,
    nextItem: 1,
    nextAttachment: 1,
    nextAssignment: 1,
    projects: [alpha, beta],
    itemsByProject: {
      [alpha.id]: alphaItems,
      [beta.id]: betaItems,
    },
    historyByItem: {},
    attachmentsByKey: {},
    assignmentsByItem: assemblerAssignments,
    payments: [],
  };
}

function getStore(): E2EStore {
  if (!globalThis.__JRM_E2E_PROJECTS_STORE__) {
    globalThis.__JRM_E2E_PROJECTS_STORE__ = createInitialStore();
  }
  return globalThis.__JRM_E2E_PROJECTS_STORE__;
}

function recalculate(projectId: string) {
  const store = getStore();
  const project = store.projects.find(row => row.id === projectId);
  if (!project) return;
  const items = store.itemsByProject[projectId] ?? [];
  project.itemSummary = createProjectSummary(items);
  project.updatedAt = now();
}

export function getE2EAuthUser() {
  return {
    uid: E2E_USER_ID,
    email: `${E2E_ROLE}.e2e@example.com`,
    displayName: E2E_ROLE_NAMES[E2E_ROLE],
    getIdToken: async () => 'e2e-token',
  };
}

export function getE2EAppUser(): AppUser {
  const timestamp = now();
  return {
    id: E2E_USER_ID,
    name: E2E_ROLE_NAMES[E2E_ROLE],
    email: `${E2E_ROLE}.e2e@example.com`,
    roles: [E2E_ROLE],
    active: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function listE2EProjects(filters: {
  sellerId?: string;
  search?: string;
} = {}): Promise<Project[]> {
  const store = getStore();
  let projects = [...store.projects];

  if (filters.sellerId) {
    projects = projects.filter(project => project.sellerId === filters.sellerId);
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    projects = projects.filter(project =>
      project.customerName.toLowerCase().includes(term),
    );
  }

  return projects;
}

export async function createE2EProject(input: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
}): Promise<string> {
  const store = getStore();
  const id = `e2e-created-project-${store.nextProject}`;
  store.nextProject += 1;
  const timestamp = now();
  store.projects.unshift({
    id,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    customerEmail: input.customerEmail.trim(),
    customerAddress: input.customerAddress.trim(),
    sellerId: E2E_USER_ID,
    sellerName: 'Admin E2E',
    clientAccessCodeHash: '',
    clientAccessPublicId: '',
    itemSummary: createProjectSummary([]),
    totalCustomerValue: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: E2E_USER_ID,
    createdByName: 'Admin E2E',
    updatedBy: E2E_USER_ID,
  });
  store.itemsByProject[id] = [];
  return id;
}

export async function getE2EProject(projectId: string): Promise<Project | null> {
  return getStore().projects.find(project => project.id === projectId) ?? null;
}

export async function updateE2EProject(
  projectId: string,
  updates: Partial<Project>,
): Promise<void> {
  const project = getStore().projects.find(row => row.id === projectId);
  if (!project) return;
  Object.assign(project, updates, { updatedAt: now() });
}

export async function updateE2EProjectItem(
  projectId: string,
  itemId: string,
  updates: Partial<ProjectItem>,
  updatedBy: string,
): Promise<void> {
  const item = await getE2EProjectItem(projectId, itemId);
  if (!item) return;
  Object.assign(item, updates, { updatedAt: now(), updatedBy });
  recalculate(projectId);
}

export async function createE2EProjectItem(
  projectId: string,
  input: {
    name: string;
    environment: string;
    description?: string;
    material?: string;
    notes?: string;
  },
): Promise<string> {
  const store = getStore();
  const id = `e2e-created-item-${store.nextItem}`;
  store.nextItem += 1;
  const timestamp = now();
  const item: ProjectItem = {
    id,
    projectId,
    name: input.name.trim(),
    environment: input.environment.trim(),
    ...(input.description ? { description: input.description.trim() } : {}),
    ...(input.material ? { material: input.material.trim() } : {}),
    ...(input.notes ? { notes: input.notes.trim() } : {}),
    status: 'projeto_criado',
    clientApprovalStatus: 'aguardando',
    createdAt: timestamp,
    updatedAt: timestamp,
    createdBy: E2E_USER_ID,
    updatedBy: E2E_USER_ID,
  };
  store.itemsByProject[projectId] = [
    ...(store.itemsByProject[projectId] ?? []),
    item,
  ];
  recalculate(projectId);
  return id;
}

export async function listE2EProjectItems(
  projectId: string,
): Promise<ProjectItem[]> {
  return [...(getStore().itemsByProject[projectId] ?? [])];
}

export async function listE2EAllProjectItems(): Promise<ProjectItem[]> {
  return Object.values(getStore().itemsByProject).flatMap(items => [...items]);
}

export async function getE2EProjectItem(
  projectId: string,
  itemId: string,
): Promise<ProjectItem | null> {
  return (
    getStore().itemsByProject[projectId]?.find(item => item.id === itemId) ??
    null
  );
}

export async function updateE2EItemStatus(
  projectId: string,
  itemId: string,
  next: ProjectItemStatus,
  actor: { uid: string; name?: string; role: UserRole | 'client' },
): Promise<void> {
  const item = await getE2EProjectItem(projectId, itemId);
  if (!item) throw new Error('Item nao encontrado.');
  if (!canTransition(item.status, next, { isAdmin: actor.role === 'admin' })) {
    throw new Error(`Transição de status invalida: ${item.status} -> ${next}`);
  }

  const previous = item.status;
  item.status = next;
  item.updatedAt = now();
  item.updatedBy = actor.uid;

  const historyKey = itemKey(projectId, itemId);
  getStore().historyByItem[historyKey] = [
    ...(getStore().historyByItem[historyKey] ?? []),
    {
      id: `e2e-history-${Date.now()}`,
      projectId,
      itemId,
      fromStatus: previous,
      toStatus: next,
      changedBy: actor.uid,
      changedByName: actor.name,
      changedByRole: actor.role,
      createdAt: now(),
    },
  ];
  recalculate(projectId);
}

export async function listE2EItemStatusHistory(
  projectId: string,
  itemId: string,
): Promise<StatusHistory[]> {
  return getStore().historyByItem[itemKey(projectId, itemId)] ?? [];
}

export async function listE2EAttachments(
  projectId: string,
  itemId?: string,
): Promise<Attachment[]> {
  return getStore().attachmentsByKey[attachmentsKey(projectId, itemId)] ?? [];
}

export async function uploadE2EAttachment(params: {
  projectId: string;
  itemId?: string;
  file: File;
  category: string;
  visibility: Attachment['visibility'];
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByRole: UserRole;
}): Promise<Attachment> {
  const store = getStore();
  const id = `e2e-attachment-${store.nextAttachment}`;
  store.nextAttachment += 1;
  const attachment: Attachment = {
    id,
    projectId: params.projectId,
    itemId: params.itemId,
    fileName: params.file.name,
    originalFileName: params.file.name,
    storagePath: id,
    downloadUrl: '#',
    mimeType: params.file.type || 'application/octet-stream',
    sizeBytes: params.file.size,
    fileKind: inferAttachmentFileKind(params.file),
    category: params.category,
    visibility: params.visibility,
    uploadedBy: params.uploadedBy,
    uploadedByName: params.uploadedByName,
    uploadedByRole: params.uploadedByRole,
    clientVisible: params.visibility === 'client',
    createdAt: now(),
  };
  const key = attachmentsKey(params.projectId, params.itemId);
  store.attachmentsByKey[key] = [...(store.attachmentsByKey[key] ?? []), attachment];
  return attachment;
}

export async function listE2EUsersByRole(role: UserRole): Promise<AppUser[]> {
  const timestamp = now();
  return [
    {
      id: `e2e-${role}`,
      name: E2E_ROLE_NAMES[role],
      email: `${role}.e2e@example.com`,
      roles: [role],
      active: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  ];
}

export async function listE2EItemVersions(): Promise<ProjectItemVersion[]> {
  return [];
}

export async function listE2EDesignerQueue(
  designerId: string,
): Promise<ProjectItem[]> {
  return Object.values(getStore().itemsByProject)
    .flatMap(items => items)
    .filter(item => item.designerId === designerId);
}

export async function listE2EAssemblerAssignments(): Promise<
  AssemblerAssignment[]
> {
  return Object.values(getStore().assignmentsByItem).flatMap(assignments => [
    ...assignments,
  ]);
}

export async function listE2EItemAssemblerAssignments(
  projectId: string,
  itemId: string,
): Promise<AssemblerAssignment[]> {
  return getStore().assignmentsByItem[itemKey(projectId, itemId)] ?? [];
}

export async function listE2EAssemblerPayments(
  assemblerId?: string,
): Promise<AssemblerPayment[]> {
  const payments = getStore().payments;
  return assemblerId
    ? payments.filter(payment => payment.assemblerId === assemblerId)
    : [...payments];
}

export async function assignE2EAssemblers(
  projectId: string,
  itemId: string,
  assignments: {
    assemblerId: string;
    assemblerName?: string;
    amountToReceive: number;
    dueAt?: Timestamp;
  }[],
  actor: { id: string; name?: string },
): Promise<AssemblerAssignment[]> {
  const store = getStore();
  const item = await getE2EProjectItem(projectId, itemId);
  const project = await getE2EProject(projectId);
  const created = assignments.map(input => {
    const id = `e2e-assignment-${store.nextAssignment}`;
    store.nextAssignment += 1;
    const timestamp = now();
    return {
      id,
      projectId,
      itemId,
      assemblerId: input.assemblerId,
      assemblerName: input.assemblerName,
      customerName: project?.customerName,
      customerPhone: project?.customerPhone,
      customerAddress: project?.customerAddress,
      itemName: item?.name,
      itemEnvironment: item?.environment,
      itemStatus: item?.status,
      amountToReceive: input.amountToReceive,
      paymentStatus: 'nao_liberado',
      assignedAt: timestamp,
      assignedBy: actor.id,
      assignedByName: actor.name,
      dueAt: input.dueAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies AssemblerAssignment;
  });
  const key = itemKey(projectId, itemId);
  store.assignmentsByItem[key] = [
    ...(store.assignmentsByItem[key] ?? []),
    ...created,
  ];

  if (item?.status === 'aguardando_atribuicao_montador') {
    await updateE2EItemStatus(projectId, itemId, 'em_producao', {
      uid: actor.id,
      name: actor.name,
      role: 'admin',
    });
  }

  return created;
}

export async function saveE2EItemBudget(
  projectId: string,
  itemId: string,
  input: {
    lines: { description: string; amount: number }[];
    customerAmount: number;
    suggestedAssemblerAmount: number;
  },
  actor: { id: string; name?: string },
): Promise<ItemBudget> {
  const item = await getE2EProjectItem(projectId, itemId);
  if (!item) throw new Error('Item nao encontrado.');
  const timestamp = now();
  const budget: ItemBudget = {
    lines: input.lines.map((line, index) => ({ id: `${index}`, ...line })),
    totalCost: input.lines.reduce((total, line) => total + line.amount, 0),
    customerAmount: input.customerAmount,
    suggestedAssemblerAmount: input.suggestedAssemblerAmount,
    createdBy: actor.id,
    createdByName: actor.name ?? 'Admin E2E',
    createdAt: item.budget?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  item.budget = budget;
  item.updatedAt = timestamp;
  recalculate(projectId);
  return budget;
}
