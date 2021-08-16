import { Flex, Image, VStack } from '@chakra-ui/react';
import {
  FaClipboardList,
  FaRegPlusSquare,
  FaRegSquare,
  FaSlack,
  FaSlackHash,
  FaUser,
  FaUserPlus,
} from 'react-icons/fa';

import { NavLink } from './NavLink';
import { NavSection } from './NavSection';

export const Sidebar = () => {
  return (
    <Flex
      direction="column"
      maxW="17rem"
      minH="100vh"
      h="100%"
      w="100%"
      align="flex-start"
    >
      <Image
        src="/images/logo.svg"
        alt="Logotipo"
        boxSize="120px"
        mx="auto"
        mb={12}
        mt={8}
      />
      <VStack spacing={12} ml={8}>
        <NavSection title="Cortes">
          <NavLink icon={FaSlack} href="/novoservico">
            Novo serviço
          </NavLink>
          <NavLink icon={FaSlackHash} href="/novoservico">
            Novo cortecloud
          </NavLink>
          <NavLink icon={FaClipboardList} href="/novoservico">
            Listar cortes
          </NavLink>
        </NavSection>
        <NavSection title="Clientes">
          <NavLink icon={FaUserPlus} href="/novoservico">
            Novo cliente
          </NavLink>
          <NavLink icon={FaUser} href="/novoservico">
            Listar clientes
          </NavLink>
        </NavSection>
        <NavSection title="Materiais">
          <NavLink icon={FaRegPlusSquare} href="/novoservico">
            Novo material
          </NavLink>
          <NavLink icon={FaRegSquare} href="/novoservico">
            Listar materiais
          </NavLink>
        </NavSection>
      </VStack>
    </Flex>
  );
};
