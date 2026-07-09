import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

import { ProjectItem, StatusHistory } from '@/types/projects';

import { db } from '../firebase';
import {
  itemStatusHistoryPath,
  projectItemPath,
  projectItemsPath,
} from './paths';
import {
  createE2EProjectItem,
  E2E_MOCKS_ENABLED,
  getE2EProjectItem,
  listE2EItemStatusHistory,
  listE2EProjectItems,
  updateE2EProjectItem,
} from './e2eMockStore';
import { recalculateProjectSummary } from './summary';

export interface CreateProjectItemInput {
  name: string;
  environment: string;
  description?: string;
  material?: string;
  notes?: string;
}

export type UpdateProjectItemInput = Partial<
  Omit<
    ProjectItem,
    | 'id'
    | 'projectId'
    | 'status'
    | 'clientApprovalStatus'
    | 'createdAt'
    | 'createdBy'
  >
>;

function assertCreateProjectItemInput(input: CreateProjectItemInput): void {
  if (!input.name?.trim() || !input.environment?.trim()) {
    throw new Error('Nome e ambiente do item são obrigatórios.');
  }
}

export async function createProjectItem(
  projectId: string,
  input: CreateProjectItemInput,
  createdBy: string,
): Promise<string> {
  assertCreateProjectItemInput(input);
  if (E2E_MOCKS_ENABLED) {
    return createE2EProjectItem(projectId, input);
  }

  const now = Timestamp.now();
  const itemRef = doc(collection(db, projectItemsPath(projectId)));

  const item: Omit<ProjectItem, 'id'> = {
    projectId,
    name: input.name.trim(),
    environment: input.environment.trim(),
    ...(input.description ? { description: input.description } : {}),
    ...(input.material ? { material: input.material } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    status: 'projeto_criado',
    clientApprovalStatus: 'aguardando',
    createdAt: now,
    updatedAt: now,
    createdBy,
    updatedBy: createdBy,
  };

  await setDoc(itemRef, item);
  await recalculateProjectSummary(projectId);

  return itemRef.id;
}

export async function updateProjectItem(
  projectId: string,
  itemId: string,
  updates: UpdateProjectItemInput,
  updatedBy: string,
): Promise<void> {
  if (E2E_MOCKS_ENABLED) {
    await updateE2EProjectItem(projectId, itemId, updates, updatedBy);
    return;
  }

  await updateDoc(doc(db, projectItemPath(projectId, itemId)), {
    ...updates,
    updatedAt: Timestamp.now(),
    updatedBy,
  });

  await recalculateProjectSummary(projectId);
}

export async function getProjectItem(
  projectId: string,
  itemId: string,
): Promise<ProjectItem | null> {
  if (E2E_MOCKS_ENABLED) {
    return getE2EProjectItem(projectId, itemId);
  }

  const snap = await getDoc(doc(db, projectItemPath(projectId, itemId)));
  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() } as ProjectItem;
}

export async function listProjectItems(
  projectId: string,
): Promise<ProjectItem[]> {
  if (E2E_MOCKS_ENABLED) {
    return listE2EProjectItems(projectId);
  }

  const snap = await getDocs(
    query(collection(db, projectItemsPath(projectId)), orderBy('createdAt')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ProjectItem);
}

export async function listItemStatusHistory(
  projectId: string,
  itemId: string,
): Promise<StatusHistory[]> {
  if (E2E_MOCKS_ENABLED) {
    return listE2EItemStatusHistory(projectId, itemId);
  }

  const snap = await getDocs(
    collection(db, itemStatusHistoryPath(projectId, itemId)),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as StatusHistory);
}
