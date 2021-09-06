import {
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  List,
  ListItem,
  Switch,
  VStack,
} from '@chakra-ui/react';
import React from 'react';

import { FormDatePicker } from '../Form/DatePicker';
import { FormInput } from '../Form/Input';
import { FormRadio } from '../Form/Radio';
import { FormSelect } from '../Form/Select';
import { SearchBar } from '../SearchBar';

interface OrderDataProps {
  orderType: 'Serviço' | 'Orçamento';
}

export const OrderData: React.FC<OrderDataProps> = ({ orderType }) => {
  return (
    <>
      <HStack spacing={4} mt={8}>
        <Heading color="gray.600" size="lg" whiteSpace="nowrap">
          Dados do Pedido
        </Heading>
        <Divider />
      </HStack>

      <FormControl display="flex" alignItems="center" maxW="300px" mt={4}>
        <FormLabel htmlFor="customer-signup" mb="0" color="gray.700">
          Utilizar cliente com cadastro?
        </FormLabel>
        <Switch
          value="ok"
          id="customer-signup"
          colorScheme="orange"
          onChange={() => {
            setCustomerId('');

            setCustomerRegistered.toggle();
          }}
        />
      </FormControl>

      {customerRegistered && (
        <SearchBar mt={4} handleUpdateSearch={handleSearch} minW="400px" />
      )}

      {customerRegistered && searchedCustomers && (
        <List mt={8} spacing={4}>
          <HStack spacing={8}>
            {searchedCustomers?.map(customer => (
              <ListItem key={customer.id}>
                <Flex align="center">
                  <Flex direction="column">
                    <Text fontWeight="700">{`${customer.name}`}</Text>
                    <Text fontSize="sm">{`${
                      customer?.address || 'Rua não cadastrada'
                    }, ${customer?.area || 'Bairro não cadastrado'}`}</Text>
                    <Text fontSize="sm">{`Tel: ${
                      customer?.telephone || 'Telefone não cadastrado'
                    }`}</Text>
                    <Button
                      size="sm"
                      colorScheme={
                        customer.id === customerId ? 'green' : 'gray'
                      }
                      onClick={() => handleSetCustomerId(customer.id)}
                    >
                      {customer.id === customerId
                        ? 'Selecionado'
                        : 'Selecionar'}
                    </Button>
                  </Flex>
                </Flex>
              </ListItem>
            ))}
          </HStack>
        </List>
      )}

      <Flex
        as="form"
        direction="column"
        onSubmit={createOrderHandleSubmit(handleSubmitOrder)}
      >
        <Flex direction="column" align="left" mt={8}>
          <HStack spacing={8} align="flex-start">
            <FormInput
              {...createOrderRegister('firstName')}
              name="firstName"
              label="Nome"
              error={createOrderErrors.firstName}
              isReadOnly={Boolean(customerId)}
            />
            <FormInput
              {...createOrderRegister('lastName')}
              name="lastName"
              label="Sobrenome"
              error={createOrderErrors.lastName}
              isReadOnly={Boolean(customerId)}
            />
            <FormInput
              {...createOrderRegister('telephone')}
              error={createOrderErrors.telephone}
              name="telephone"
              label="Telefone"
              value={tel}
              onChange={e =>
                setTel((prevValue: string): string =>
                  normalizeTelephoneInput(e.target.value, prevValue),
                )
              }
              isReadOnly={Boolean(customerId)}
            />
          </HStack>

          {orderType === 'Serviço' && (
            <>
              <HStack spacing={8} mt={4} mb={4} align="flex-start">
                <FormInput
                  {...createOrderRegister('address')}
                  error={createOrderErrors.address}
                  name="address"
                  label="Endereço"
                  isReadOnly={Boolean(customerId)}
                />
                <FormSelect
                  options={areas.map(area => {
                    return { value: area, label: area };
                  })}
                  name="area"
                  control={createOrderControl}
                  label="Bairro"
                  isDisabled={Boolean(customerId)}
                  placeholder="Selecione o bairro..."
                />
                <FormSelect
                  options={[
                    { value: 'Angra dos Reis', label: 'Angra dos Reis' },
                    { value: 'Paraty', label: 'Paraty' },
                  ]}
                  name="city"
                  control={createOrderControl}
                  label="Cidade"
                  isDisabled={Boolean(customerId)}
                  placeholder="Selecione a cidade..."
                />
              </HStack>

              <VStack align="left" mt={4} spacing={8}>
                <FormRadio
                  options={['Japuíba', 'Frade']}
                  label="Loja do pedido:"
                  name="orderStore"
                  control={createOrderControl}
                  isHorizontal
                  isLabelHorizontal
                />

                <FormRadio
                  options={['Retirar na Loja', 'Entrega']}
                  label="Tipo de Entrega:"
                  name="deliveryType"
                  control={createOrderControl}
                  isHorizontal
                  isLabelHorizontal
                />

                <FormRadio
                  options={['Pago', 'Parcialmente Pago', 'Receber na Entrega']}
                  label="Pagamento:"
                  name="paymentType"
                  control={createOrderControl}
                  isHorizontal
                  isLabelHorizontal
                />

                <FormDatePicker
                  name="deliveryDate"
                  control={createOrderControl}
                />

                <FormInput
                  {...createOrderRegister('sellerPassword')}
                  error={createOrderErrors.sellerPassword}
                  name="sellerPassword"
                  label="Senha:"
                  type="password"
                  size="sm"
                  maxW="150px"
                  isHorizontal
                />

                <Flex direction="column">
                  <Text mb="8px" color="gray.700" fontWeight="bold">
                    Observações:
                  </Text>
                  <Textarea
                    {...createOrderRegister('ps')}
                    error={createOrderErrors.ps}
                    size="sm"
                  />
                </Flex>
              </VStack>
            </>
          )}
        </Flex>

        <Button
          colorScheme="orange"
          size="lg"
          isFullWidth
          my={16}
          type="submit"
          disabled={cutlist.length < 1}
        >
          Confirmar Pedido
        </Button>
      </Flex>
    </>
  );
};
