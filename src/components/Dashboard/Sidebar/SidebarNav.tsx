import { Box, Flex, Image, Text } from '@chakra-ui/react';
import {
  FaBoxes,
  FaChartLine,
  FaClipboardList,
  FaClock,
  FaHammer,
  FaHome,
  FaMoneyBillWave,
  FaPencilRuler,
  FaPlusCircle,
  FaSignOutAlt,
  FaToolbox,
  FaTruck,
  FaUserCog,
  FaUserFriends,
} from 'react-icons/fa';

import { useAppUser } from '@/services/projects/users.service';
import {
  ROLE_LABELS,
  canAccessPage,
} from '@/utils/projects/permissions';

import { useAuth } from '../../../hooks/authContext';
import { NavLink } from './NavLink';
import { NavSection } from './NavSection';

export const SidebarNav: React.FC = () => {
  const { signOut } = useAuth();
  const { data: appUser } = useAppUser();
  const canAccess = (path: string) => canAccessPage(path, appUser?.roles);
  const roleDescription =
    appUser?.roles.map(role => ROLE_LABELS[role]).join(', ') ?? '';

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
            {roleDescription}
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
        {canAccess('/') && (
          <NavSection title="Geral">
            <NavLink icon={FaHome} href="/">
              Início
            </NavLink>
          </NavSection>
        )}
        {(canAccess('/cortes/novoservico') ||
          canAccess('/cortes/listadecortes') ||
          canAccess('/cortes/materiais')) && (
          <NavSection title="Cortes">
            {canAccess('/cortes/novoservico') && (
              <NavLink icon={FaPlusCircle} href="/cortes/novoservico">
                Novo serviço
              </NavLink>
            )}
            {canAccess('/cortes/listadecortes') && (
              <NavLink icon={FaClipboardList} href="/cortes/listadecortes">
                Listar serviços
              </NavLink>
            )}
            {canAccess('/cortes/materiais') && (
              <NavLink icon={FaBoxes} href="/cortes/materiais">
                Materiais
              </NavLink>
            )}
          </NavSection>
        )}
        {(canAccess('/projetos/novo') ||
          canAccess('/projetos') ||
          canAccess('/projetos/dashboard') ||
          canAccess('/desenhista')) && (
          <NavSection title="Projetos">
            {canAccess('/projetos/novo') && (
              <NavLink icon={FaHammer} href="/projetos/novo">
                Novo projeto
              </NavLink>
            )}
            {canAccess('/projetos') && (
              <NavLink icon={FaClipboardList} href="/projetos">
                Listar projetos
              </NavLink>
            )}
            {canAccess('/projetos/dashboard') && (
              <NavLink icon={FaChartLine} href="/projetos/dashboard">
                Dashboard
              </NavLink>
            )}
            {canAccess('/desenhista') && (
              <NavLink icon={FaPencilRuler} href="/desenhista">
                Minha fila
              </NavLink>
            )}
          </NavSection>
        )}
        {(canAccess('/montador') || canAccess('/montador/financeiro')) && (
          <NavSection title="Montador">
            {canAccess('/montador') && (
              <NavLink icon={FaToolbox} href="/montador">
                Meus itens
              </NavLink>
            )}
            {canAccess('/montador/financeiro') && (
              <NavLink icon={FaMoneyBillWave} href="/montador/financeiro">
                Financeiro
              </NavLink>
            )}
          </NavSection>
        )}
        {(canAccess('/administracao/vendedores') ||
          canAccess('/administracao/fretes') ||
          canAccess('/administracao/usuarios') ||
          canAccess('/administracao/configuracoes-prazos') ||
          canAccess('/administracao/financeiro-montadores')) && (
          <NavSection title="Administração">
            {canAccess('/administracao/vendedores') && (
              <NavLink icon={FaUserFriends} href="/administracao/vendedores">
                Vendedores
              </NavLink>
            )}
            {canAccess('/administracao/fretes') && (
              <NavLink icon={FaTruck} href="/administracao/fretes">
                Fretes
              </NavLink>
            )}
            {canAccess('/administracao/usuarios') && (
              <NavLink icon={FaUserCog} href="/administracao/usuarios">
                Usuários
              </NavLink>
            )}
            {canAccess('/administracao/configuracoes-prazos') && (
              <NavLink icon={FaClock} href="/administracao/configuracoes-prazos">
                Configurações de prazos
              </NavLink>
            )}
            {canAccess('/administracao/financeiro-montadores') && (
              <NavLink
                icon={FaMoneyBillWave}
                href="/administracao/financeiro-montadores"
              >
                Financeiro dos montadores
              </NavLink>
            )}
          </NavSection>
        )}
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
