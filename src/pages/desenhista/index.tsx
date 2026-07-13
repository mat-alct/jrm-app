import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

import { DesignerQueue } from '@/components/designer/DesignerQueue';
import { useDesignerQueue } from '@/services/projects/designer.service';
import { useAppUser } from '@/services/projects/users.service';
import { canAccessRoles } from '@/utils/projects/permissions';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { useAuth } from '../../hooks/authContext';

const DesenhistaFila = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const { data: items, isLoading, isFetching } = useDesignerQueue(user?.uid);

  React.useEffect(() => {
    if (user === null) {
      void router.push('/login');
    }
  }, [user, router]);

  React.useEffect(() => {
    if (
      !isLoadingAppUser &&
      appUser &&
      !canAccessRoles(appUser.roles, ['designer'])
    ) {
      void router.push('/');
    }
  }, [appUser, isLoadingAppUser, router]);

  if (!user || isLoadingAppUser) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        <title>Minha Fila | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Minha Fila" isLoading={isFetching && !isLoading} />
        <DesignerQueue items={items ?? []} />
      </Dashboard>
    </>
  );
};

export default DesenhistaFila;
