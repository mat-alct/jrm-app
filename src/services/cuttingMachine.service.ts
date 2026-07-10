import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

import {
  type CuttingMachineConfiguration,
  normalizeCuttingMachineConfiguration,
  validateCuttingMachineConfiguration,
} from '@/domain/cutting-plan';

import { db } from './firebase';

export const CUTTING_MACHINE_CONFIG_PATH = 'config/cutting-machine';
export const CUTTING_MACHINE_QUERY_KEY = [
  'cutting-machine-configuration',
] as const;

export async function getCuttingMachineConfiguration(): Promise<CuttingMachineConfiguration> {
  const snapshot = await getDoc(doc(db, CUTTING_MACHINE_CONFIG_PATH));
  return normalizeCuttingMachineConfiguration(
    snapshot.exists()
      ? (snapshot.data() as Partial<CuttingMachineConfiguration>)
      : undefined,
  );
}

export async function saveCuttingMachineConfiguration(
  configuration: CuttingMachineConfiguration,
  updatedBy: string,
): Promise<CuttingMachineConfiguration> {
  const normalized = normalizeCuttingMachineConfiguration(configuration);
  validateCuttingMachineConfiguration(normalized);
  await setDoc(doc(db, CUTTING_MACHINE_CONFIG_PATH), {
    ...normalized,
    updatedAt: Timestamp.fromDate(new Date()),
    updatedBy,
  });
  return normalized;
}
