import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  HStack,
  Heading,
  Icon,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { differenceInCalendarDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Timestamp,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FaArrowRight,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaIndustry,
  FaMapMarkerAlt,
  FaPen,
  FaPhone,
  FaPlus,
  FaShippingFast,
  FaThLarge,
  FaTrash,
  FaTruck,
  FaUserTie,
} from 'react-icons/fa';
import { useQuery } from '@tanstack/react-query';

import { Dashboard } from '../components/Dashboard';
import { Header } from '../components/Dashboard/Content/Header';
import { Loader } from '../components/Loader';
import { toaster } from '@/components/ui/toaster';
import { useAuth } from '../hooks/authContext';
import { db } from '../services/firebase';
import { queryClient } from '../services/queryClient';

const ConfirmStatusDialog = dynamic(
  () =>
    import('../components/cortes/ConfirmStatusDialog').then(
      m => m.ConfirmStatusDialog,
    ),
  { ssr: false },
);

const GOLD = '#F5B820';
const DARK = '#2E2D2C';
const DARK_2 = '#3A3937';
const TEXT_PRIMARY = '#1A1918';
const TEXT_SECONDARY = '#6B6966';
const TEXT_TERTIARY = '#9E9B98';
const SURFACE = '#F7F7F6';
const SURFACE_2 = '#EFEFED';
const BORDER = 'rgba(0,0,0,0.07)';
const RED = '#E03C3C';
const RED_BG = '#FEF2F2';
const RED_BORDER = '#FECACA';
const BLUE = '#2563EB';
const AMBER = '#D97706';
const GREEN = '#16A34A';

type TimelineEventType = 'created' | 'edited' | 'deleted' | 'released';

type TimelineEvent = {
  id: string;
  at: Date;
  sentence: string;
  type: TimelineEventType;
};

const deliveryRelativeLabel = (date: Date): string => {
  const days = differenceInCalendarDays(date, new Date());
  if (days < 0) return `${Math.abs(days)}d atrasado`;
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  if (days < 30) return `+${days} dias`;
  return format(date, "MMM'/'yy", { locale: ptBR });
};

// Renderiza a sentença destacando códigos no formato "#1234" em negrito.
const renderSentence = (s: string) => {
  const parts = s.split(/(#\d+)/g);
  return parts.map((p, i) =>
    /^#\d+$/.test(p) ? (
      <Text as="span" key={i} fontWeight="semibold">
        {p}
      </Text>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    ),
  );
};

interface StatCardProps {
  label: string;
  tag: string;
  value: number | string;
  icon: React.ElementType;
  variant: 'dark' | 'light';
  href?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  tag,
  value,
  icon,
  variant,
  href,
  isLoading,
}) => {
  const router = useRouter();
  const isDark = variant === 'dark';
  return (
    <Box
      bg={isDark ? DARK : 'white'}
      borderWidth="1px"
      borderColor={isDark ? 'whiteAlpha.100' : BORDER}
      borderRadius="xl"
      shadow={isDark ? undefined : 'sm'}
      p={5}
      cursor={href ? 'pointer' : 'default'}
      transition="transform 0.15s, box-shadow 0.15s"
      _hover={
        href
          ? {
              transform: 'translateY(-2px)',
              shadow: 'md',
            }
          : undefined
      }
      onClick={() => href && router.push(href)}
    >
      <Flex align="center" justify="space-between" mb={3.5}>
        <Flex
          w="30px"
          h="30px"
          align="center"
          justify="center"
          borderRadius="md"
          bg={isDark ? 'rgba(245,184,32,0.15)' : SURFACE_2}
          color={isDark ? GOLD : TEXT_SECONDARY}
          flexShrink={0}
        >
          <Icon as={icon} boxSize={3.5} />
        </Flex>
        <Box
          fontSize="10.5px"
          fontWeight="semibold"
          px="2"
          py="0.5"
          borderRadius="full"
          letterSpacing="0.02em"
          bg={isDark ? 'rgba(245,184,32,0.15)' : SURFACE_2}
          color={isDark ? GOLD : TEXT_SECONDARY}
        >
          {tag}
        </Box>
      </Flex>
      {isLoading ? (
        <Spinner size="sm" color={isDark ? GOLD : TEXT_TERTIARY} />
      ) : (
        <Text
          fontSize="32px"
          fontWeight="bold"
          lineHeight="1"
          letterSpacing="-0.04em"
          color={isDark ? 'white' : TEXT_PRIMARY}
        >
          {value}
        </Text>
      )}
      <Text
        fontSize="12.5px"
        fontWeight="medium"
        mt={2}
        color={isDark ? 'whiteAlpha.600' : TEXT_SECONDARY}
      >
        {label}
      </Text>
    </Box>
  );
};

interface DeadlineItem {
  id: string;
  orderCode: string | number;
  customerName: string;
  customerAddress: string | null;
  customerTelephone: string | null;
  seller: string | null;
  deliveryDate: Date;
  deliveryType?: string;
  orderStatus: string;
  isUrgent?: boolean;
}

const formatAddress = (customer: any): string | null => {
  if (!customer) return null;
  const parts = [customer.address, customer.area].filter(Boolean);
  return parts.length ? parts.join(' — ') : null;
};

type DeadlineFilter =
  | 'all'
  | 'delivery_all'
  | 'delivery_released'
  | 'shop_released';

const Home = () => {
  const { user } = useAuth();
  const router = useRouter();
  const toast = toaster;
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>('all');
  const [confirmingStatusOrder, setConfirmingStatusOrder] = useState<any | null>(
    null,
  );
  const [advancingStatus, setAdvancingStatus] = useState(false);

  const updateOrderStatus = useCallback(
    async (id: string) => {
      setAdvancingStatus(true);
      try {
        const orderRef = doc(db, 'orders', id);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return;
        const order = orderSnap.data() as any;
        let nextState: string | null = null;
        if (order.orderStatus === 'Em Produção') {
          nextState = 'Liberado para Transporte';
        } else if (order.orderStatus === 'Liberado para Transporte') {
          nextState = 'Concluído';
        }
        if (nextState) {
          const now = Timestamp.now();
          await updateDoc(
            orderRef,
            nextState === 'Liberado para Transporte'
              ? { orderStatus: nextState, updatedAt: now, releasedAt: now }
              : { orderStatus: nextState, updatedAt: now },
          );
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['orders'] }),
            queryClient.invalidateQueries({ queryKey: ['home-stats'] }),
            queryClient.invalidateQueries({
              queryKey: ['home-next-deadlines'],
            }),
            queryClient.invalidateQueries({ queryKey: ['home-timeline'] }),
          ]);
          toast.create({
            type: 'success',
            description: `Status atualizado para ${nextState}`,
          });
        }
      } catch {
        toast.create({ type: 'error', description: 'Erro ao concluir etapa' });
      } finally {
        setAdvancingStatus(false);
        setConfirmingStatusOrder(null);
      }
    },
    [toast],
  );

  useEffect(() => {
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  // --- Estatísticas (contagem direta no servidor) ---
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['home-stats'],
    enabled: !!user,
    queryFn: async () => {
      const ordersRef = collection(db, 'orders');
      const estimatesRef = collection(db, 'estimates');

      const [
        emProducaoSnap,
        liberadoSnap,
        concluidoSnap,
        orcamentoSnap,
        urgentesSnap,
      ] = await Promise.all([
        getCountFromServer(
          query(ordersRef, where('orderStatus', '==', 'Em Produção')),
        ),
        getCountFromServer(
          query(
            ordersRef,
            where('orderStatus', '==', 'Liberado para Transporte'),
          ),
        ),
        getCountFromServer(
          query(ordersRef, where('orderStatus', '==', 'Concluído')),
        ),
        getCountFromServer(estimatesRef),
        getCountFromServer(
          query(
            ordersRef,
            where('isUrgent', '==', true),
            where('orderStatus', '==', 'Em Produção'),
          ),
        ),
      ]);

      return {
        emProducao: emProducaoSnap.data().count,
        liberado: liberadoSnap.data().count,
        concluido: concluidoSnap.data().count,
        orcamentos: orcamentoSnap.data().count,
        urgentes: urgentesSnap.data().count,
      };
    },
  });

  // --- Atividade recente (últimos 30 dias). Eventos: cortes adicionados,
  //     editados e desativados. Cada evento carrega seu tipo para definir
  //     o ícone/cor de exibição.
  const { data: timeline, isLoading: timelineLoading } = useQuery({
    queryKey: ['home-timeline'],
    enabled: !!user,
    queryFn: async () => {
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

      const ordersRef = collection(db, 'orders');

      const ordersSnap = await getDocs(
        query(
          ordersRef,
          where('updatedAt', '>=', oneMonthAgo),
          orderBy('updatedAt', 'desc'),
          limit(150),
        ),
      );

      const events: TimelineEvent[] = [];

      ordersSnap.docs.forEach(d => {
        const data = d.data() as any;
        const customerName = data.customer?.name ?? 'Cliente';
        const orderCode = data.orderCode ?? '—';

        const createdAt = data.createdAt?.seconds
          ? new Date(data.createdAt.seconds * 1000)
          : null;
        if (createdAt && createdAt >= oneMonthAgo) {
          const seller = data.seller ? ` por ${data.seller}` : '';
          events.push({
            id: `${d.id}-c`,
            at: createdAt,
            sentence: `Pedido #${orderCode} de ${customerName} adicionado${seller}.`,
            type: 'created',
          });
        }

        (data.edits ?? []).forEach((e: any, i: number) => {
          const editedAt = e.editedAt?.seconds
            ? new Date(e.editedAt.seconds * 1000)
            : null;
          if (!editedAt || editedAt < oneMonthAgo) return;
          const editedBy = e.editedBy ? ` por ${e.editedBy}` : '';
          const diff = e.priceDifference ?? 0;
          let diffText = '';
          if (e.shouldCharge && diff !== 0) {
            const verb = diff > 0 ? 'a receber do cliente' : 'a devolver ao cliente';
            diffText = `, com R$ ${Math.abs(diff)},00 ${verb}`;
          }
          events.push({
            id: `${d.id}-e-${i}`,
            at: editedAt,
            sentence: `Pedido #${orderCode} de ${customerName} editado${editedBy}${diffText}.`,
            type: 'edited',
          });
        });

        const deactivatedAt = data.deactivatedAt?.seconds
          ? new Date(data.deactivatedAt.seconds * 1000)
          : null;
        if (deactivatedAt && deactivatedAt >= oneMonthAgo) {
          events.push({
            id: `${d.id}-d`,
            at: deactivatedAt,
            sentence: `Pedido #${orderCode} de ${customerName} excluído.`,
            type: 'deleted',
          });
        }

        const releasedAt = data.releasedAt?.seconds
          ? new Date(data.releasedAt.seconds * 1000)
          : null;
        if (releasedAt && releasedAt >= oneMonthAgo) {
          events.push({
            id: `${d.id}-r`,
            at: releasedAt,
            sentence: `Pedido #${orderCode} de ${customerName} liberado para transporte.`,
            type: 'released',
          });
        }
      });

      events.sort((a, b) => b.at.getTime() - a.at.getTime());
      return events;
    },
  });

  // --- Próximos prazos: pedidos em produção + liberados, ordenados por
  //     deliveryDate. Lista única (sem slice) — filtro é local.
  const { data: deadlines, isLoading: deadlinesLoading } = useQuery({
    queryKey: ['home-next-deadlines'],
    enabled: !!user,
    queryFn: async (): Promise<DeadlineItem[]> => {
      const ordersRef = collection(db, 'orders');
      const [emProducaoSnap, liberadoSnap] = await Promise.all([
        getDocs(
          query(
            ordersRef,
            where('orderStatus', '==', 'Em Produção'),
            orderBy('orderCode', 'desc'),
            limit(80),
          ),
        ),
        getDocs(
          query(
            ordersRef,
            where('orderStatus', '==', 'Liberado para Transporte'),
            orderBy('orderCode', 'desc'),
            limit(80),
          ),
        ),
      ]);

      return [
        ...emProducaoSnap.docs,
        ...liberadoSnap.docs,
      ]
        .map(d => {
          const data = d.data() as any;
          if (!data.deliveryDate?.seconds) return null;
          if (data.isDeactivated === true) return null;
          return {
            id: d.id,
            orderCode: data.orderCode ?? '—',
            customerName: data.customer?.name ?? 'Cliente Removido',
            customerAddress: formatAddress(data.customer),
            customerTelephone: data.customer?.telephone ?? null,
            seller: data.seller ?? null,
            deliveryDate: new Date(data.deliveryDate.seconds * 1000),
            deliveryType: data.deliveryType,
            orderStatus: data.orderStatus,
            isUrgent: !!data.isUrgent,
          } as DeadlineItem;
        })
        .filter((x): x is DeadlineItem => x !== null)
        .sort((a, b) => a.deliveryDate.getTime() - b.deliveryDate.getTime());
    },
  });

  const filteredDeadlines = useMemo(() => {
    if (!deadlines) return [];
    switch (deadlineFilter) {
      case 'delivery_all':
        return deadlines.filter(d => d.deliveryType === 'Entrega');
      case 'delivery_released':
        return deadlines.filter(
          d =>
            d.deliveryType === 'Entrega' &&
            d.orderStatus === 'Liberado para Transporte',
        );
      case 'shop_released':
        return deadlines.filter(
          d =>
            d.deliveryType === 'Retirar na Loja' &&
            d.orderStatus === 'Liberado para Transporte',
        );
      default:
        return deadlines;
    }
  }, [deadlines, deadlineFilter]);

  if (!user) return <Loader />;

  return (
    <>
      <Head>
        <title>Início | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Início" />

        {confirmingStatusOrder && (
          <ConfirmStatusDialog
            order={confirmingStatusOrder}
            onCancel={() => setConfirmingStatusOrder(null)}
            onConfirm={updateOrderStatus}
            loading={advancingStatus}
          />
        )}

        <Stack gap={7} maxW="1280px" w="100%">
          {/* GREETING + ATALHOS */}
          <Flex
            justify="space-between"
            align={['flex-start', 'flex-start', 'center']}
            gap={3}
            wrap="wrap"
          >
            <Box>
              <Heading
                fontSize={['22px', '24px', '26px']}
                fontWeight="bold"
                color={TEXT_PRIMARY}
                letterSpacing="-0.02em"
                lineHeight="1.2"
              >
                Visão geral
              </Heading>
              <Text fontSize="14px" color={TEXT_SECONDARY} mt={1}>
                Resumo da operação de hoje.
              </Text>
            </Box>
            <HStack gap={1.5} flexShrink={0}>
              <QuickShortcut
                variant="primary"
                icon={FaPlus}
                onClick={() => router.push('/cortes/novoservico')}
              >
                Novo serviço
              </QuickShortcut>
              <QuickShortcut
                icon={FaClipboardList}
                onClick={() => router.push('/cortes/listadecortes')}
              >
                Listar
              </QuickShortcut>
              <QuickShortcut
                icon={FaThLarge}
                onClick={() => router.push('/cortes/materiais')}
              >
                Materiais
              </QuickShortcut>
            </HStack>
          </Flex>

          {/* STATS */}
          <Grid
            templateColumns={[
              'repeat(2, 1fr)',
              'repeat(2, 1fr)',
              'repeat(4, 1fr)',
            ]}
            gap={3}
          >
            <StatCard
              variant="dark"
              tag="Em Produção"
              label="pedidos ativos"
              value={stats?.emProducao ?? 0}
              icon={FaIndustry}
              href="/cortes/listadecortes"
              isLoading={statsLoading}
            />
            <StatCard
              variant="light"
              tag="Liberados"
              label="para transporte"
              value={stats?.liberado ?? 0}
              icon={FaShippingFast}
              href="/cortes/listadecortes"
              isLoading={statsLoading}
            />
            <StatCard
              variant="light"
              tag="Concluídos"
              label="no total"
              value={stats?.concluido ?? 0}
              icon={FaCheckCircle}
              href="/cortes/listadecortes"
              isLoading={statsLoading}
            />
            <StatCard
              variant="light"
              tag="Orçamentos"
              label="em aberto"
              value={stats?.orcamentos ?? 0}
              icon={FaFileInvoiceDollar}
              href="/cortes/listadecortes"
              isLoading={statsLoading}
            />
          </Grid>

          {/* ALERT URGENTES */}
          {!statsLoading && (stats?.urgentes ?? 0) > 0 && (
            <Flex
              align="center"
              gap={3}
              p={3}
              borderRadius="xl"
              borderWidth="1px"
              borderColor={RED_BORDER}
              bg={RED_BG}
              cursor="pointer"
              transition="background 0.15s"
              _hover={{ bg: '#FEE2E2' }}
              onClick={() => router.push('/cortes/listadecortes')}
            >
              <Flex
                w="30px"
                h="30px"
                align="center"
                justify="center"
                borderRadius="md"
                bg="rgba(224,60,60,0.12)"
                color={RED}
                flexShrink={0}
              >
                <Icon as={FaExclamationTriangle} boxSize={3.5} />
              </Flex>
              <Box flex="1">
                <Text fontSize="13px" fontWeight="semibold" color="#B91C1C">
                  {stats!.urgentes} pedido(s) urgente(s) em produção
                </Text>
                <Text fontSize="11.5px" color="#DC2626" opacity={0.75} mt={0.5}>
                  Confira a lista de cortes para priorizar o atendimento.
                </Text>
              </Box>
              <Icon as={FaArrowRight} boxSize={3.5} color="#DC2626" opacity={0.55} />
            </Flex>
          )}

          {/* ATIVIDADE RECENTE */}
          <Box
            bg="white"
            borderWidth="1px"
            borderColor={BORDER}
            borderRadius="xl"
            shadow="sm"
          >
            <Flex
              align="center"
              justify="space-between"
              px={5}
              pt={4}
              pb={3.5}
              borderBottomWidth="1px"
              borderColor={BORDER}
            >
              <Box>
                <Text
                  fontSize="13.5px"
                  fontWeight="semibold"
                  color={TEXT_PRIMARY}
                  letterSpacing="-0.01em"
                >
                  Atividade recente
                </Text>
                <Text fontSize="11.5px" color={TEXT_TERTIARY} mt={0.5}>
                  Últimos 30 dias · role para ver mais
                </Text>
              </Box>
            </Flex>

            {timelineLoading ? (
              <Center py={6}>
                <Spinner size="sm" color={GOLD} />
              </Center>
            ) : !timeline?.length ? (
              <Text
                fontSize="13px"
                color={TEXT_TERTIARY}
                py={6}
                px={5}
                textAlign="center"
              >
                Sem atividade no último mês.
              </Text>
            ) : (
              <Box maxH="260px" overflowY="auto" py={1}>
                {timeline.map((ev, idx) => {
                  const isEdit = ev.type === 'edited';
                  const isDeleted = ev.type === 'deleted';
                  const isReleased = ev.type === 'released';
                  const iconColor = isEdit
                    ? AMBER
                    : isDeleted
                      ? RED
                      : isReleased
                        ? GREEN
                        : BLUE;
                  const iconBg = isEdit
                    ? 'rgba(217,119,6,0.14)'
                    : isDeleted
                      ? 'rgba(224,60,60,0.14)'
                      : isReleased
                        ? 'rgba(22,163,74,0.14)'
                        : 'rgba(37,99,235,0.14)';
                  const IconComponent = isEdit
                    ? FaPen
                    : isDeleted
                      ? FaTrash
                      : isReleased
                        ? FaTruck
                        : FaPlus;
                  return (
                    <Flex
                      key={ev.id}
                      align="center"
                      gap={3}
                      px={5}
                      py={3.5}
                      borderBottomWidth={idx === timeline.length - 1 ? 0 : '1px'}
                      borderColor={BORDER}
                      bg={isEdit ? 'rgba(217,119,6,0.05)' : undefined}
                      transition="background 0.12s"
                      _hover={{ bg: isEdit ? 'rgba(217,119,6,0.10)' : SURFACE }}
                    >
                      <Flex
                        w="20px"
                        h="20px"
                        align="center"
                        justify="center"
                        borderRadius="full"
                        bg={iconBg}
                        color={iconColor}
                        flexShrink={0}
                      >
                        <Icon as={IconComponent} boxSize={2.5} />
                      </Flex>
                      <Text
                        flex="1"
                        fontSize="13.5px"
                        color={TEXT_PRIMARY}
                        fontWeight={isEdit ? 'semibold' : 'normal'}
                        lineHeight="1.45"
                      >
                        {renderSentence(ev.sentence)}
                      </Text>
                      <Text
                        fontFamily="mono"
                        fontSize="11px"
                        color={TEXT_TERTIARY}
                        whiteSpace="nowrap"
                        flexShrink={0}
                      >
                        {format(ev.at, "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </Text>
                    </Flex>
                  );
                })}
              </Box>
            )}
          </Box>

          {/* PRÓXIMOS PRAZOS */}
          <Box
            bg="white"
            borderWidth="1px"
            borderColor={BORDER}
            borderRadius="xl"
            shadow="sm"
          >
              <Flex
                align="center"
                justify="space-between"
                px={5}
                pt={4}
                pb={3.5}
                borderBottomWidth="1px"
                borderColor={BORDER}
                gap={2}
                flexWrap={['wrap', 'wrap', 'nowrap']}
              >
                <Box>
                  <Text
                    fontSize="13.5px"
                    fontWeight="semibold"
                    color={TEXT_PRIMARY}
                    letterSpacing="-0.01em"
                  >
                    Próximos prazos
                  </Text>
                  <Text fontSize="11.5px" color={TEXT_TERTIARY} mt={0.5}>
                    {deadlineFilter === 'delivery_all'
                      ? 'Apenas pedidos para entrega'
                      : deadlineFilter === 'delivery_released'
                        ? 'Entregas liberadas para transporte'
                        : deadlineFilter === 'shop_released'
                          ? 'Retiradas na loja já liberadas'
                          : 'Pedidos em produção e liberados'}
                  </Text>
                </Box>
                <HStack
                  gap="1"
                  bg={SURFACE}
                  p="0.5"
                  borderRadius="md"
                  borderWidth="1px"
                  borderColor={BORDER}
                  flexWrap="wrap"
                >
                  {(
                    [
                      { id: 'all', label: 'Todos' },
                      { id: 'delivery_all', label: 'Entregas (Todas)' },
                      { id: 'delivery_released', label: 'Entregas (Liberados)' },
                      { id: 'shop_released', label: 'Loja (Liberados)' },
                    ] as { id: DeadlineFilter; label: string }[]
                  ).map(opt => {
                    const active = deadlineFilter === opt.id;
                    return (
                      <Button
                        key={opt.id}
                        size="xs"
                        variant="ghost"
                        px="2.5"
                        h="26px"
                        fontSize="11.5px"
                        fontWeight="semibold"
                        color={active ? 'white' : TEXT_SECONDARY}
                        bg={active ? DARK : 'transparent'}
                        _hover={{ bg: active ? DARK_2 : SURFACE_2 }}
                        onClick={() => setDeadlineFilter(opt.id)}
                      >
                        {opt.label}
                      </Button>
                    );
                  })}
                </HStack>
              </Flex>

              {deadlinesLoading ? (
                <Center py={6}>
                  <Spinner size="sm" color={GOLD} />
                </Center>
              ) : !filteredDeadlines.length ? (
                <Text
                  fontSize="13px"
                  color={TEXT_TERTIARY}
                  py={6}
                  px={5}
                  textAlign="center"
                >
                  {deadlineFilter === 'delivery_all'
                    ? 'Nenhum pedido marcado como entrega.'
                    : deadlineFilter === 'delivery_released'
                      ? 'Nenhuma entrega liberada para transporte.'
                      : deadlineFilter === 'shop_released'
                        ? 'Nenhuma retirada na loja liberada.'
                        : 'Nenhum pedido com prazo cadastrado.'}
                </Text>
              ) : (
                <Box maxH="520px" overflowY="auto" py={1}>
                  {filteredDeadlines.map((d, idx) => {
                    const isLast = idx === filteredDeadlines.length - 1;
                    const isDelivery = d.deliveryType === 'Entrega';
                    const isReleased =
                      d.orderStatus === 'Liberado para Transporte';
                    const advanceLabel = isReleased ? 'Concluir' : 'Liberar';
                    return (
                      <Flex
                        key={d.id}
                        align="center"
                        gap={3}
                        px={5}
                        py={2.5}
                        borderBottomWidth={isLast ? 0 : '1px'}
                        borderColor={BORDER}
                        transition="background 0.12s"
                        _hover={{ bg: SURFACE }}
                      >
                        <Text
                          fontFamily="mono"
                          fontSize="11px"
                          fontWeight="medium"
                          color={TEXT_TERTIARY}
                          w="48px"
                          flexShrink={0}
                        >
                          #{d.orderCode}
                        </Text>

                        <Box flex="1" minW={0}>
                          <HStack gap={2} align="center">
                            <Text
                              fontSize="13px"
                              fontWeight="semibold"
                              color={TEXT_PRIMARY}
                              lineClamp={1}
                            >
                              {d.customerName}
                            </Text>
                            {d.isUrgent && (
                              <Box
                                display="inline-flex"
                                alignItems="center"
                                gap="1"
                                fontSize="9.5px"
                                fontWeight="bold"
                                px="1.5"
                                py="0.5"
                                borderRadius="full"
                                letterSpacing="0.04em"
                                textTransform="uppercase"
                                bg="rgba(224,60,60,0.12)"
                                color={RED}
                                flexShrink={0}
                              >
                                <Icon
                                  as={FaExclamationTriangle}
                                  boxSize={2}
                                />
                                Urgente
                              </Box>
                            )}
                          </HStack>
                          <HStack
                            gap={3}
                            mt={0.5}
                            fontSize="11px"
                            color={TEXT_SECONDARY}
                            flexWrap="wrap"
                            rowGap={0.5}
                          >
                            {d.seller && (
                              <HStack gap={1} minW={0}>
                                <Icon
                                  as={FaUserTie}
                                  boxSize={2.5}
                                  color={TEXT_TERTIARY}
                                />
                                <Text lineClamp={1}>{d.seller}</Text>
                              </HStack>
                            )}
                            {d.customerTelephone && (
                              <HStack gap={1} minW={0}>
                                <Icon
                                  as={FaPhone}
                                  boxSize={2.5}
                                  color={TEXT_TERTIARY}
                                />
                                <Text lineClamp={1}>
                                  {d.customerTelephone}
                                </Text>
                              </HStack>
                            )}
                            {isDelivery && d.customerAddress && (
                              <HStack gap={1} minW={0}>
                                <Icon
                                  as={FaMapMarkerAlt}
                                  boxSize={2.5}
                                  color={TEXT_TERTIARY}
                                />
                                <Text lineClamp={1}>{d.customerAddress}</Text>
                              </HStack>
                            )}
                          </HStack>
                        </Box>

                        <HStack
                          gap={1}
                          flexShrink={0}
                          display={['none', 'none', 'flex']}
                        >
                          <Box
                            display="inline-flex"
                            alignItems="center"
                            fontSize="10px"
                            fontWeight="semibold"
                            px="1.5"
                            py="0.5"
                            borderRadius="full"
                            letterSpacing="0.02em"
                            bg={
                              isReleased
                                ? 'rgba(37,99,235,0.10)'
                                : 'rgba(245,184,32,0.14)'
                            }
                            color={isReleased ? BLUE : '#92700a'}
                          >
                            {isReleased ? 'Liberado' : 'Em produção'}
                          </Box>
                          <Box
                            display="inline-flex"
                            alignItems="center"
                            fontSize="10px"
                            fontWeight="semibold"
                            px="1.5"
                            py="0.5"
                            borderRadius="full"
                            letterSpacing="0.02em"
                            bg={SURFACE_2}
                            color={TEXT_SECONDARY}
                          >
                            {isDelivery ? 'Entrega' : 'Loja'}
                          </Box>
                        </HStack>

                        <Box
                          textAlign="right"
                          flexShrink={0}
                          minW="60px"
                        >
                          <Text
                            fontFamily="mono"
                            fontSize="12px"
                            fontWeight="semibold"
                            color={TEXT_PRIMARY}
                          >
                            {format(d.deliveryDate, 'dd/MM')}
                          </Text>
                          <Text fontSize="10px" color={TEXT_TERTIARY}>
                            {deliveryRelativeLabel(d.deliveryDate)}
                          </Text>
                        </Box>

                        <HStack gap={1} flexShrink={0}>
                          <Button
                            size="xs"
                            h="26px"
                            px="2.5"
                            fontSize="11px"
                            fontWeight="semibold"
                            bg={DARK}
                            color="white"
                            _hover={{ bg: DARK_2 }}
                            onClick={() =>
                              setConfirmingStatusOrder({
                                id: d.id,
                                orderCode: d.orderCode,
                                orderStatus: d.orderStatus,
                                customer: { name: d.customerName },
                              })
                            }
                          >
                            <Icon as={FaCheckCircle} boxSize={2.5} mr="1" />
                            {advanceLabel}
                          </Button>
                          <Button
                            size="xs"
                            h="26px"
                            px="2"
                            variant="ghost"
                            color={TEXT_SECONDARY}
                            _hover={{ bg: SURFACE_2, color: TEXT_PRIMARY }}
                            onClick={() =>
                              router.push(`/cortes/editar/${d.id}`)
                            }
                            aria-label="Editar pedido"
                          >
                            <Icon as={FaPen} boxSize={2.5} />
                          </Button>
                        </HStack>
                      </Flex>
                    );
                  })}
                </Box>
              )}
            </Box>
        </Stack>
      </Dashboard>
    </>
  );
};

interface QuickShortcutProps {
  icon: React.ElementType;
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'default';
}

const QuickShortcut: React.FC<QuickShortcutProps> = ({
  icon,
  children,
  onClick,
  variant = 'default',
}) => {
  const isPrimary = variant === 'primary';
  return (
    <Flex
      as="button"
      align="center"
      gap={1.5}
      px={2.5}
      h="32px"
      borderRadius="md"
      borderWidth="1px"
      borderColor={isPrimary ? 'transparent' : BORDER}
      bg={isPrimary ? DARK : 'white'}
      color={isPrimary ? 'white' : TEXT_SECONDARY}
      cursor="pointer"
      fontSize="12.5px"
      fontWeight="semibold"
      letterSpacing="-0.005em"
      transition="all 0.15s"
      _hover={{
        bg: isPrimary ? DARK_2 : SURFACE_2,
        color: isPrimary ? 'white' : TEXT_PRIMARY,
        borderColor: isPrimary ? 'transparent' : 'rgba(0,0,0,0.12)',
      }}
      onClick={onClick}
    >
      <Icon
        as={icon}
        boxSize={3}
        color={isPrimary ? GOLD : TEXT_TERTIARY}
      />
      <Box>{children}</Box>
    </Flex>
  );
};

export default Home;
