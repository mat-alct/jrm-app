import type {
  CuttingPlanInput,
  CuttingPlanWorkerRequest,
  CuttingPlanWorkerResponse,
} from '@/domain/cutting-plan';
import {
  DEFAULT_CUTTING_PLAN_SETTINGS,
  generateCuttingPlan,
} from '@/domain/cutting-plan';
import {
  CuttingPlanOptimizationCancelledError,
  startCuttingPlanOptimization,
} from '@/services/cuttingPlanOptimizer.service';

const input: CuttingPlanInput = {
  optimizationMode: 'best_yield',
  settings: DEFAULT_CUTTING_PLAN_SETTINGS,
  materials: [
    {
      id: 'material',
      name: 'MDF Branco 15mm',
      thicknessMm: 15,
      unitPrice: 200,
    },
  ],
  pieces: [
    {
      id: 'piece',
      referenceItemId: 'item',
      description: 'Peça',
      widthMm: 500,
      lengthMm: 800,
      quantity: 1,
      materialId: 'material',
      grainDirection: 'none',
      canRotate: true,
      edgeBandEdges: [],
    },
  ],
};

class FakeWorker {
  static instance: FakeWorker;

  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessage: ((event: MessageEvent<CuttingPlanWorkerResponse>) => void) | null =
    null;
  request?: CuttingPlanWorkerRequest;
  terminated = false;

  constructor() {
    FakeWorker.instance = this;
  }

  postMessage(request: CuttingPlanWorkerRequest) {
    this.request = request;
  }

  terminate() {
    this.terminated = true;
  }

  emit(response: CuttingPlanWorkerResponse) {
    this.onmessage?.({
      data: response,
    } as MessageEvent<CuttingPlanWorkerResponse>);
  }
}

describe('cutting plan optimizer background service', () => {
  const OriginalWorker = global.Worker;

  beforeEach(() => {
    global.Worker = FakeWorker as unknown as typeof Worker;
  });

  afterAll(() => {
    global.Worker = OriginalWorker;
  });

  it('executa no worker, repassa progresso e limita a busca a um minuto', async () => {
    const onProgress = jest.fn();
    const result = generateCuttingPlan(input);
    const job = startCuttingPlanOptimization(input, {
      maxDurationMs: 999_999,
      onProgress,
    });
    const worker = FakeWorker.instance;

    // 500ms ficam reservados para devolver e aplicar o resultado sem permitir
    // que a interface ultrapasse o limite absoluto de um minuto.
    expect(worker.request?.options.maxDurationMs).toBe(59_500);
    worker.emit({
      type: 'progress',
      progress: {
        bestMetrics: result.metrics,
        candidatesTested: 12,
        elapsedMs: 250,
        improved: true,
      },
    });
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ candidatesTested: 12 }),
    );

    worker.emit({ type: 'result', result });
    await expect(job.promise).resolves.toEqual(result);
    expect(worker.terminated).toBe(true);
  });

  it('permite cancelar imediatamente a busca em background', async () => {
    const job = startCuttingPlanOptimization(input);
    const worker = FakeWorker.instance;

    job.cancel();

    await expect(job.promise).rejects.toBeInstanceOf(
      CuttingPlanOptimizationCancelledError,
    );
    expect(worker.terminated).toBe(true);
  });
});
