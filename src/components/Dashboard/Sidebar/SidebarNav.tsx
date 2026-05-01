import { Box, Flex, Image, Text } from '@chakra-ui/react';
import {
  FaBoxes,
  FaClipboardList,
  FaHome,
  FaPlusCircle,
  FaSignOutAlt,
  FaTruck,
  FaUserFriends,
} from 'react-icons/fa';

import { useAuth } from '../../../hooks/authContext';
import { NavLink } from './NavLink';
import { NavSection } from './NavSection';

export const SidebarNav: React.FC = () => {
  const { signOut } = useAuth();

  return (
    <Flex
      direction="column"
      h="100vh"
      w="16rem"
      bg="#2E2D2C"
      borderRightWidth="1px"
      borderColor="whiteAlpha.50"
      position={[null, null, null, 'fixed']}
      top="0"
      left="0"
      zIndex={100}
    >
      <Flex
        align="center"
        gap="3"
        px="5"
        py="4"
        borderBottomWidth="1px"
        borderColor="whiteAlpha.100"
        flexShrink={0}
      >
        <Flex
          align="center"
          justify="center"
          w="42px"
          h="42px"
          borderRadius="full"
          bg="white"
          flexShrink={0}
          overflow="hidden"
        >
          <Image
            src="/images/logo.svg"
            alt="JRM Compensados"
            w="100%"
            h="100%"
            objectFit="cover"
          />
        </Flex>
        <Flex direction="column" lineHeight="1.2" minW="0">
          <Text
            color="white"
            fontSize="sm"
            fontWeight="semibold"
            truncate
          >
            JRM Compensados
          </Text>
          <Text color="whiteAlpha.600" fontSize="xs" truncate>
            Administrador
          </Text>
        </Flex>
      </Flex>

      <Flex
        direction="column"
        flex="1"
        px="3"
        py="4"
        overflowY="auto"
        gap="0.5"
      >
        <NavSection title="Geral">
          <NavLink icon={FaHome} href="/">
            Início
          </NavLink>
        </NavSection>
        <NavSection title="Cortes">
          <NavLink icon={FaPlusCircle} href="/cortes/novoservico">
            Novo serviço
          </NavLink>
          <NavLink icon={FaClipboardList} href="/cortes/listadecortes">
            Listar serviços
          </NavLink>
          <NavLink icon={FaBoxes} href="/cortes/materiais">
            Materiais
          </NavLink>
        </NavSection>
        <NavSection title="Administração">
          <NavLink icon={FaUserFriends} href="/administracao/vendedores">
            Vendedores
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
        <Box flex="1" />
      </Flex>
    </Flex>
  );
};
