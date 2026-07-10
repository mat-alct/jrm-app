import type { CuttingPlan } from '@/domain/cutting-plan';
import {
  cuttingPlanViewerStorageKey,
  openCuttingPlanViewer,
  readCuttingPlanForViewer,
  storeCuttingPlanForViewer,
} from '@/utils/cuttingPlanViewer';

const plan = {
  id: 'plan with spaces',
  sheets: [{ id: 'sheet-1' }],
  metrics: { sheetCount: 1 },
  pricing: { totalCost: 100 },
} as CuttingPlan;

describe('cuttingPlanViewer', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

  it('guarda e recupera o plano pelo identificador', () => {
    expect(storeCuttingPlanForViewer(plan)).toBe(true);
    expect(readCuttingPlanForViewer(plan.id)).toEqual(plan);
    expect(
      window.localStorage.getItem(cuttingPlanViewerStorageKey(plan.id)),
    ).toContain('storedAt');
  });

  it('abre a rota codificada em uma nova aba sem acesso ao opener', () => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);

    expect(openCuttingPlanViewer(plan)).toBe(true);
    expect(open).toHaveBeenCalledWith(
      '/cortes/plano/visualizar?plan=plan%20with%20spaces',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('rejeita ausência, JSON inválido e conteúdo que não é um plano', () => {
    expect(readCuttingPlanForViewer('missing')).toBeNull();

    window.localStorage.setItem(cuttingPlanViewerStorageKey('bad-json'), '{');
    expect(readCuttingPlanForViewer('bad-json')).toBeNull();

    window.localStorage.setItem(
      cuttingPlanViewerStorageKey('bad-plan'),
      JSON.stringify({ plan: { id: 'bad-plan', sheets: [] } }),
    );
    expect(readCuttingPlanForViewer('bad-plan')).toBeNull();
  });

  it('informa falha quando o navegador não consegue persistir o plano', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    expect(storeCuttingPlanForViewer(plan)).toBe(false);
    expect(openCuttingPlanViewer(plan)).toBe(false);
  });
});
