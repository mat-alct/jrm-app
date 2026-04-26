import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  Heading,
  Icon,
  IconButton,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';
import {
  FaArrowRight,
  FaCheckCircle,
  FaClipboardList,
  FaExclamationTriangle,
  FaFileInvoiceDollar,
  FaIndustry,
  FaMapMarkerAlt,
  FaPlus,
  FaShippingFast,
} from 'react-icons/fa';
import { RiMenuLine } from 'react-icons/ri';
import { useQuery } from '@tanstack/react-query';

import { Dashboard } from '../components/Dashboard';
import { Loader } from '../components/Loader';
import { useAuth } from '../hooks/authContext';
import { useSidebarDrawer } from '../hooks/sidebar';
import { db } from '../services/firebase';

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  href?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
  href,
  isLoading,
}) => {
  const router = useRouter();
  const isClickable = !!href;
  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="xl"
      shadow="sm"
      p={5}
      cursor={isClickable ? 'pointer' : 'default'}
      transition="all 0.2s"
      _hover={
        isClickable
          ? { shadow: 'md', transform: 'translateY(-2px)', borderColor: color }
          : undefined
      }
      onClick={() => href && router.push(href)}
    >
      <Flex justify="space-between" align="flex-start" gap={3}>
        <Box>
          <Text fontSize="xs" color="gray.500" textTransform="uppercase" fontWeight="bold">
            {label}
          </Text>
          {isLoading ? (
            <Spinner size="sm" color={color} mt={2} />
          ) : (
            <Text fontSize="3xl" fontWeight="black" color="gray.800" lineHeight="1.1" mt={1}>
              {value}
            </Text>
          )}
        </Box>
        <Flex
          w="44px"
          h="44px"
          align="center"
          justify="center"
          bg={`${color.split('.')[0]}.50`}
          color={color}
          borderRadius="lg"
          flexShrink={0}
        >
          <Icon as={icon} boxSize={5} />
        </Flex>
      </Flex>
    </Box>
  );
};

interface UpcomingCardProps {
  title: string;
  emptyText: string;
  isLoading?: boolean;
  items?: any[];
  onSeeAll: () => void;
  showAddress: boolean;
}

const formatAddress = (customer: any): string | null => {
  if (!customer) return null;
  const parts = [customer.address, customer.area].filter(Boolean);
  return parts.length ? parts.join(' — ') : null;
};

const UpcomingCard: React.FC<UpcomingCardProps> = ({
  title,
  emptyText,
  isLoading,
  items,
  onSeeAll,
  showAddress,
}) => (
  <Box
    bg="white"
    borderWidth="1px"
    borderColor="gray.200"
    borderRadius="xl"
    shadow="sm"
    p={5}
  >
    <Flex justify="space-between" align="center" mb={3}>
      <Heading size="sm" color="gray.700">
        {title}
      </Heading>
      <Button size="xs" variant="ghost" colorScheme="orange" onClick={onSeeAll}>
        Ver todos <FaArrowRight style={{ marginLeft: 4 }} />
      </Button>
    </Flex>

    {isLoading ? (
      <Center py={6}>
        <Spinner color="orange.500" />
      </Center>
    ) : !items?.length ? (
      <Text fontSize="sm" color="gray.500" py={4} textAlign="center">
        {emptyText}
      </Text>
    ) : (
      <Stack gap={2}>
        {items.map((order: any) => {
          const isUrgent = order.isUrgent;
          const date = format(
            new Date(order.deliveryDate.seconds * 1000),
            'dd/MM/yyyy',
          );
          const address = showAddress ? formatAddress(order.customer) : null;
          return (
            <Flex
              key={order.id}
              align={['flex-start', 'flex-start', 'center']}
              direction={['column', 'column', 'row']}
              justify="space-between"
              gap={[1, 1, 3]}
              p={3}
              borderRadius="md"
              bg={isUrgent ? 'red.50' : 'gray.50'}
              borderWidth="1px"
              borderColor={isUrgent ? 'red.200' : 'gray.100'}
            >
              <Box flex="1" minW={0} w="100%">
                <Flex align="center" gap={2}>
                  <Text fontSize="xs" color="gray.500" fontWeight="bold">
                    #{order.orderCode}
                  </Text>
                  {isUrgent && (
                    <Icon
                      as={FaExclamationTriangle}
                      color="red.500"
                      boxSize={3}
                    />
                  )}
                </Flex>
                <Text fontWeight="bold" color="gray.800" lineClamp={1}>
                  {order.customer?.name || 'Cliente Removido'}
                </Text>
                {address ? (
                  <Flex align="center" gap={1} mt={0.5}>
                    <Icon as={FaMapMarkerAlt} color="gray.400" boxSize={3} />
                    <Text
                      fontSize="xs"
                      color="gray.500"
                      lineClamp={1}
                    >
                      {address}
                    </Text>
                  </Flex>
                ) : (
                  <Text fontSize="xs" color="gray.500">
                    {order.orderStatus}
                    {order.deliveryType
                      ? ` · ${order.deliveryType}`
                      : ''}
                  </Text>
                )}
              </Box>
              <Box
                textAlign={['left', 'left', 'right']}
                flexShrink={0}
                w={['100%', '100%', 'auto']}
              >
                <Text fontSize="xs" color="gray.500">
                  Prazo
                </Text>
                <Text fontWeight="bold" color="gray.800">
                  {date}
                </Text>
              </Box>
            </Flex>
          );
        })}
      </Stack>
    )}
  </Box>
);

const Home = () => {
  const { user } = useAuth();
  const router = useRouter();
  const { onOpen: openSidebar } = useSidebarDrawer();

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

  // --- Próximos prazos / próximas entregas (em produção + liberados) ---
  // Uma única query para os dois cards: "prazos" mostra todos, "entregas" filtra
  // por deliveryType === 'Entrega'. Filtragem em memória (volume é pequeno).
  const { data: upcoming, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['home-next-deliveries'],
    enabled: !!user,
    queryFn: async () => {
      const ordersRef = collection(db, 'orders');
      const [emProducaoSnap, liberadoSnap] = await Promise.all([
        getDocs(
          query(
            ordersRef,
            where('orderStatus', '==', 'Em Produção'),
            orderBy('orderCode', 'desc'),
            limit(20),
          ),
        ),
        getDocs(
          query(
            ordersRef,
            where('orderStatus', '==', 'Liberado para Transporte'),
            orderBy('orderCode', 'desc'),
            limit(20),
          ),
        ),
      ]);

      const sortedByDeadline = [
        ...emProducaoSnap.docs.map(d => ({ ...d.data(), id: d.id }) as any),
        ...liberadoSnap.docs.map(d => ({ ...d.data(), id: d.id }) as any),
      ]
        .filter(o => o.deliveryDate?.seconds)
        .sort((a, b) => a.deliveryDate.seconds - b.deliveryDate.seconds);

      return {
        deadlines: sortedByDeadline.slice(0, 5),
        deliveries: sortedByDeadline
          .filter(o => o.deliveryType === 'Entrega')
          .slice(0, 5),
      };
    },
  });
  const nextDeadlines = upcoming?.deadlines;
  const nextDeliveries = upcoming?.deliveries;

  if (!user) return <Loader />;

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  return (
    <>
      <Head>
        <title>Início | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Stack gap={6}>
          {/* Saudação (faz papel de header) */}
          <Box
            bg="orange.500"
            color="white"
            borderRadius="xl"
            p={[5, 6]}
            shadow="sm"
          >
            <Flex justify="space-between" align="flex-start" gap={3}>
              <Box flex="1">
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  opacity={0.85}
                  textTransform="uppercase"
                >
                  {today}
                </Text>
                <Heading size={['md', 'lg']} mt={1}>
                  Bem-vindo de volta!
                </Heading>
                <Text mt={2} opacity={0.95} fontSize={['sm', 'md']}>
                  Aqui está um resumo rápido da operação.
                </Text>
              </Box>
              <IconButton
                aria-label="Abrir menu"
                onClick={openSidebar}
                variant="subtle"
                colorScheme="whiteAlpha"
                color="white"
                bg="whiteAlpha.300"
                _hover={{ bg: 'whiteAlpha.400' }}
                fontSize="22px"
                display={['inline-flex', 'inline-flex', 'inline-flex', 'none']}
              >
                <RiMenuLine />
              </IconButton>
            </Flex>
          </Box>

          {/* Cards de estatísticas */}
          <SimpleGrid columns={[2, 2, 4]} gap={4}>
            <StatCard
              label="Em Produção"
              value={stats?.emProducao ?? 0}
              icon={FaIndustry}
              color="orange.500"
              href="/cortes/listadecortes"
              isLoading={statsLoading}
            />
            <StatCard
              label="Liberados"
              value={stats?.liberado ?? 0}
              icon={FaShippingFast}
              color="blue.500"
              href="/cortes/listadecortes"
              isLoading={statsLoading}
            />
            <StatCard
              label="Concluídos"
              value={stats?.concluido ?? 0}
              icon={FaCheckCircle}
              color="green.500"
              href="/cortes/listadecortes"
              isLoading={statsLoading}
            />
            <StatCard
              label="Orçamentos"
              value={stats?.orcamentos ?? 0}
              icon={FaFileInvoiceDollar}
              color="purple.500"
              href="/cortes/listadecortes"
              isLoading={statsLoading}
            />
          </SimpleGrid>

          {/* Aviso de urgentes */}
          {!statsLoading && (stats?.urgentes ?? 0) > 0 && (
            <Box
              bg="red.50"
              borderLeftWidth="4px"
              borderColor="red.500"
              p={4}
              borderRadius="md"
              cursor="pointer"
              onClick={() => router.push('/cortes/listadecortes')}
              _hover={{ bg: 'red.100' }}
              transition="background 0.2s"
            >
              <Flex align="center" gap={3}>
                <Icon as={FaExclamationTriangle} color="red.500" boxSize={5} />
                <Box flex="1">
                  <Text fontWeight="bold" color="red.700">
                    {stats!.urgentes} pedido(s) urgente(s) em produção
                  </Text>
                  <Text fontSize="sm" color="red.600">
                    Confira a lista de cortes para priorizá-los.
                  </Text>
                </Box>
                <Icon as={FaArrowRight} color="red.500" />
              </Flex>
            </Box>
          )}

          {/* Coluna esquerda: prazos + entregas; Direita: atalhos */}
          <Grid templateColumns={['1fr', '1fr', '2fr 1fr']} gap={4}>
            <Stack gap={4}>
              <UpcomingCard
                title="Próximos prazos"
                emptyText="Nenhum pedido com prazo cadastrado."
                isLoading={deliveriesLoading}
                items={nextDeadlines}
                onSeeAll={() => router.push('/cortes/listadecortes')}
                showAddress={false}
              />
              <UpcomingCard
                title="Próximas entregas"
                emptyText="Nenhum pedido marcado como entrega."
                isLoading={deliveriesLoading}
                items={nextDeliveries}
                onSeeAll={() => router.push('/cortes/listadecortes')}
                showAddress
              />
            </Stack>

            {/* Atalhos */}
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="gray.200"
              borderRadius="xl"
              shadow="sm"
              p={5}
              alignSelf="flex-start"
            >
              <Heading size="sm" color="gray.700" mb={3}>
                Atalhos
              </Heading>
              <Stack gap={2}>
                <Button
                  colorScheme="orange"
                  size="md"
                  justifyContent="flex-start"
                  onClick={() => router.push('/cortes/novoservico')}
                >
                  <FaPlus /> Novo serviço
                </Button>
                <Button
                  variant="outline"
                  colorScheme="orange"
                  size="md"
                  justifyContent="flex-start"
                  onClick={() => router.push('/cortes/listadecortes')}
                >
                  <FaClipboardList /> Listar cortes
                </Button>
                <Button
                  variant="outline"
                  colorScheme="orange"
                  size="md"
                  justifyContent="flex-start"
                  onClick={() => router.push('/cortes/materiais')}
                >
                  <FaIndustry /> Materiais
                </Button>
              </Stack>
            </Box>
          </Grid>
        </Stack>
      </Dashboard>
    </>
  );
};

export default Home;
