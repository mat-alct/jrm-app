import { Box, Flex, Image, VStack } from '@chakra-ui/react';
import {
  FaClipboardList,
  FaHome,
  FaRegSquare,
  FaSignOutAlt,
  FaSlack,
  FaTruck,
  FaUserAstronaut,
} from 'react-icons/fa';

import { NavLink } from './NavLink';
import { NavSection } from './NavSection';

import { useAuth } from '../../../hooks/authContext';

export const SidebarNav: React.FC = () => {
  const { signOut } = useAuth();

  return (
    <Flex
      direction="column"
      h="100vh"
      align="flex-start"
      borderRight={['', '', '', '1px solid']}
      borderColor={['', '', '', 'gray.200']}
      w={['', '', '', '16rem']}
      position={[null, null, null, 'fixed']}
    >
      <Box bg="#2E2D2C" w="100%" pb={4} mb={4} flexShrink={0}>
        <Image
          src="/images/logo.svg"
          alt="Logotipo"
          w="170px"
          h="auto"
          mx="auto"
          display="block"
        />
      </Box>
      <VStack gap={6} ml={[4, 4, 4, 8]} align="flex-start">
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
          <NavLink icon={FaRegSquare} href="/cortes/materiais">
            Materiais
          </NavLink>
        </NavSection>
        <NavSection title="Administração">
          <NavLink icon={FaUserAstronaut} href="/administracao/vendedores">
            Novo vendedor
          </NavLink>
          <NavLink icon={FaTruck} href="/administracao/fretes">
            Fretes
          </NavLink>
        </NavSection>
        <NavSection title="Conta">
          <NavLink icon={FaSignOutAlt} href="/login" onClick={() => signOut()}>
            Sair
          </NavLink>
        </NavSection>
      </VStack>
    </Flex>
  );
};
