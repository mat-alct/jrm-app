import { Box, HStack, Input, Stack } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

import { AdminDashboardCards } from '@/components/admin/AdminDashboardCards';
import { DelayedItemsTable } from '@/components/admin/DelayedItemsTable';
import { useUsersByRole } from '@/services/projects/adminUsers';
import {
  computeDashboardCounts,
  countPendingAssemblerPayments,
  filterDashboardItems,
  listAllProjectItems,
} from '@/services/projects/dashboard.service';
import { useProjects } from '@/services/projects/projectHooks';
import { useAppUser } from '@/services/projects/users.service';
import { Project, ProjectItemStatus } from '@/types/projects';
import { isAdmin } from '@/utils/projects/permissions';
import { isDelayed } from '@/utils/projects/delay';
import { INTERNAL_STATUS_LABELS } from '@/utils/projects/status';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { useAuth } from '../../hooks/authContext';

const STATUS_OPTIONS: ProjectItemStatus[] = Object.keys(
  INTERNAL_STATUS_LABELS,
) as ProjectItemStatus[];

const ProjetosDashboard = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const { data: sellers } = useUsersByRole('seller');
  const { data: designers } = useUsersByRole('designer');

  const [sellerId, setSellerId] = React.useState('');
  const [designerId, setDesignerId] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState<ProjectItemStatus | ''>('');
  const [delayedOnly, setDelayedOnly] = React.useState(false);

  React.useEffect(() => {
    if (user === null) router.push('/login');
  }, [user, router]);

  React.useEffect(() => {
    if (!isLoadingAppUser && appUser && !isAdmin(appUser.roles)) {
      router.push('/');
    }
  }, [appUser, isLoadingAppUser, router]);

  const { data: projects, isLoading: isLoadingProjects } = useProjects();
  const { data: items, isLoading: isLoadingItems } = useQuery({
    queryKey: ['projects', 'allItems'],
    queryFn: listAllProjectItems,
  });
  const { data: pendingAssemblerPayments } = useQuery({
    queryKey: ['projects', 'pendingAssemblerPayments'],
    queryFn: countPendingAssemblerPayments,
  });

  const projectsById = React.useMemo<Record<string, Project>>(
    () => Object.fromEntries((projects ?? []).map(project => [project.id, project])),
    [projects],
  );

  const filteredItems = React.useMemo(
    () =>
      filterDashboardItems(items ?? [], projectsById, {
        sellerId: sellerId || undefined,
        designerId: designerId || undefined,
        search: search || undefined,
        status: status || undefined,
        delayedOnly,
      }),
    [items, projectsById, sellerId, designerId, search, status, delayedOnly],
  );

  const delayedItems = React.useMemo(
    () => filteredItems.filter(item => isDelayed(item)),
    [filteredItems],
  );

  const counts = React.useMemo(
    () => computeDashboardCounts(projects ?? [], filteredItems),
    [projects, filteredItems],
  );

  const isLoading = isLoadingProjects || isLoadingItems;

  if (!user || isLoadingAppUser) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        <title>Dashboard de Projetos | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Dashboard de Projetos" isLoading={isLoading} />

        <Stack gap={6}>
          <Box
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
          >
            <HStack wrap="wrap" gap={3}>
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                maxW="220px"
              />
              <select
                value={sellerId}
                onChange={e => setSellerId(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px' }}
              >
                <option value="">Todos os vendedores</option>
                {sellers?.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name}
                  </option>
                ))}
              </select>
              <select
                value={designerId}
                onChange={e => setDesignerId(e.target.value)}
                style={{ padding: '8px', borderRadius: '6px' }}
              >
                <option value="">Todos os desenhistas</option>
                {designers?.map(designer => (
                  <option key={designer.id} value={designer.id}>
                    {designer.name}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as ProjectItemStatus | '')}
                style={{ padding: '8px', borderRadius: '6px' }}
              >
                <option value="">Todos os status</option>
                {STATUS_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {INTERNAL_STATUS_LABELS[option]}
                  </option>
                ))}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="checkbox"
                  checked={delayedOnly}
                  onChange={e => setDelayedOnly(e.target.checked)}
                />
                Só atrasados
              </label>
            </HStack>
          </Box>

          <AdminDashboardCards
            counts={counts}
            pendingAssemblerPayments={pendingAssemblerPayments}
          />

          <Box
            bg="white"
            borderWidth="1px"
            borderColor="gray.200"
            borderRadius="md"
            p={4}
          >
            <DelayedItemsTable items={delayedItems} projectsById={projectsById} />
          </Box>
        </Stack>
      </Dashboard>
    </>
  );
};

export default ProjetosDashboard;
