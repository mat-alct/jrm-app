// Arquivo: hooks/sidebar.tsx (ou onde seu provider está)

"use client";

import {
  Box,
  CloseButton,
  Drawer,
  Portal,
  useBreakpointValue,
} from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { createContext, ReactNode, useContext, useEffect } from 'react';
// Ajuste o caminho para o seu componente SidebarNav se necessário
import { SidebarNav } from '../components/Dashboard/Sidebar/SidebarNav';

// --- Contexto e Hook (sem alterações) ---
type SidebarDrawerContextData = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
};
const SidebarDrawerContext = createContext({} as SidebarDrawerContextData);
export const useSidebarDrawer = () => useContext(SidebarDrawerContext);


// --- O Provider que agora também renderiza a UI ---
type SidebarDrawerProviderProps = {
  children: ReactNode;
};

export function SidebarDrawerProvider({ children }: SidebarDrawerProviderProps) {
  const router = useRouter();
  const isDrawerSidebar = useBreakpointValue([true, true, true, false]);

  return (
    <Drawer.Root>
      <Drawer.Context>
        {(store) => {
          // Efeito para fechar ao navegar
          useEffect(() => {
            store.setOpen(false);
          }, [router.asPath]);

          // Adaptador que será fornecido ao resto do app via context
          const disclosureAdapter = {
            isOpen: store.open,
            onOpen: () => store.setOpen(true),
            onClose: () => store.setOpen(false),
            onToggle: () => store.setOpen(!store.open),
          };

          return (
            <SidebarDrawerContext.Provider value={disclosureAdapter}>
              {/* Box principal que envolve a sidebar e o conteúdo */}
              <Box>
                {/* 1. LÓGICA DE RENDERIZAÇÃO DA SIDEBAR ESTÁ AQUI DENTRO */}

                {/* Renderiza a Sidebar estática em telas grandes */}
                {!isDrawerSidebar && (
                  <Box as="aside" w="64" mr="8">
                    <SidebarNav />
                  </Box>
                )}

                {/* O Drawer só é renderizado em telas pequenas */}
                {isDrawerSidebar && (
                  <Portal>
                    <Drawer.Backdrop />
                    <Drawer.Positioner>
                      <Drawer.Content>
                        <Drawer.Header>
                          <Drawer.Title>Navegação</Drawer.Title>
                        </Drawer.Header>
                        <Drawer.Body>
                          <SidebarNav />
                        </Drawer.Body>
                        <Drawer.CloseTrigger asChild position="absolute" top="3" right="4">
                          <CloseButton />
                        </Drawer.CloseTrigger>
                      </Drawer.Content>
                    </Drawer.Positioner>
                  </Portal>
                )}

                {/* 2. O RESTO DA SUA APLICAÇÃO É RENDERIZADO AQUI */}
                {children}
              </Box>
            </SidebarDrawerContext.Provider>
          );
        }}
      </Drawer.Context>
    </Drawer.Root>
  );
}