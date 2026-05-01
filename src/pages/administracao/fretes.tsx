'use client';

import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Flex,
  HStack,
  IconButton,
  Input,
  Portal,
  Spinner,
  Stack,
  Table,
  Text,
  useDisclosure,
} from '@chakra-ui/react';
import { toaster } from '@/components/ui/toaster';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FaCheck, FaTrash } from 'react-icons/fa';

import { useAuth } from '../../hooks/authContext';
import {
  useAreas,
  useAddArea,
  useRemoveArea,
  useUpdateAreaFreight,
} from '../../hooks/useAreas';
import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormModal } from '../../components/Form/Modal';
import { Loader } from '../../components/Loader';
import { Area } from '../../types';

interface NewAreaForm {
  name: string;
  freight: string;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const parseFreightInput = (raw: string): number | null => {
  const normalized = raw.replace(/\s/g, '').replace(',', '.');
  if (normalized === '') return 0;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
};

const Fretes = () => {
  const { user } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  const { data: areas, isLoading, isFetching } = useAreas();
  const addArea = useAddArea();
  const updateFreight = useUpdateAreaFreight();
  const removeArea = useRemoveArea();

  const { open: addOpen, onOpen: openAdd, onClose: closeAdd } = useDisclosure();
  const [search, setSearch] = React.useState('');
  const [drafts, setDrafts] = React.useState<Record<string, string>>({});
  const [savingName, setSavingName] = React.useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = React.useState<Area | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewAreaForm>({
    defaultValues: { name: '', freight: '' },
  });

  const filtered = React.useMemo(() => {
    if (!areas) return [];
    const term = search.trim().toLowerCase();
    if (!term) return areas;
    return areas.filter(a => a.name.toLowerCase().includes(term));
  }, [areas, search]);

  const handleDraftChange = (name: string, value: string) => {
    setDrafts(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveFreight = async (area: Area) => {
    const raw = drafts[area.name];
    if (raw === undefined) return;
    const parsed = parseFreightInput(raw);
    if (parsed === null) {
      toaster.create({ type: 'error', description: 'Valor inválido.' });
      return;
    }
    if (parsed === area.freight) {
      setDrafts(prev => {
        const copy = { ...prev };
        delete copy[area.name];
        return copy;
      });
      return;
    }
    setSavingName(area.name);
    try {
      await updateFreight.mutateAsync({ name: area.name, freight: parsed });
      toaster.create({
        type: 'success',
        description: `Frete de ${area.name} atualizado.`,
      });
      setDrafts(prev => {
        const copy = { ...prev };
        delete copy[area.name];
        return copy;
      });
    } catch (err) {
      console.error(err);
      toaster.create({ type: 'error', description: 'Erro ao salvar frete.' });
    } finally {
      setSavingName(null);
    }
  };

  const handleAdd = async (data: NewAreaForm) => {
    const parsed = parseFreightInput(data.freight);
    if (parsed === null) {
      toaster.create({ type: 'error', description: 'Frete inválido.' });
      return;
    }
    try {
      await addArea.mutateAsync({ name: data.name.trim(), freight: parsed });
      toaster.create({
        type: 'success',
        description: 'Bairro cadastrado.',
      });
      reset({ name: '', freight: '' });
      closeAdd();
    } catch (err: any) {
      toaster.create({
        type: 'error',
        description: err?.message || 'Erro ao adicionar bairro.',
      });
    }
  };

  const handleRemove = async () => {
    if (!confirmRemove) return;
    try {
      await removeArea.mutateAsync(confirmRemove.name);
      toaster.create({
        type: 'success',
        description: `${confirmRemove.name} removido.`,
      });
      setConfirmRemove(null);
    } catch (err) {
      console.error(err);
      toaster.create({ type: 'error', description: 'Erro ao remover bairro.' });
    }
  };

  if (!user) return <Loader />;

  return (
    <>
      <Head>
        <title>Fretes | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header
          pageTitle="Fretes por Bairro"
          isLoading={isFetching && !isLoading}
        >
          <Button colorScheme="orange" onClick={openAdd}>
            Novo Bairro
          </Button>
        </Header>

        <Stack gap={4}>
          <Input
            placeholder="Buscar bairro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            maxW={['100%', '100%', '320px']}
            borderColor="yellow.500"
          />

          {isLoading ? (
            <Flex justify="center" py={10}>
              <Spinner colorScheme="orange" />
            </Flex>
          ) : (
            <Box overflowX="auto" bg="white" borderRadius="md" shadow="sm">
              <Table.Root variant="outline" colorScheme="orange">
                <Table.Header>
                  <Table.Row>
                    <Table.ColumnHeader>Bairro</Table.ColumnHeader>
                    <Table.ColumnHeader w="220px">Frete (R$)</Table.ColumnHeader>
                    <Table.ColumnHeader w="160px" textAlign="right">
                      Ações
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {filtered.map(area => {
                    const draft = drafts[area.name];
                    const dirty = draft !== undefined;
                    const inputValue =
                      draft ??
                      (area.freight === 0
                        ? ''
                        : String(area.freight).replace('.', ','));
                    const isSaving = savingName === area.name;
                    return (
                      <Table.Row key={area.name}>
                        <Table.Cell>{area.name}</Table.Cell>
                        <Table.Cell>
                          <HStack>
                            <Input
                              value={inputValue}
                              onChange={e =>
                                handleDraftChange(area.name, e.target.value)
                              }
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveFreight(area);
                              }}
                              size="sm"
                              borderColor={dirty ? 'yellow.500' : 'gray.300'}
                              placeholder="0,00"
                              w="120px"
                            />
                            {dirty && (
                              <IconButton
                                aria-label="Salvar"
                                size="sm"
                                colorScheme="orange"
                                onClick={() => handleSaveFreight(area)}
                                loading={isSaving}
                              >
                                <FaCheck />
                              </IconButton>
                            )}
                          </HStack>
                        </Table.Cell>
                        <Table.Cell textAlign="right">
                          <HStack justify="flex-end">
                            <Text fontSize="sm" color="gray.500">
                              {formatBRL(area.freight)}
                            </Text>
                            <IconButton
                              aria-label={`Remover ${area.name}`}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => setConfirmRemove(area)}
                            >
                              <FaTrash />
                            </IconButton>
                          </HStack>
                        </Table.Cell>
                      </Table.Row>
                    );
                  })}
                  {filtered.length === 0 && (
                    <Table.Row>
                      <Table.Cell colSpan={3}>
                        <Text textAlign="center" color="gray.500" py={4}>
                          Nenhum bairro encontrado.
                        </Text>
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </Box>
          )}
        </Stack>

        <FormModal
          isOpen={addOpen}
          title="Novo Bairro"
          onClose={() => {
            reset({ name: '', freight: '' });
            closeAdd();
          }}
          onSubmit={handleSubmit(handleAdd)}
        >
          <Stack gap={4} as="form">
            <FormInput
              {...register('name', { required: 'Nome obrigatório' })}
              name="name"
              label="Nome do bairro"
              error={errors.name as any}
              disabled={isSubmitting}
            />
            <FormInput
              {...register('freight')}
              name="freight"
              label="Frete (R$)"
              placeholder="Ex: 25,00"
              error={errors.freight as any}
              disabled={isSubmitting}
            />
          </Stack>
        </FormModal>

        <Dialog.Root
          open={!!confirmRemove}
          onOpenChange={e => {
            if (!e.open && !removeArea.isPending) setConfirmRemove(null);
          }}
          placement="center"
          motionPreset="slide-in-bottom"
        >
          <Portal>
            <Dialog.Backdrop />
            <Dialog.Positioner padding={[2, 4]}>
              <Dialog.Content
                mx="auto"
                w={['100%', '100%', 'auto']}
                maxW={['100%', '100%', '420px']}
              >
                <Dialog.Header>
                  <Dialog.Title>Remover bairro</Dialog.Title>
                </Dialog.Header>
                <Dialog.Body pb={4}>
                  {confirmRemove && (
                    <Stack gap={3}>
                      <Text>
                        Tem certeza que deseja remover{' '}
                        <Text as="span" fontWeight="bold">
                          {confirmRemove.name}
                        </Text>
                        ? Pedidos antigos não serão alterados, mas o bairro
                        deixará de aparecer no formulário de novo serviço.
                      </Text>
                    </Stack>
                  )}
                </Dialog.Body>
                <Dialog.Footer>
                  <Stack
                    direction={['column-reverse', 'column-reverse', 'row']}
                    w="100%"
                    gap={2}
                    justify="flex-end"
                  >
                    <Button
                      variant="outline"
                      onClick={() => setConfirmRemove(null)}
                      disabled={removeArea.isPending}
                    >
                      Cancelar
                    </Button>
                    <Button
                      colorScheme="red"
                      onClick={handleRemove}
                      loading={removeArea.isPending}
                    >
                      <FaTrash /> Remover
                    </Button>
                  </Stack>
                </Dialog.Footer>
                <Dialog.CloseTrigger asChild>
                  <CloseButton disabled={removeArea.isPending} />
                </Dialog.CloseTrigger>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </Dashboard>
    </>
  );
};

export default Fretes;
