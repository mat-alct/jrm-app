import {
  Box,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  useBreakpointValue,
} from '@chakra-ui/react';
import React from 'react';

import { useSidebarDrawer } from '../../../hooks/sidebar';
import { SidebarNav } from './SidebarNav';

export const Sidebar = () => {
  const { isOpen, onClose } = useSidebarDrawer();

  const isDrawerSidebar = useBreakpointValue([true, true, true, false]);

  if (isDrawerSidebar) {
    return (
      <Drawer.Root isOpen={isOpen} placement="start" onClose={onClose}>
        <DrawerOverlay>
          <DrawerContent p="4">
            <DrawerCloseButton mt="6" />
            <DrawerHeader>Navegação</DrawerHeader>
            <DrawerBody mb={4}>
              <SidebarNav />
            </DrawerBody>
          </DrawerContent>
        </DrawerOverlay>
      </Drawer.Root>
    );
  }

  return (
    <Box as="aside">
      <SidebarNav />
    </Box>
  );
};
