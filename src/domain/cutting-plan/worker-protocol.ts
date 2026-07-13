import type {
  CuttingPlanSearchOptions,
  CuttingPlanSearchProgress,
} from './algorithm';
import type { CuttingPlanInput, CuttingPlanResult } from './types';

export interface CuttingPlanWorkerRequest {
  input: CuttingPlanInput;
  options: CuttingPlanSearchOptions;
}

export type CuttingPlanWorkerResponse =
  | { progress: CuttingPlanSearchProgress; type: 'progress' }
  | { result: CuttingPlanResult; type: 'result' }
  | { message: string; type: 'error' };
