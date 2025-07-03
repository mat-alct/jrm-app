import {
  Box,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerHeader,
  CloseButton,
  Portal,
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
      <Drawer.Root open={isOpen} placement="start" onOpenChange={e => {if (!e.open) {onClose()}}}>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Header>
                Navegação
              </Drawer.Header>
              <Drawer.Body>
                <SidebarNav />
              </Drawer.Body>
              <Drawer.CloseTrigger
              asChild
              position="absolute"
              top="3"
              right="4"
              >
            </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>

        {/* <DrawerOverlay>
          <DrawerContent p="4">
            <DrawerCloseButton mt="6" />
            <DrawerHeader>Navegação</DrawerHeader>
            <DrawerBody mb={4}>
              <SidebarNav />
            </DrawerBody>
          </DrawerContent>
        </DrawerOverlay> */}
      </Drawer.Root>
    );
  }

  return (
    <Box as="aside">
      <SidebarNav />
    </Box>
  );
};
