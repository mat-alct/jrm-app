import type {
  CuttingPlanInput,
  CuttingPlanResult,
  CuttingPlanSearchProgress,
} from '@/domain/cutting-plan';
import {
  generateCuttingPlan,
  MAX_CUTTING_PLAN_SEARCH_DURATION_MS,
} from '@/domain/cutting-plan';
import type {
  CuttingPlanWorkerRequest,
  CuttingPlanWorkerResponse,
} from '@/domain/cutting-plan/worker-protocol';

export interface CuttingPlanOptimizationJob {
  cancel: () => void;
  promise: Promise<CuttingPlanResult>;
}

export interface StartCuttingPlanOptimizationOptions {
  maxDurationMs?: number;
  onProgress?: (progress: CuttingPlanSearchProgress) => void;
  stagnationMs?: number;
}

export class CuttingPlanOptimizationCancelledError extends Error {
  constructor() {
    super('Otimização cancelada.');
    this.name = 'CuttingPlanOptimizationCancelledError';
  }
}

const WORKER_RESULT_MARGIN_MS = 500;

export function startCuttingPlanOptimization(
  input: CuttingPlanInput,
  options: StartCuttingPlanOptimizationOptions = {},
): CuttingPlanOptimizationJob {
  // Jest, SSR e navegadores antigos continuam funcionais sem bloquear por
  // vários segundos: fazem apenas a melhor passada determinística disponível.
  if (typeof Worker === 'undefined') {
    return {
      cancel: () => undefined,
      promise: Promise.resolve().then(() => generateCuttingPlan(input)),
    };
  }

  const worker = new Worker(
    new URL('../workers/cutting-plan.worker.ts', import.meta.url),
  );
  let settled = false;
  let safetyTimeout: number | undefined;
  let rejectPromise: (reason?: unknown) => void = () => undefined;
  const maxDurationMs = Math.min(
    options.maxDurationMs ?? MAX_CUTTING_PLAN_SEARCH_DURATION_MS,
    MAX_CUTTING_PLAN_SEARCH_DURATION_MS,
  );
  const workerDurationMs = Math.max(
    0,
    Math.min(
      maxDurationMs,
      MAX_CUTTING_PLAN_SEARCH_DURATION_MS - WORKER_RESULT_MARGIN_MS,
    ),
  );
  const finish = () => {
    if (safetyTimeout !== undefined) window.clearTimeout(safetyTimeout);
    worker.terminate();
  };

  const promise = new Promise<CuttingPlanResult>((resolve, reject) => {
    rejectPromise = reject;
    safetyTimeout = window.setTimeout(
      () => {
        if (settled) return;
        settled = true;
        finish();
        reject(new Error('A otimização atingiu o limite máximo de 1 minuto.'));
      },
      Math.min(
        MAX_CUTTING_PLAN_SEARCH_DURATION_MS,
        workerDurationMs + WORKER_RESULT_MARGIN_MS,
      ),
    );

    worker.onmessage = (event: MessageEvent<CuttingPlanWorkerResponse>) => {
      if (event.data.type === 'progress') {
        options.onProgress?.(event.data.progress);
        return;
      }
      if (settled) return;
      settled = true;
      finish();
      if (event.data.type === 'result') {
        resolve(event.data.result);
      } else {
        reject(new Error(event.data.message));
      }
    };
    worker.onerror = event => {
      if (settled) return;
      settled = true;
      finish();
      reject(new Error(event.message || 'Falha no otimizador em background.'));
    };

    const request: CuttingPlanWorkerRequest = {
      input,
      options: {
        maxDurationMs: workerDurationMs,
        stagnationMs: options.stagnationMs ?? 10_000,
      },
    };
    worker.postMessage(request);
  });

  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      finish();
      rejectPromise(new CuttingPlanOptimizationCancelledError());
    },
  };
}
