import { doc, setDoc, Timestamp } from 'firebase/firestore';

import { DeadlineDefaults } from '@/types/projects';

import { db } from '../firebase';
import { deadlineDefaultsPath } from './paths';

export async function saveDeadlineDefaults(
  values: Omit<DeadlineDefaults, 'updatedAt' | 'updatedBy'>,
  updatedBy: string,
): Promise<void> {
  await setDoc(doc(db, deadlineDefaultsPath()), {
    ...values,
    updatedAt: Timestamp.now(),
    updatedBy,
  });
}
