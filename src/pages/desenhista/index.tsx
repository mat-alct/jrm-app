import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

import { DesignerQueue } from '@/components/designer/DesignerQueue';
import { toaster } from '@/components/ui/toaster';
import {
  useClaimDesignItem,
  useDesignQueue,
} from '@/services/projects/designer.service';
import { useAppUser } from '@/services/projects/users.service';
import { ProjectItem } from '@/types/projects';
import { canAccessRoles } from '@/utils/projects/permissions';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { useAuth } from '../../hooks/authContext';

const DesenhistaFila = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const canAccess = canAccessRoles(appUser?.roles, ['designer']);
  const {
    data: items,
    isLoading,
    isFetching,
  } = useDesignQueue(!isLoadingAppUser && canAccess);
  const claimDesignItem = useClaimDesignItem();

  React.useEffect(() => {
    if (user === null) {
      void router.push('/login');
    }
  }, [user, router]);

  React.useEffect(() => {
    if (!isLoadingAppUser && appUser && !canAccess) {
      void router.push('/');
    }
  }, [appUser, canAccess, isLoadingAppUser, router]);

  if (!user || isLoadingAppUser) {
    return <Loader />;
  }

  const handleClaim = async (item: ProjectItem) => {
    try {
      await claimDesignItem.mutateAsync({
        projectId: item.projectId,
        itemId: item.id,
        actor: { uid: user.uid, name: appUser?.name },
      });
      toaster.create({ type: 'success', description: 'Item assumido.' });
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Erro ao assumir item.',
      });
    }
  };

  return (
    <>
      <Head>
        <title>Fila de desenhos | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Fila de desenhos" isLoading={isFetching && !isLoading} />
        <DesignerQueue
          items={items ?? []}
          currentUserId={user.uid}
          onClaim={item => void handleClaim(item)}
          claimingItemId={claimDesignItem.variables?.itemId}
        />
      </Dashboard>
    </>
  );
};

export default DesenhistaFila;
