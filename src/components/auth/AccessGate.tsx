import { useRouter } from 'next/router';
import React from 'react';

import { Loader } from '@/components/Loader';
import { useAuth } from '@/hooks/authContext';
import { useAppUser } from '@/services/projects/users.service';
import {
  canAccessPage,
  getDefaultRouteForRoles,
  isPublicRoute,
} from '@/utils/projects/permissions';

interface AccessGateProps {
  children: React.ReactNode;
}

export const AccessGate: React.FC<AccessGateProps> = ({ children }) => {
  const router = useRouter();
  const { user } = useAuth();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const pathname = router.pathname;
  const publicRoute = isPublicRoute(pathname);
  const allowed = publicRoute || canAccessPage(pathname, appUser?.roles);

  React.useEffect(() => {
    if (publicRoute) return;

    if (user === null) {
      router.replace('/login');
      return;
    }

    if (user && !isLoadingAppUser && appUser && !allowed) {
      router.replace(getDefaultRouteForRoles(appUser.roles));
    }
  }, [allowed, appUser, isLoadingAppUser, publicRoute, router, user]);

  if (publicRoute) return <>{children}</>;

  if (user === undefined || isLoadingAppUser || !appUser || !allowed) {
    return <Loader />;
  }

  return <>{children}</>;
};
