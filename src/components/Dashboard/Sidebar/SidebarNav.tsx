import { Flex, Image, VStack } from '@chakra-ui/react';
import firebase from 'firebase/app';
import {
  FaClipboardList,
  FaHome,
  FaPen,
  FaRegSquare,
  FaSignOutAlt,
  FaSlack,
  FaUser,
  FaUserAstronaut,
} from 'react-icons/fa';

import { NavLink } from './NavLink';
import { NavSection } from './NavSection';

export const SidebarNav: React.FC = () => {
  return (
    <Flex
      direction="column"
      minH="100vh"
      h="100%"
      align="flex-start"
      borderRight={['', '', '', '1px solid']}
      borderColor={['', '', '', 'gray.200']}
      w={['', '', '', '17rem']}
      position={[null, null, null, 'fixed']}
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
        <NavSection title="Conta">
          <NavLink
            icon={FaSignOutAlt}
            href="/login"
            onClick={() => firebase.auth().signOut()}
          >
            Sair
          </NavLink>
        </NavSection>
      </VStack>
    </Flex>
  );
};
