import {
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  Heading,
  HStack,
  IconButton,
  List,
  ListItem,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { useForm } from 'react-hook-form';
import { FaCheck, FaPlus, FaTrash } from 'react-icons/fa';
import * as Yup from 'yup';

import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { FormInput } from '../../components/Form/Input';
import { FormSelect } from '../../components/Form/Select';

interface materialRequestProps {
  materialRequest: string;
  materialRequestStore: string;
}

const Transferencias: React.FC = () => {
  const materialRequestSchema = Yup.object().shape({
    materialRequest: Yup.string().required('Material obrigatório'),
    materialRequestStore: Yup.string().required('Loja obrigatória'),
  });

  const {
    register: materialRequestRegister,
    handleSubmit: materialRequestHandleSubmit,
    setError: materialRequestSetError,
    setValue: materialRequestSetValue,
    control: materialRequestControl,
    formState: { errors: materialRequestErrors },
  } = useForm<materialRequestProps>({
    resolver: yupResolver(materialRequestSchema),
    reValidateMode: 'onSubmit',
  });

  return (
    <Dashboard>
      <Header pageTitle="Transferência de Materiais" />
      <Flex direction="column">
        <Stack
          direction="row"
          spacing={8}
          as="form"
          noValidate
          align="flex-end"
          maxW="700px"
        >
          <Box minW="66%" w="100%">
            <FormInput
              name="materialRequest"
              error={materialRequestErrors.materialRequest}
              label="Precisamos de:"
              size="md"
            />
          </Box>

          <FormSelect
            control={materialRequestControl}
            options={[
              { value: 'Japuíba', label: 'Japuíba' },
              { value: 'Frade', label: 'Frade' },
            ]}
            name="materialRequestStore"
            label="Na loja do(a):"
            placeholder=""
          />
          <IconButton
            icon={<FaPlus />}
            type="submit"
            colorScheme="orange"
            aria-label="Adicionar"
          >
            Adicionar
          </IconButton>
        </Stack>
      </Flex>
      <Flex direction="row" mt={16} align="flex-start" h="100%">
        <VStack spacing={4} align="flex-start">
          <Heading mb={8} size="lg">
            Enviar da Japuíba para o Frade
          </Heading>

          <List spacing={4}>
            <ListItem>
              <HStack spacing={16}>
                <Text fontSize="20px" color="gray.900" fontWeight="700">
                  2 Fitas de Borda 35mm Brancas
                </Text>
                <HStack spacing={4}>
                  <Checkbox size="lg" colorScheme="orange" defaultIsChecked>
                    Separado
                  </Checkbox>
                  <IconButton
                    colorScheme="red"
                    size="sm"
                    aria-label="Remover"
                    icon={<FaTrash />}
                  />
                </HStack>
              </HStack>
            </ListItem>
            <ListItem>
              <HStack spacing={16}>
                <Text
                  fontSize="20px"
                  color="gray.300"
                  text-decoration="line-through"
                  fontWeight="700"
                >
                  2 Fitas de Borda 35mm Brancas
                </Text>
                <HStack spacing={4}>
                  <Checkbox size="lg" colorScheme="orange" defaultIsChecked>
                    Separado
                  </Checkbox>
                  <IconButton
                    colorScheme="red"
                    size="sm"
                    aria-label="Remover"
                    icon={<FaTrash />}
                  />
                </HStack>
              </HStack>
            </ListItem>
          </List>
        </VStack>
        <Divider h="500px" orientation="vertical" mx={16} color="red" />
        <VStack spacing={4} align="flex-start">
          <Heading mb={8} size="lg">
            Enviar do Frade para a Japuíba
          </Heading>

          <List spacing={4}>
            <ListItem>
              <HStack spacing={16}>
                <Text fontSize="20px" color="gray.900" fontWeight="700">
                  2 Fitas de Borda 35mm Brancas
                </Text>
                <HStack spacing={4}>
                  <Checkbox size="lg" colorScheme="orange" defaultIsChecked>
                    Separado
                  </Checkbox>
                  <IconButton
                    colorScheme="red"
                    size="sm"
                    aria-label="Remover"
                    icon={<FaTrash />}
                  />
                </HStack>
              </HStack>
            </ListItem>
            <ListItem>
              <HStack spacing={16}>
                <Text
                  fontSize="20px"
                  color="gray.300"
                  text-decoration="line-through"
                  fontWeight="700"
                >
                  2 Fitas de Borda 35mm Brancas
                </Text>
                <HStack spacing={4}>
                  <Checkbox size="lg" colorScheme="orange" defaultIsChecked>
                    Separado
                  </Checkbox>
                  <IconButton
                    colorScheme="red"
                    size="sm"
                    aria-label="Remover"
                    icon={<FaTrash />}
                  />
                </HStack>
              </HStack>
            </ListItem>
          </List>
        </VStack>
      </Flex>
    </Dashboard>
  );
};

export default Transferencias;
