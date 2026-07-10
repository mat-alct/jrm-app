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
  options: { recalculateSummary?: boolean } = {},
): Promise<void> {
  await updateDoc(doc(db, projectItemPath(projectId, itemId)), {
    ...updates,
    updatedAt: Timestamp.now(),
    updatedBy,
  });

  if (options.recalculateSummary !== false) {
    await recalculateProjectSummary(projectId);
  }
}

export async function getProjectItem(
  projectId: string,
  itemId: string,
): Promise<ProjectItem | null> {
  const snap = await getDoc(doc(db, projectItemPath(projectId, itemId)));
  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() } as ProjectItem;
}

export async function listProjectItems(
  projectId: string,
): Promise<ProjectItem[]> {
  const snap = await getDocs(
    query(collection(db, projectItemsPath(projectId)), orderBy('createdAt')),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ProjectItem);
}

export async function listItemStatusHistory(
  projectId: string,
  itemId: string,
): Promise<StatusHistory[]> {
  const snap = await getDocs(
    collection(db, itemStatusHistoryPath(projectId, itemId)),
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as StatusHistory);
}
