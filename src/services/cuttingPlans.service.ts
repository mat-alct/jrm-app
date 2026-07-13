import { doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';

import type { CuttingPlan } from '@/domain/cutting-plan';
import {
  approveCuttingPlan as approvePlanRecord,
  markCuttingPlanOutdated,
} from '@/domain/cutting-plan';

import { db } from './firebase';

const stripUndefined = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return (value as unknown[]).map(item => stripUndefined(item)) as T;
  }
  if (value && typeof value === 'object' && !(value instanceof Timestamp)) {
    const output: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
      if (item !== undefined) output[key] = stripUndefined(item);
    });
    return output as T;
  }
  return value;
};

export async function getCuttingPlan(
  orderId: string,
): Promise<CuttingPlan | null> {
  const snapshot = await getDoc(doc(db, 'orders', orderId));
  if (!snapshot.exists()) return null;
  return (snapshot.data().cuttingPlan as CuttingPlan | undefined) ?? null;
}

export async function saveCuttingPlan(
  orderId: string,
  plan: CuttingPlan,
): Promise<CuttingPlan> {
  const timestamp = Timestamp.fromDate(new Date());
  const normalized = stripUndefined({
    ...plan,
    orderId,
    updatedAt: timestamp,
  });
  await updateDoc(doc(db, 'orders', orderId), {
    cuttingPlan: normalized,
    serviceType: 'cutting_plan',
    updatedAt: timestamp,
  });
  return normalized;
}

export async function approveStoredCuttingPlan(
  orderId: string,
): Promise<CuttingPlan | null> {
  const current = await getCuttingPlan(orderId);
  if (!current) return null;
  const approved = approvePlanRecord(current, Timestamp.fromDate(new Date()));
  return saveCuttingPlan(orderId, approved);
}

export async function invalidateStoredCuttingPlan(
  orderId: string,
): Promise<CuttingPlan | null> {
  const current = await getCuttingPlan(orderId);
  if (!current) return null;
  const outdated = markCuttingPlanOutdated(
    current,
    Timestamp.fromDate(new Date()),
  );
  return saveCuttingPlan(orderId, outdated);
}
