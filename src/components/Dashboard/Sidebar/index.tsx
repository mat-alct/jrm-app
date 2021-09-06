import { Flex, Image, VStack } from '@chakra-ui/react';
import {
  FaClipboardList,
  FaHome,
  FaPen,
  FaRegSquare,
  FaSlack,
  FaUser,
  FaUserAstronaut,
} from 'react-icons/fa';

import { NavLink } from './NavLink';
import { NavSection } from './NavSection';

interface SidebarProps {
  sidebarWidth: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ sidebarWidth }) => {
  return (
    <Flex
      direction="column"
      w={sidebarWidth}
      minH="100vh"
      h="100%"
      align="flex-start"
      borderRight="1px solid"
      borderColor="gray.200"
      position="fixed"
    >
      <Image
        src="/images/logo.svg"
        alt="Logotipo"
        boxSize="160px"
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
          <NavLink icon={FaClipboardList} href="/cortes/listadecortes">
            Listar serviços
          </NavLink>
          <NavLink icon={FaUser} href="/cortes/clientes">
            Clientes
          </NavLink>
          <NavLink icon={FaRegSquare} href="/cortes/materiais">
            Materiais
          </NavLink>
        </NavSection>
        <NavSection title="Administração">
          <NavLink icon={FaPen} href="#">
            Contas
          </NavLink>
          <NavLink icon={FaUserAstronaut} href="/administracao/vendedores">
            Vendedores
          </NavLink>
        </NavSection>
      </VStack>
    </Flex>
  );
};
