"use client";

import { useRouter } from 'next/router';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onToggle = useCallback(() => setIsOpen(v => !v), []);

  const value = useMemo<SidebarDrawerContextData>(
    () => ({ isOpen, onOpen, onClose, onToggle }),
    [isOpen, onOpen, onClose, onToggle],
  );

  return (
    <SidebarDrawerContext.Provider value={value}>
      {children}
    </SidebarDrawerContext.Provider>
  );
}
