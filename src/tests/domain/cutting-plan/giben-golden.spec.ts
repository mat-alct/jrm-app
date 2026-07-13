import fs from 'node:fs';
import path from 'node:path';

import type { CuttingPlanOptimizationMode } from '@/domain/cutting-plan';
import {
  buildCuttingPlan,
  cutlistToCuttingPlanInput,
  DEFAULT_GIBEN_EXPORT_PROFILE,
  exportCuttingPlanToGiben,
  generateCuttingPlan,
} from '@/domain/cutting-plan';
import type { Cutlist } from '@/types';

interface GoldenInput {
  customerName: string;
  cutlist: Cutlist[];
  generatedDate: { day: number; month: number; year: number };
  operatorName: string;
  optimizationMode: CuttingPlanOptimizationMode;
  orderId: string;
}

const fixtureDir = path.join(
  process.cwd(),
  'src',
  'tests',
  'fixtures',
  'giben',
  'caso-01',
);

describe('Giben golden files', () => {
  it('mantém AC e AD idênticos byte a byte ao caso homologado', () => {
    const input = JSON.parse(
      fs.readFileSync(path.join(fixtureDir, 'input.json'), 'utf8'),
    ) as GoldenInput;
    const plan = buildCuttingPlan({
      id: 'golden-plan',
      orderId: input.orderId,
      status: 'approved',
      timestamp: { seconds: 1, nanoseconds: 0 },
      result: generateCuttingPlan(
        cutlistToCuttingPlanInput({
          cutlist: input.cutlist,
          optimizationMode: input.optimizationMode,
        }),
      ),
    });
    const generatedAt = new Date(
      input.generatedDate.year,
      input.generatedDate.month - 1,
      input.generatedDate.day,
      12,
      0,
      0,
    );
    const pair = exportCuttingPlanToGiben(plan, {
      orderId: input.orderId,
      customerName: input.customerName,
      operatorName: input.operatorName,
      generatedAt,
      profile: DEFAULT_GIBEN_EXPORT_PROFILE,
    }).pairs[0];
    const actualAc = Buffer.from(pair.ac, 'ascii');
    const actualAd = Buffer.from(pair.ad, 'ascii');
    const expectedAcPath = path.join(fixtureDir, 'expected.AC');
    const expectedAdPath = path.join(fixtureDir, 'expected.AD');

    if (process.env.UPDATE_GIBEN_GOLDEN === '1') {
      fs.writeFileSync(expectedAcPath, actualAc);
      fs.writeFileSync(expectedAdPath, actualAd);
    }

    const expectedAc = fs.readFileSync(expectedAcPath);
    const expectedAd = fs.readFileSync(expectedAdPath);
    expect(actualAc.equals(expectedAc)).toBe(true);
    expect(actualAd.equals(expectedAd)).toBe(true);
    expect(expectedAc.subarray(-2).toString('ascii')).toBe('\r\n');
    expect(expectedAd.subarray(-2).toString('ascii')).toBe('\r\n');
  });
});
