import {
  collectionGroup,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

import { Project, ProjectItem, ProjectItemStatus } from '@/types/projects';
import { isDelayed } from '@/utils/projects/delay';

import { db } from '../firebase';

export async function listAllProjectItems(): Promise<ProjectItem[]> {
  const snap = await getDocs(collectionGroup(db, 'items'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as ProjectItem);
}

export async function countPendingAssemblerPayments(): Promise<number> {
  const snap = await getDocs(
    query(
      collectionGroup(db, 'assemblerAssignments'),
      where('paymentStatus', '==', 'pendente'),
    ),
  );
  return snap.size;
}

export interface DashboardFilters {
  sellerId?: string;
  designerId?: string;
  search?: string;
  status?: ProjectItemStatus;
  delayedOnly?: boolean;
  fromDate?: Date;
  toDate?: Date;
}

export function filterDashboardItems(
  items: ProjectItem[],
  projectsById: Record<string, Project>,
  filters: DashboardFilters,
  now: Date = new Date(),
): ProjectItem[] {
  return items.filter(item => {
    const project = projectsById[item.projectId];

    if (filters.sellerId && project?.sellerId !== filters.sellerId) {
      return false;
    }
    if (filters.designerId && item.designerId !== filters.designerId) {
      return false;
    }
    if (filters.status && item.status !== filters.status) {
      return false;
    }
    if (filters.delayedOnly && !isDelayed(item, now)) {
      return false;
    }
    if (filters.search?.trim()) {
      const term = filters.search.trim().toLowerCase();
      if (!project?.customerName.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (filters.fromDate && item.createdAt.toDate() < filters.fromDate) {
      return false;
    }
    if (filters.toDate && item.createdAt.toDate() > filters.toDate) {
      return false;
    }

    return true;
  });
}

export interface DashboardCounts {
  projetosEmAberto: number;
  atrasados: number;
  aguardandoDesenho: number;
  aguardandoAprovacao: number;
  emProducao: number;
  emMontagem: number;
  totalVendidoNoMes: number;
}

export function computeDashboardCounts(
  projects: Project[],
  items: ProjectItem[],
  now: Date = new Date(),
): DashboardCounts {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const totalVendidoNoMes = projects
    .filter(project => {
      const createdAt = project.createdAt.toDate();
      return createdAt >= monthStart && createdAt < monthEnd;
    })
    .reduce((sum, project) => sum + project.totalCustomerValue, 0);

  return {
    projetosEmAberto: projects.filter(project => !project.completedAt).length,
    atrasados: items.filter(item => isDelayed(item, now)).length,
    aguardandoDesenho: items.filter(item => item.status === 'aguardando_desenho')
      .length,
    aguardandoAprovacao: items.filter(
      item => item.status === 'aguardando_aprovacao_cliente',
    ).length,
    emProducao: items.filter(item => item.status === 'em_producao').length,
    emMontagem: items.filter(item => item.status === 'em_montagem').length,
    totalVendidoNoMes,
  };
}
