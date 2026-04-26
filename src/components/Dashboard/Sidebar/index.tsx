import { Box, useBreakpointValue } from '@chakra-ui/react';
import dynamic from 'next/dynamic';
import React from 'react';

import { SidebarNav } from './SidebarNav';

// Drawer (e suas dependências) só baixam em telas pequenas — desktop nunca paga.
const MobileSidebar = dynamic(
  () => import('./MobileSidebar').then(m => m.MobileSidebar),
  { ssr: false },
);

export const Sidebar = () => {
  const isDrawerSidebar = useBreakpointValue([true, true, true, false]);

  if (isDrawerSidebar) {
    return <MobileSidebar />;
  }

  return (
    <Box as="aside">
      <SidebarNav />
    </Box>
  );
};
