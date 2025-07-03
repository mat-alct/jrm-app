import { Flex, Image, VStack } from '@chakra-ui/react';
import firebase from 'firebase/app';
import { BsArrowLeftRight } from 'react-icons/bs';
import {
  FaClipboardList,
  FaHome,
  FaRegSquare,
  FaSignOutAlt,
  FaSlack,
  FaUser,
  FaUserAstronaut,
} from 'react-icons/fa';

import { NavLink } from './NavLink';
import { NavSection } from './NavSection';

import { useAuth } from '../../../hooks/authContext'; // Importando o novo hook

export const SidebarNav: React.FC = () => {
  const {signOut} = useAuth();

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
        mb={8}
        mt={4}
      />
      <VStack gap={8} ml={[4, 4, 4, 8]} align="flex-start">
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
          <NavLink icon={FaUserAstronaut} href="/administracao/vendedores">
            Novo vendedor
          </NavLink>
          <NavLink icon={BsArrowLeftRight} href="/administracao/transferencias">
            Transferencias
          </NavLink>
        </NavSection>
        <NavSection title="Conta">
          <NavLink
            icon={FaSignOutAlt}
            href="/login"
            onClick={() => signOut()}
          >
            Sair
          </NavLink>
        </NavSection>
      </VStack>
    </Flex>
  );
};
