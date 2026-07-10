import {
  Alert,
  Box,
  Button,
  Center,
  Flex,
  Heading,
  HStack,
  Icon,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { FieldError } from 'react-hook-form';
import { FaCheckCircle, FaExclamationTriangle, FaLock } from 'react-icons/fa';

import { toaster } from '@/components/ui/toaster';

import { CuttingPlanSection } from '../../../components/CuttingPlan';
import { Dashboard } from '../../../components/Dashboard';
import { Header } from '../../../components/Dashboard/Content/Header';
import { FormInput } from '../../../components/Form/Input';
import { Loader } from '../../../components/Loader';
import { Cutlist as CutlistComponent } from '../../../components/NewOrder/Cutlist';
import type { CuttingPlan } from '../../../domain/cutting-plan';
import { useAuth } from '../../../hooks/authContext';
import { useOrder } from '../../../hooks/order';
import { db } from '../../../services/firebase';
import { Cutlist as CutlistType, Order } from '../../../types';
import { formatBRL } from '../../../utils/formatBRL';

const draftKey = (id: string) => `app@jrmcompensados:editDraft:${id}`;

const sumPrice = (items: CutlistType[]) =>
  items.reduce((acc, item) => acc + (item.price ?? 0), 0);

type OrderDocument = Order & {
  id: string;
  orderCode?: number;
  orderPrice?: number;
};

const parseCutlistDraft = (serialized: string): CutlistType[] | null => {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as CutlistType[]) : null;
  } catch {
    return null;
  }
};

const EditarPedido = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { updateOrderCutlist } = useOrder();

  const id = typeof router.query.id === 'string' ? router.query.id : undefined;

  useEffect(() => {
    if (user === null) void router.push('/login');
  }, [user, router]);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery<OrderDocument | null>({
    queryKey: ['order', id],
    queryFn: async () => {
      if (!id) return null;
      const snap = await getDoc(doc(db, 'orders', id));
      if (!snap.exists()) return null;
      return { ...(snap.data() as Order), id: snap.id };
    },
    enabled: !!id && !!user,
  });

  const [cutlist, setCutlist] = useState<CutlistType[]>([]);
  const [cuttingPlan, setCuttingPlan] = useState<CuttingPlan | undefined>();
  const [hydrated, setHydrated] = useState(false);
  const [shouldCharge, setShouldCharge] = useState<boolean | null>(null);
  const [sellerPassword, setSellerPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Hidrata o cutlist a partir do localStorage (rascunho específico desse pedido)
  // ou do pedido do banco. Roda só uma vez por id.
  useEffect(() => {
    if (!id || !order || hydrated) return;
    const draft = localStorage.getItem(draftKey(id));
    if (draft) {
      setCutlist(parseCutlistDraft(draft) ?? order.cutlist ?? []);
    } else {
      setCutlist(order.cutlist ?? []);
    }
    setCuttingPlan(order.cuttingPlan);
    setHydrated(true);
  }, [id, order, hydrated]);

  const updateCutlist = useCallback(
    (data: CutlistType[], maintainOldValues = true) => {
      if (!id) return;
      setCutlist(prev => {
        const next = maintainOldValues ? [...prev, ...data] : [...data];
        localStorage.setItem(draftKey(id), JSON.stringify(next));
        return next;
      });
    },
    [id],
  );

  const previousOrderPrice = useMemo(
    () => order?.orderPrice ?? sumPrice(order?.cutlist ?? []),
    [order],
  );
  const requiresCuttingPlan =
    order?.serviceType === 'cutting_plan' || Boolean(cuttingPlan);
  const newOrderPrice = useMemo(
    () =>
      cuttingPlan && cuttingPlan.status !== 'outdated'
        ? cuttingPlan.pricing.totalCost
        : sumPrice(cutlist),
    [cutlist, cuttingPlan],
  );
  const priceDifference = newOrderPrice - previousOrderPrice;
  const hasDiff = priceDifference !== 0;

  const handleSubmit = async () => {
    if (!id || !order) return;
    setPasswordError(null);

    if (cutlist.length < 1) {
      toaster.create({
        type: 'error',
        description: 'O pedido precisa ter ao menos uma peça.',
      });
      return;
    }
    if (!sellerPassword) {
      setPasswordError('Senha obrigatória');
      return;
    }
    if (
      requiresCuttingPlan &&
      (!cuttingPlan || cuttingPlan.status === 'outdated')
    ) {
      toaster.create({
        type: 'error',
        description: 'Gere um plano de corte atualizado antes de confirmar.',
      });
      return;
    }
    if (hasDiff && shouldCharge === null) {
      toaster.create({
        type: 'error',
        description: 'Selecione se a diferença deve ser cobrada.',
      });
      return;
    }

    setSubmitting(true);
    const result = await updateOrderCutlist(
      id,
      cutlist,
      sellerPassword,
      shouldCharge ?? false,
      cuttingPlan,
    );
    setSubmitting(false);

    if (!result.success) {
      if (result.reason === 'invalid-password') {
        setPasswordError('Senha inválida');
      } else if (result.reason === 'order-missing') {
        toaster.create({
          type: 'error',
          description: 'Pedido não encontrado.',
        });
      } else {
        toaster.create({
          type: 'error',
          description: 'Erro ao atualizar pedido.',
        });
      }
      return;
    }

    localStorage.removeItem(draftKey(id));
    toaster.create({
      type: 'success',
      description: 'Pedido atualizado com sucesso.',
    });
    void router.push('/cortes/listadecortes');
  };

  if (!user) return <Loader />;

  if (isLoading) {
    return (
      <Dashboard>
        <Header pageTitle="Editar Pedido" />
        <Center p={10}>
          <Spinner color="orange.500" />
        </Center>
      </Dashboard>
    );
  }

  if (isError || !order) {
    return (
      <Dashboard>
        <Header pageTitle="Editar Pedido" />
        <Alert.Root status="error" borderRadius="md" mt={4}>
          <Alert.Indicator>
            <FaExclamationTriangle />
          </Alert.Indicator>
          <Alert.Title>Pedido não encontrado.</Alert.Title>
        </Alert.Root>
      </Dashboard>
    );
  }

  if (order.orderStatus !== 'Em Produção') {
    return (
      <Dashboard>
        <Header pageTitle="Editar Pedido" />
        <Alert.Root status="warning" borderRadius="md" mt={4}>
          <Alert.Indicator>
            <FaExclamationTriangle />
          </Alert.Indicator>
          <Alert.Title>
            Apenas pedidos em produção podem ser editados.
          </Alert.Title>
          <Alert.Description>
            Status atual: {order.orderStatus}
          </Alert.Description>
        </Alert.Root>
      </Dashboard>
    );
  }

  return (
    <>
      <Head>
        <title>Editar Pedido #{order.orderCode ?? '—'} | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle={`Editar Pedido #${order.orderCode ?? '—'}`} />

        {/* Resumo somente leitura */}
        <Box
          bg="white"
          borderRadius="xl"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          p={6}
          mt={2}
        >
          <Heading size="sm" color="gray.700" mb={3}>
            Cliente
          </Heading>
          <Text>
            <strong>{order.customer?.name}</strong>
            {order.customer?.telephone && ` · ${order.customer.telephone}`}
          </Text>
          <Text fontSize="sm" color="gray.600" mt={1}>
            Vendedor original: {order.seller}
          </Text>
          {order.deliveryType === 'Entrega' && (
            <Box mt={3} pt={3} borderTopWidth="1px" borderColor="gray.200">
              <Text fontSize="sm" color="gray.600">
                Entrega em <strong>{order.customer?.area || '—'}</strong>
              </Text>
              <Text fontSize="sm" color="gray.600" mt={1}>
                Frete (fixo, não editável):{' '}
                <strong>{formatBRL(order.freightPrice ?? 0)}</strong>
              </Text>
            </Box>
          )}
        </Box>

        {hydrated && (
          <>
            <Box mt={8}>
              <CutlistComponent
                cutlist={cutlist}
                updateCutlist={updateCutlist}
              />
            </Box>
            <CuttingPlanSection
              cutlist={cutlist}
              plan={cuttingPlan}
              onPlanChange={setCuttingPlan}
              orderId={id}
              required={requiresCuttingPlan}
            />
          </>
        )}

        {/* Barra de confirmação */}
        <Box
          bg="white"
          p={6}
          borderRadius="xl"
          shadow="sm"
          borderWidth="1px"
          borderColor="gray.200"
          mt={4}
        >
          <Stack gap={6}>
            <Flex
              direction={['column', 'column', 'row']}
              justify="space-between"
              gap={4}
            >
              <Box>
                <Text fontSize="sm" color="gray.600">
                  Preço original
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="gray.800">
                  {formatBRL(previousOrderPrice)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">
                  Novo preço
                </Text>
                <Text fontSize="xl" fontWeight="bold" color="gray.800">
                  {formatBRL(newOrderPrice)}
                </Text>
              </Box>
              <Box>
                <Text fontSize="sm" color="gray.600">
                  Diferença
                </Text>
                <Text
                  fontSize="xl"
                  fontWeight="bold"
                  color={
                    priceDifference > 0
                      ? 'red.500'
                      : priceDifference < 0
                        ? 'green.500'
                        : 'gray.700'
                  }
                >
                  {priceDifference > 0 ? '+' : ''}
                  {formatBRL(priceDifference)}
                </Text>
              </Box>
              {(order.freightPrice ?? 0) > 0 && (
                <Box>
                  <Text fontSize="sm" color="gray.600">
                    Total novo (c/ frete)
                  </Text>
                  <Text fontSize="xl" fontWeight="bold" color="orange.600">
                    {formatBRL(newOrderPrice + (order.freightPrice ?? 0))}
                  </Text>
                </Box>
              )}
            </Flex>

            {hasDiff && (
              <Box
                bg="orange.50"
                p={4}
                borderRadius="md"
                borderLeftWidth="4px"
                borderColor="orange.400"
              >
                <Text fontWeight="bold" mb={3} color="gray.800">
                  A diferença deve ser cobrada?
                </Text>
                <HStack gap={3}>
                  <Button
                    flex="1"
                    colorScheme={shouldCharge === true ? 'orange' : 'gray'}
                    variant={shouldCharge === true ? 'solid' : 'outline'}
                    onClick={() => setShouldCharge(true)}
                  >
                    Sim
                  </Button>
                  <Button
                    flex="1"
                    colorScheme={shouldCharge === false ? 'orange' : 'gray'}
                    variant={shouldCharge === false ? 'solid' : 'outline'}
                    onClick={() => setShouldCharge(false)}
                  >
                    Não
                  </Button>
                </HStack>
              </Box>
            )}

            <Flex
              direction={['column', 'column', 'row']}
              align={['stretch', 'stretch', 'flex-end']}
              gap={6}
            >
              <Box w="100%" maxW="300px">
                <Text mb={2} fontWeight="bold" color="gray.700">
                  Senha do Vendedor
                </Text>
                <Flex align="center" gap={3}>
                  <Icon as={FaLock} color="orange.500" boxSize={5} />
                  <FormInput
                    name="sellerPassword"
                    type="text"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    spellCheck={false}
                    style={
                      { WebkitTextSecurity: 'disc' } as React.CSSProperties
                    }
                    size="lg"
                    bg="gray.50"
                    borderWidth="1px"
                    borderColor="gray.300"
                    color="gray.800"
                    height="60px"
                    value={sellerPassword}
                    onChange={e => setSellerPassword(e.target.value)}
                    error={
                      passwordError
                        ? ({
                            type: 'manual',
                            message: passwordError,
                          } as FieldError)
                        : undefined
                    }
                  />
                </Flex>
              </Box>
              <Box flex="1" w="100%">
                <Button
                  bg="orange.500"
                  color="white"
                  _hover={{ bg: 'orange.600' }}
                  _active={{ bg: 'orange.700' }}
                  size="xl"
                  height="60px"
                  fontSize="xl"
                  fontWeight="bold"
                  width="100%"
                  shadow="md"
                  onClick={() => void handleSubmit()}
                  loading={submitting}
                  disabled={
                    cutlist.length < 1 ||
                    (requiresCuttingPlan &&
                      (!cuttingPlan || cuttingPlan.status === 'outdated'))
                  }
                  display="flex"
                  gap={3}
                >
                  ATUALIZAR PEDIDO
                  <Icon as={FaCheckCircle} />
                </Button>
              </Box>
            </Flex>
          </Stack>
        </Box>
      </Dashboard>
    </>
  );
};

export default EditarPedido;
