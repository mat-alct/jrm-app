/// <reference lib="webworker" />

import { searchCuttingPlan } from '../domain/cutting-plan/algorithm';
import type {
  CuttingPlanWorkerRequest,
  CuttingPlanWorkerResponse,
} from '../domain/cutting-plan/worker-protocol';

const worker = self as unknown as DedicatedWorkerGlobalScope;

worker.onmessage = (event: MessageEvent<CuttingPlanWorkerRequest>) => {
  try {
    const result = searchCuttingPlan(
      event.data.input,
      event.data.options,
      progress => {
        const response: CuttingPlanWorkerResponse = {
          type: 'progress',
          progress,
        };
        worker.postMessage(response);
      },
    );
    const response: CuttingPlanWorkerResponse = { type: 'result', result };
    worker.postMessage(response);
  } catch (error) {
    const response: CuttingPlanWorkerResponse = {
      type: 'error',
      message:
        error instanceof Error
          ? error.message
          : 'Não foi possível gerar o plano de corte.',
    };
    worker.postMessage(response);
  }
};

export {};
