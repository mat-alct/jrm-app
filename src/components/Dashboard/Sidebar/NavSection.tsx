import { Box, Stack, Text } from '@chakra-ui/react';
import React from 'react';

interface NavSectionProps {
  title: string;
  children: React.ReactNode;
}

export const NavSection: React.FC<NavSectionProps> = ({ title, children }) => {
  return (
    <Box w="100%">
      <Text
        fontSize="10px"
        fontWeight="semibold"
        letterSpacing="0.08em"
        textTransform="uppercase"
        color="whiteAlpha.400"
        px="3"
        pt="3.5"
        pb="1.5"
        whiteSpace="nowrap"
      >
        {title}
      </Text>
      <Stack gap="0.5" align="stretch">
        {children}
      </Stack>
    </Box>
  );
};
