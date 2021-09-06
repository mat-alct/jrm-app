import { HStack, Radio, RadioGroup } from '@chakra-ui/react';
import Head from 'next/head';
import React, { useCallback, useEffect, useState } from 'react';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Cutlist } from '../../components/NewOrder/Cutlist';
import { OrderData } from '../../components/NewOrder/OrderData';
import { Cutlist as CutlistType } from '../../types';

const NovoServiço = () => {
  // * Cutlist Data
  const [cutlist, setCutlist] = useState<CutlistType[]>([]);

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
    const cutlistFromStorage = localStorage.getItem(
      'app@jrmcompensados:cutlist',
    );

    if (cutlistFromStorage) {
      setCutlist(JSON.parse(cutlistFromStorage));
    }
  }, []);

  // Change between "Serviço" e "Orçamento"
  const [orderType, setOrderType] = useState<string>('Serviço');

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
          <RadioGroup
            colorScheme="orange"
            size="lg"
            value={orderType}
            onChange={setOrderType}
          >
            <HStack spacing={8}>
              <Radio isChecked id="isOrder" name="isOrder" value="Serviço">
                Pedido
              </Radio>
              <Radio id="isEstimate" name="isEstimate" value="Orçamento">
                Orçamento
              </Radio>
            </HStack>
          </RadioGroup>
        </Header>

        {/* Plano de Corte */}
        <Cutlist cutlist={cutlist} updateCutlist={updateCutlist} />

        <OrderData orderType={orderType} cutlist={cutlist} />
      </Dashboard>
    </>
  );
};

export default NovoServiço;
