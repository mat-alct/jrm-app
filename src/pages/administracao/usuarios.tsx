import {
  Badge,
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  Switch,
  Table,
  useDisclosure,
} from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { FiUsers } from 'react-icons/fi';

import { UserForm, UserFormValues } from '@/components/projects/UserForm';
import { AppCard } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import {
  createAdminUser,
  updateAdminUser,
  useUsers,
} from '@/services/projects/adminUsers';
import { useAppUser } from '@/services/projects/users.service';
import {
  isAdmin,
  ROLE_LABELS,
} from '@/utils/projects/permissions';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { toaster } from '../../components/ui/toaster';
import { useAuth } from '../../hooks/authContext';

const Usuarios = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const { data: users, isLoading, isFetching, refetch } = useUsers();
  const { onOpen, open, onClose } = useDisclosure();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user === null) {
      void router.push('/login');
    }
  }, [user, router]);

  React.useEffect(() => {
    if (!isLoadingAppUser && appUser && !isAdmin(appUser.roles)) {
      void router.push('/');
    }
  }, [appUser, isLoadingAppUser, router]);

  const handleCreate = async (values: UserFormValues) => {
    setIsSubmitting(true);
    try {
      await createAdminUser(values);
      await refetch();
      toaster.create({ type: 'success', description: 'Usuário criado.' });
      onClose();
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error ? error.message : 'Erro ao criar usuário.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await updateAdminUser({ id, active });
      await refetch();
    } catch {
      toaster.create({
        type: 'error',
        description: 'Erro ao atualizar usuário.',
      });
    }
  };

  if (!user || isLoadingAppUser) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        <title>Usuários | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header
          pageTitle="Usuários"
          isLoading={isFetching && !isLoading}
        >
          <Button
            bg="app.ink"
            color="white"
            rounded="lg"
            fontWeight="600"
            _hover={{ bg: 'app.inkHover' }}
            _focusVisible={{ shadow: 'focus', outline: 'none' }}
            onClick={onOpen}
          >
            Novo Usuário
          </Button>
        </Header>

        <Dialog.Root
          open={open}
          onOpenChange={e => {
            if (!e.open) onClose();
          }}
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner>
              <Dialog.Content
                bg="app.surface"
                borderWidth="1px"
                borderColor="app.border"
                rounded="xl"
                shadow="card"
              >
                <Dialog.Header>
                  <Dialog.Title>Novo Usuário</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body pb={6}>
                  <UserForm
                    onSubmit={handleCreate}
                    isSubmitting={isSubmitting}
                  />
                </Dialog.Body>
                <Dialog.CloseTrigger asChild>
                  <CloseButton />
                </Dialog.CloseTrigger>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>

        <AppCard>
          <Box overflowX="auto">
          <Table.Root whiteSpace="nowrap">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader
                  bg="app.sunken"
                  color="app.textMuted"
                  fontSize="11px"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                >
                  Nome
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  bg="app.sunken"
                  color="app.textMuted"
                  fontSize="11px"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                >
                  E-mail
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  bg="app.sunken"
                  color="app.textMuted"
                  fontSize="11px"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                >
                  Papéis
                </Table.ColumnHeader>
                <Table.ColumnHeader
                  bg="app.sunken"
                  color="app.textMuted"
                  fontSize="11px"
                  fontWeight="600"
                  textTransform="uppercase"
                  letterSpacing="0.05em"
                >
                  Ativo
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users?.map(appUserRow => (
                <Table.Row key={appUserRow.id} borderColor="app.border">
                  <Table.Cell color="app.text" fontWeight="500">
                    {appUserRow.name}
                  </Table.Cell>
                  <Table.Cell color="app.textSecondary">{appUserRow.email}</Table.Cell>
                  <Table.Cell>
                    <HStack wrap="wrap" gap={1}>
                      {appUserRow.roles.map(role => (
                        <Badge key={role} colorPalette="gray" borderRadius="full">
                          {ROLE_LABELS[role]}
                        </Badge>
                      ))}
                    </HStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Switch.Root
                      checked={appUserRow.active}
                      onCheckedChange={e => {
                        void handleToggleActive(appUserRow.id, e.checked);
                      }}
                    >
                      <Switch.HiddenInput />
                      <Switch.Control />
                    </Switch.Root>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
          {!isLoading && users?.length === 0 && (
            <EmptyState
              icon={FiUsers}
              title="Nenhum usuário cadastrado"
              description="Os perfis internos criados pela administração aparecem aqui."
            />
          )}
        </Box>
        </AppCard>
      </Dashboard>
    </>
  );
};

export default Usuarios;
