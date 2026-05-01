import { CloseButton, Drawer, Portal } from '@chakra-ui/react';
import React from 'react';

import { useSidebarDrawer } from '../../../hooks/sidebar';
import { SidebarNav } from './SidebarNav';

export const MobileSidebar: React.FC = () => {
  const { isOpen, onClose } = useSidebarDrawer();

  return (
    <Drawer.Root
      open={isOpen}
      placement="start"
      onOpenChange={e => {
        if (!e.open) onClose();
      }}
    >
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content
            bg="#2E2D2C"
            maxW="16rem"
            w="16rem"
            p="0"
          >
            <Drawer.Body p="0">
              <SidebarNav />
            </Drawer.Body>
            <Drawer.CloseTrigger
              asChild
              position="absolute"
              top="3"
              right="4"
            >
              <CloseButton color="whiteAlpha.700" />
            </Drawer.CloseTrigger>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  );
};

export default MobileSidebar;
