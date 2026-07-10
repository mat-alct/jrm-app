import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';

import { useAuth } from '@/hooks/authContext';
import { AppUser } from '@/types/projects';

import { db } from '../firebase';
import { userPath } from './paths';

export async function getAppUser(uid: string): Promise<AppUser | null> {
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
