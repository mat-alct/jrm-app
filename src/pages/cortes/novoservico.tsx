import { HStack, RadioGroup } from '@chakra-ui/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useState } from 'react';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
import { Cutlist } from '../../components/NewOrder/Cutlist';
import { OrderData } from '../../components/NewOrder/OrderData';
import { Cutlist as CutlistType } from '../../types';
import {useAuth}from '../../hooks/authContext'

const NovoServiço = () => {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);


  // * Cutlist Data
  const [cutlist, setCutlist] = useState<CutlistType[]>([]);

  const { query } = router;

  const updateCutlist = useCallback(
    (cutlistData: CutlistType[], maintainOldValues = true) => {
      if (maintainOldValues) {
        setCutlist(prevValue => {
          localStorage.setItem(
            'app@jrmcompensados:cutlist',
            JSON.stringify([...prevValue, ...cutlistData]),
          );

          return [...prevValue, ...cutlistData];
        });
      } else {
        setCutlist([...cutlistData]);

        localStorage.setItem(
          'app@jrmcompensados:cutlist',
          JSON.stringify([...cutlistData]),
        );
      }
    },
    [],
  );

  useEffect(() => {
    // If exists a estimate query, use the cutlist in the query, set local storage and end useEffect function
    if (query.cutlist && typeof query.cutlist === 'string') {
      setCutlist(JSON.parse(query.cutlist));

      localStorage.setItem('app@jrmcompensados:cutlist', query.cutlist);

      return;
    }

    const cutlistFromStorage = localStorage.getItem(
      'app@jrmcompensados:cutlist',
    );

    if (cutlistFromStorage) {
      setCutlist(JSON.parse(cutlistFromStorage));
    }
  }, [query.cutlist]);

  // Change between "Serviço" e "Orçamento"
  const [orderType, setOrderType] = useState<string>('Serviço');

  const [estimateId] = useState<string | undefined>(() => {
    if (query.estimateId && typeof query.estimateId === 'string') {
      return query.estimateId;
    }

    return undefined;
  });

  // Exibe um loader enquantoa autenticação é verificada
  if (!user) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        <title>Novo Serviço | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header
          pageTitle={`Novo ${
            orderType === 'Orçamento' ? 'Orçamento' : 'Serviço'
          }`}
        >
          <RadioGroup.Root
            colorScheme="orange"
            value={orderType}
            onValueChange={(e) => {if (e.value) {setOrderType(e.value)}}}
          >
            <HStack gap={[4, 4, 8]}>
              <RadioGroup.Item value="Serviço">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Pedido</RadioGroup.ItemText>
              </RadioGroup.Item>
              <RadioGroup.Item value="Orçamento">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Orçamento</RadioGroup.ItemText>
              </RadioGroup.Item>
            </HStack>
          </RadioGroup.Root>
        </Header>

        {/* Plano de Corte */}
        <Cutlist cutlist={cutlist} updateCutlist={updateCutlist} />

        <OrderData
          orderType={orderType}
          cutlist={cutlist}
          estimateId={estimateId}
        />
      </Dashboard>
    </>
  );
};

export default NovoServiço;
