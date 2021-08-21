import { Flex, Image, VStack } from '@chakra-ui/react';
import {
  FaClipboardList,
  FaHome,
  FaPen,
  FaRegSquare,
  FaSlack,
  FaUser,
} from 'react-icons/fa';

import { NavLink } from './NavLink';
import { NavSection } from './NavSection';

export const Sidebar = () => {
  return (
    <Flex
      direction="column"
      maxW="15rem"
      minH="100vh"
      h="100%"
      w="100%"
      align="flex-start"
      borderRight="1px solid"
      borderColor="gray.200"
    >
      <Image
        src="/images/logo.svg"
        alt="Logotipo"
        boxSize="120px"
        mx="auto"
        mb={12}
        mt={8}
      />
      <VStack spacing={12} ml={8} align="flex-start">
        <NavSection title=" Geral">
          <NavLink icon={FaHome} href="/">
            Início
          </NavLink>
        </NavSection>
        <NavSection title="Cortes">
          <NavLink icon={FaSlack} href="/cortes/novoservico">
            Novo serviço
          </NavLink>
          <NavLink icon={FaClipboardList} href="#">
            Listar serviços
          </NavLink>
          <NavLink icon={FaUser} href="#">
            Clientes
          </NavLink>
          <NavLink icon={FaRegSquare} href="#">
            Materiais
          </NavLink>
        </NavSection>
        <NavSection title="Administração">
          <NavLink icon={FaPen} href="#">
            Contas
          </NavLink>
        </NavSection>
      </VStack>
    </Flex>
  );
};
