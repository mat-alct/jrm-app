import { HStack, Radio, RadioGroup } from '@chakra-ui/react';
import React, { useState } from 'react';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';

const Cortes: React.FC = () => {
  const [ordersFilter, setOrdersFilter] = useState('Em produção');

  return (
    <Dashboard>
      <Header pageTitle="Lista de Cortes">
        <RadioGroup
          colorScheme="orange"
          size="lg"
          value={ordersFilter}
          onChange={setOrdersFilter}
        >
          <HStack spacing={4}>
            <Radio
              isChecked
              id="Em produção"
              name="Em produção"
              value="Em produção"
            >
              Em produção
            </Radio>
            <Radio
              id="Liberados para transporte"
              name="Liberados para transporte"
              value="Liberados para transporte"
            >
              Liberados para transporte
            </Radio>
            <Radio id="Concluídos" name="Concluídos" value="Concluídos">
              Concluídos
            </Radio>
            <Radio id="Orçamentos" name="Orçamentos" value="Orçamentos">
              Orçamentos
            </Radio>
          </HStack>
        </RadioGroup>
      </Header>
    </Dashboard>
  );
};

export default Cortes;
