import { doc, getDoc } from 'firebase/firestore';

import { AppUser } from '@/types/projects';

import { db } from '../firebase';
import { userPath } from './paths';

export async function getAppUser(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, userPath(uid)));
  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() } as AppUser;
}
