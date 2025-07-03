import { Box, Stack, Text } from '@chakra-ui/react';
import React from 'react';

interface NavSectionProps {
  title: string;
  children: React.ReactNode;
}

export const NavSection: React.FC<NavSectionProps> = ({ title, children }) => {
  return (
    <Box>
      <Text fontWeight="bold" color="orange.900">
        {title}
      </Text>
      <Stack gap="4" mt="4" align="stretch">
        {children}
      </Stack>
    </Box>
  );
};
