import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';

import { useAuth } from '@/hooks/authContext';
import { AppUser } from '@/types/projects';

import { db } from '../firebase';
import { E2E_MOCKS_ENABLED, getE2EAppUser } from './e2eMockStore';
import { userPath } from './paths';

export async function getAppUser(uid: string): Promise<AppUser | null> {
  if (E2E_MOCKS_ENABLED) {
    return getE2EAppUser();
  }

  const snap = await getDoc(doc(db, userPath(uid)));
  if (!snap.exists()) return null;

  return { id: snap.id, ...snap.data() } as AppUser;
}

export function useAppUser(): UseQueryResult<AppUser | null> {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['projects', 'appUser', user?.uid],
    queryFn: () => getAppUser(user!.uid),
    enabled: !!user,
  });
}
