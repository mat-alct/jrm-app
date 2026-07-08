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

import { ProjectItem } from '@/types/projects';

import { db } from '../firebase';
import { projectItemPath, projectItemsPath } from './paths';
import { recalculateProjectSummary } from './summary';

export interface CreateProjectItemInput {
  name: string;
  environment: string;
  description?: string;
  material?: string;
  finish?: string;
  measurements?: string;
  notes?: string;
  customerPrice: number;
  requiresDesigner: boolean;
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
  if (!Number.isFinite(input.customerPrice) || input.customerPrice < 0) {
    throw new Error('Preço do item inválido.');
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
    ...(input.finish ? { finish: input.finish } : {}),
    ...(input.measurements ? { measurements: input.measurements } : {}),
    ...(input.notes ? { notes: input.notes } : {}),
    customerPrice: input.customerPrice,
    status: 'orcamento_criado',
    clientApprovalStatus: 'aguardando',
    requiresDesigner: input.requiresDesigner,
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
