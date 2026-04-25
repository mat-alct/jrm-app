"use client";

import { useRouter } from 'next/router';
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

type SidebarDrawerContextData = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
};

const SidebarDrawerContext = createContext({} as SidebarDrawerContextData);

export const useSidebarDrawer = () => useContext(SidebarDrawerContext);

type SidebarDrawerProviderProps = {
  children: ReactNode;
};

export function SidebarDrawerProvider({
  children,
}: SidebarDrawerProviderProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [router.asPath]);

  const value: SidebarDrawerContextData = {
    isOpen,
    onOpen: () => setIsOpen(true),
    onClose: () => setIsOpen(false),
    onToggle: () => setIsOpen(v => !v),
  };

  return (
    <SidebarDrawerContext.Provider value={value}>
      {children}
    </SidebarDrawerContext.Provider>
  );
}
