// import { useDisclosure, UseDisclosureReturn } from '@chakra-ui/react';
// import { useRouter } from 'next/router';
// import { createContext, ReactNode, useContext, useEffect } from 'react';

// type SidebarDrawerProviderProps = {
//   children: ReactNode;
// };

// type SidebarDrawerContextData = UseDisclosureReturn;

// const SidebarDrawerContext = createContext({} as SidebarDrawerContextData);

// export function SidebarDrawerProvider({
//   children,
// }: SidebarDrawerProviderProps) {
//   const disclosure = useDisclosure();
//   const router = useRouter();

//   useEffect(() => {
//     disclosure.onClose();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [router.asPath]);

//   return (
//     <SidebarDrawerContext.Provider value={disclosure}>
//       {children}
//     </SidebarDrawerContext.Provider>
//   );
// }

// export const useSidebarDrawer = () => useContext(SidebarDrawerContext);

"use client"

import { Drawer } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { createContext, ReactNode, useContext, useEffect } from 'react';

// 1. Definimos um tipo mais simples para o nosso contexto.
// Ele terá a mesma "cara" do que o useDisclosure retornava.
type SidebarDrawerContextData = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
};

type SidebarDrawerProviderProps = {
  children: ReactNode;
};

const SidebarDrawerContext = createContext({} as SidebarDrawerContextData);

export function SidebarDrawerProvider({ children }: SidebarDrawerProviderProps) {
  const router = useRouter();

  // 2. O Drawer.Root agora gerencia o estado internamente.
  return (
    <Drawer.Root>
      {/* 3. O Drawer.Context nos dá acesso ao estado interno via 'store'. */}
      <Drawer.Context>
        {(store) => {

          // 4. O useEffect agora usa o 'store' para fechar o menu.
          useEffect(() => {
            store.setOpen(false);
          }, [router.asPath, store]);

          // 5. Criamos um objeto com a mesma API do 'useDisclosure' antigo.
          const disclosureAdapter = {
            isOpen: store.open,
            onOpen: () => store.setOpen(true),
            onClose: () => store.setOpen(false),
            onToggle: () => store.setOpen(!store.open),
          };

          // 6. Fornecemos nosso objeto adaptado para o restante do app.
          return (
            <SidebarDrawerContext.Provider value={disclosureAdapter}>
              {children}
            </SidebarDrawerContext.Provider>
          );
        }}
      </Drawer.Context>
    </Drawer.Root>
  );
}

// Este hook continua funcionando exatamente da mesma forma!
export const useSidebarDrawer = () => useContext(SidebarDrawerContext);