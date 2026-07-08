import { Timestamp } from 'firebase/firestore';

import {
  computeDashboardCounts,
  filterDashboardItems,
} from '@/services/projects/dashboard.service';
import { Project, ProjectItem } from '@/types/projects';

function project(overrides: Partial<Project>): Project {
  return {
    id: overrides.id ?? 'p1',
    customerName: 'Fulano',
    customerPhone: '82999999999',
    customerEmail: 'fulano@example.com',
    customerAddress: 'Rua Um',
    sellerId: 'seller-1',
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
    totalCustomerValue: 1000,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'u1',
    updatedBy: 'u1',
    ...overrides,
  };
}

function item(overrides: Partial<ProjectItem>): ProjectItem {
  return {
    id: overrides.id ?? 'i1',
    projectId: overrides.projectId ?? 'p1',
    name: 'Cozinha',
    environment: 'Cozinha',
    customerPrice: 500,
    status: 'em_producao',
    clientApprovalStatus: 'aprovado',
    requiresDesigner: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    createdBy: 'u1',
    updatedBy: 'u1',
    ...overrides,
  };
}

describe('services/projects/dashboard.service', () => {
  describe('computeDashboardCounts', () => {
    const now = new Date(2026, 6, 15);

    it('counts open projects and items by status', () => {
      const projects = [
        project({ id: 'p1', completedAt: undefined }),
        project({ id: 'p2', completedAt: Timestamp.now() }),
      ];
      const items = [
        item({ status: 'aguardando_desenho' }),
        item({ status: 'aguardando_aprovacao_cliente' }),
        item({ status: 'em_producao' }),
        item({ status: 'em_montagem' }),
      ];

      const counts = computeDashboardCounts(projects, items, now);

      expect(counts.projetosEmAberto).toBe(1);
      expect(counts.aguardandoDesenho).toBe(1);
      expect(counts.aguardandoAprovacao).toBe(1);
      expect(counts.emProducao).toBe(1);
      expect(counts.emMontagem).toBe(1);
    });

    it('counts delayed items regardless of status', () => {
      const items = [
        item({
          status: 'em_producao',
          deadlineCurrent: Timestamp.fromDate(new Date(2026, 6, 10)),
        }),
        item({
          status: 'em_producao',
          deadlineCurrent: Timestamp.fromDate(new Date(2026, 6, 20)),
        }),
      ];

      const counts = computeDashboardCounts([], items, now);

      expect(counts.atrasados).toBe(1);
    });

    it('sums totalCustomerValue only for projects created within the current month', () => {
      const projects = [
        project({
          id: 'in-month',
          totalCustomerValue: 1000,
          createdAt: Timestamp.fromDate(new Date(2026, 6, 1, 0, 0, 1)),
        }),
        project({
          id: 'last-day-of-month',
          totalCustomerValue: 500,
          createdAt: Timestamp.fromDate(new Date(2026, 6, 31, 23, 59, 59)),
        }),
        project({
          id: 'previous-month',
          totalCustomerValue: 2000,
          createdAt: Timestamp.fromDate(new Date(2026, 5, 30, 23, 59, 59)),
        }),
        project({
          id: 'next-month',
          totalCustomerValue: 3000,
          createdAt: Timestamp.fromDate(new Date(2026, 7, 1, 0, 0, 0)),
        }),
      ];

      const counts = computeDashboardCounts(projects, [], now);

      expect(counts.totalVendidoNoMes).toBe(1500);
    });
  });

  describe('filterDashboardItems', () => {
    const projectsById = {
      p1: project({ id: 'p1', customerName: 'Fulano Souza', sellerId: 's1' }),
      p2: project({ id: 'p2', customerName: 'Beltrano Silva', sellerId: 's2' }),
    };

    const items = [
      item({ id: 'i1', projectId: 'p1', designerId: 'd1', status: 'em_producao' }),
      item({ id: 'i2', projectId: 'p2', designerId: 'd2', status: 'aguardando_desenho' }),
    ];

    it('filters by sellerId', () => {
      const result = filterDashboardItems(items, projectsById, { sellerId: 's1' });
      expect(result.map(i => i.id)).toEqual(['i1']);
    });

    it('filters by designerId', () => {
      const result = filterDashboardItems(items, projectsById, { designerId: 'd2' });
      expect(result.map(i => i.id)).toEqual(['i2']);
    });

    it('filters by status', () => {
      const result = filterDashboardItems(items, projectsById, {
        status: 'em_producao',
      });
      expect(result.map(i => i.id)).toEqual(['i1']);
    });

    it('filters by customer search', () => {
      const result = filterDashboardItems(items, projectsById, {
        search: 'beltrano',
      });
      expect(result.map(i => i.id)).toEqual(['i2']);
    });

    it('combines multiple filters', () => {
      const result = filterDashboardItems(items, projectsById, {
        sellerId: 's1',
        status: 'aguardando_desenho',
      });
      expect(result).toHaveLength(0);
    });

    it('filters delayed-only items', () => {
      const now = new Date(2026, 6, 15);
      const delayedItems = [
        item({
          id: 'delayed',
          projectId: 'p1',
          deadlineCurrent: Timestamp.fromDate(new Date(2026, 6, 1)),
        }),
        item({
          id: 'on-time',
          projectId: 'p1',
          deadlineCurrent: Timestamp.fromDate(new Date(2026, 6, 30)),
        }),
      ];

      const result = filterDashboardItems(
        delayedItems,
        projectsById,
        { delayedOnly: true },
        now,
      );

      expect(result.map(i => i.id)).toEqual(['delayed']);
    });
  });
});
