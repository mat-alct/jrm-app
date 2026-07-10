import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  QueryConstraint,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { Project } from '@/types/projects';

import { db } from '../firebase';
import { PROJECTS_COLLECTION, projectPath } from './paths';

export interface CreateProjectInput {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
}

export interface CreateProjectActor {
  uid: string;
  name?: string;
}

export type UpdateProjectInput = Partial<
  Pick<
    Project,
    'customerName' | 'customerPhone' | 'customerEmail' | 'customerAddress'
  >
>;

export interface ListProjectsFilters {
  sellerId?: string;
  search?: string;
}

function assertCreateProjectInput(input: CreateProjectInput): void {
  if (
    !input.customerName?.trim() ||
    !input.customerPhone?.trim() ||
    !input.customerEmail?.trim() ||
    !input.customerAddress?.trim()
  ) {
    throw new Error('Nome, telefone, e-mail e endereço são obrigatórios.');
  }
}

export async function createProject(
  input: CreateProjectInput,
  actor: CreateProjectActor,
): Promise<string> {
  assertCreateProjectInput(input);
  const createdBy = actor.uid;
  const now = Timestamp.now();
  const projectRef = doc(collection(db, PROJECTS_COLLECTION));

  const project: Omit<Project, 'id'> = {
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    customerEmail: input.customerEmail.trim(),
    customerAddress: input.customerAddress.trim(),
    sellerId: actor.uid,
    ...(actor.name ? { sellerName: actor.name } : {}),
    // Credenciais do cliente sao geradas pela rota `provision` da Via B
    // (hash scrypt so roda em Node) e integradas no CP1.
    clientAccessCodeHash: '',
    clientAccessPublicId: '',
    itemSummary: {
      total: 0,
      aguardandoAprovacao: 0,
      aprovados: 0,
      emProducao: 0,
      emMontagem: 0,
      finalizados: 0,
      atrasados: 0,
    },
    totalCustomerValue: 0,
    createdAt: now,
    updatedAt: now,
    createdBy,
    ...(actor.name ? { createdByName: actor.name } : {}),
    updatedBy: createdBy,
  };

  await setDoc(projectRef, project);
  return projectRef.id;
}

export async function updateProject(
  projectId: string,
  updates: UpdateProjectInput,
  updatedBy: string,
): Promise<void> {
  await updateDoc(doc(db, projectPath(projectId)), {
    ...updates,
    updatedAt: Timestamp.now(),
    updatedBy,
  });
}

export async function getProject(projectId: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, projectPath(projectId)));
  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() } as Project;
}

export async function listProjects(
  filters: ListProjectsFilters = {},
): Promise<Project[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  if (filters.sellerId) {
    constraints.push(where('sellerId', '==', filters.sellerId));
  }

  const snap = await getDocs(
    query(collection(db, PROJECTS_COLLECTION), ...constraints),
  );
  let projects = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Project);

  if (filters.search?.trim()) {
    const term = filters.search.trim().toLowerCase();
    projects = projects.filter(project =>
      project.customerName.toLowerCase().includes(term),
    );
  }

  return projects;
}
