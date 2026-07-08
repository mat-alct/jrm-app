import { useQuery } from '@tanstack/react-query';

import { getAppUser } from '@/services/projects/users.service';
import { AppUser } from '@/types/projects';

import { useAuth } from './authContext';

interface UseAppUserResult {
  appUser: AppUser | null | undefined;
  roles: AppUser['roles'];
  isLoading: boolean;
}

export function useAppUser(): UseAppUserResult {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['appUser', user?.uid],
    queryFn: () => getAppUser(user!.uid),
    enabled: !!user?.uid,
  });

  return {
    appUser: data,
    roles: data?.roles ?? [],
    isLoading: !!user?.uid && isLoading,
  };
}
