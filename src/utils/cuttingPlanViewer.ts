import type { CuttingPlan } from '@/domain/cutting-plan';

const STORAGE_PREFIX = 'app@jrmcompensados:cutting-plan-viewer:';

interface StoredCuttingPlan {
  plan: CuttingPlan;
  storedAt: number;
}

export const cuttingPlanViewerStorageKey = (planId: string) =>
  `${STORAGE_PREFIX}${planId}`;

const isCuttingPlan = (value: unknown): value is CuttingPlan => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<CuttingPlan>;
  return (
    typeof candidate.id === 'string' &&
    Array.isArray(candidate.sheets) &&
    candidate.sheets.length > 0 &&
    !!candidate.metrics &&
    !!candidate.pricing
  );
};

export const storeCuttingPlanForViewer = (plan: CuttingPlan): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const stored: StoredCuttingPlan = { plan, storedAt: Date.now() };
    window.localStorage.setItem(
      cuttingPlanViewerStorageKey(plan.id),
      JSON.stringify(stored),
    );
    return true;
  } catch {
    return false;
  }
};

export const readCuttingPlanForViewer = (
  planId: string,
): CuttingPlan | null => {
  if (typeof window === 'undefined') return null;
  try {
    const serialized = window.localStorage.getItem(
      cuttingPlanViewerStorageKey(planId),
    );
    if (!serialized) return null;
    const parsed = JSON.parse(serialized) as Partial<StoredCuttingPlan>;
    return isCuttingPlan(parsed.plan) ? parsed.plan : null;
  } catch {
    return null;
  }
};

export const openCuttingPlanViewer = (plan: CuttingPlan): boolean => {
  if (!storeCuttingPlanForViewer(plan) || typeof window === 'undefined') {
    return false;
  }
  const url = `/cortes/plano/visualizar?plan=${encodeURIComponent(plan.id)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};
