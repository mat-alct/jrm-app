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
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';

import { UserForm, UserFormValues } from '@/components/projects/UserForm';
import {
  createAdminUser,
  updateAdminUser,
  useUsers,
} from '@/services/projects/adminUsers';
import { useAppUser } from '@/services/projects/users.service';
import { UserRole } from '@/types/projects';
import { isAdmin } from '@/utils/projects/permissions';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { toaster } from '../../components/ui/toaster';
import { useAuth } from '../../hooks/authContext';

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  seller: 'Vendedor',
  designer: 'Desenhista',
  assembler: 'Montador',
};

const Usuarios = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { data: appUser, isLoading: isLoadingAppUser } = useAppUser();
  const { data: users, isLoading, isFetching, refetch } = useUsers();
  const { onOpen, open, onClose } = useDisclosure();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  React.useEffect(() => {
    if (!isLoadingAppUser && appUser && !isAdmin(appUser.roles)) {
      router.push('/');
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
          <Button colorScheme="orange" onClick={onOpen}>
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
              <Dialog.Content>
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

        <Box overflowX="auto">
          <Table.Root variant="outline" colorScheme="orange" whiteSpace="nowrap">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeader>Nome</Table.ColumnHeader>
                <Table.ColumnHeader>E-mail</Table.ColumnHeader>
                <Table.ColumnHeader>Papéis</Table.ColumnHeader>
                <Table.ColumnHeader>Ativo</Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {users?.map(appUserRow => (
                <Table.Row key={appUserRow.id}>
                  <Table.Cell>{appUserRow.name}</Table.Cell>
                  <Table.Cell>{appUserRow.email}</Table.Cell>
                  <Table.Cell>
                    <HStack wrap="wrap" gap={1}>
                      {appUserRow.roles.map(role => (
                        <Badge key={role} colorScheme="orange">
                          {ROLE_LABELS[role]}
                        </Badge>
                      ))}
                    </HStack>
                  </Table.Cell>
                  <Table.Cell>
                    <Switch.Root
                      checked={appUserRow.active}
                      onCheckedChange={e =>
                        handleToggleActive(appUserRow.id, e.checked)
                      }
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
            <Text mt={4} color="gray.500">
              Nenhum usuário cadastrado ainda.
            </Text>
          )}
        </Box>
      </Dashboard>
    </>
  );
};

export default Usuarios;
