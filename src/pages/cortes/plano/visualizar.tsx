import {
  Box,
  Button,
  Center,
  Heading,
  Spinner,
  Stack,
  Text,
} from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { CuttingPlanViewer } from '@/components/CuttingPlan';
import type { CuttingPlan } from '@/domain/cutting-plan';
import { readCuttingPlanForViewer } from '@/utils/cuttingPlanViewer';

const CuttingPlanViewerPage = () => {
  const router = useRouter();
  const [plan, setPlan] = useState<CuttingPlan | null>();

  useEffect(() => {
    if (!router.isReady) return;
    const planId =
      typeof router.query.plan === 'string' ? router.query.plan : '';
    setPlan(planId ? readCuttingPlanForViewer(planId) : null);
  }, [router.isReady, router.query.plan]);

  if (plan === undefined) {
    return (
      <Center minH="100vh" bg="gray.100">
        <Spinner size="xl" color="gray.700" />
      </Center>
    );
  }

  if (!plan) {
    return (
      <Center minH="100vh" bg="gray.100" px={5}>
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="gray.200"
          borderRadius="xl"
          p={8}
          maxW="520px"
          textAlign="center"
          shadow="sm"
        >
          <Stack gap={4} align="center">
            <Heading size="lg">Plano indisponível</Heading>
            <Text color="gray.600">
              Este link precisa ser aberto pelo pedido que gerou o plano. Volte
              à lista e use a ação “Visualizar plano”.
            </Text>
            <Button onClick={() => window.close()} colorScheme="gray">
              Fechar esta aba
            </Button>
          </Stack>
        </Box>
      </Center>
    );
  }

  return (
    <>
      <Head>
        <title>Plano de corte 2D | JRM Compensados</title>
      </Head>
      <CuttingPlanViewer plan={plan} />
    </>
  );
};

export default CuttingPlanViewerPage;
