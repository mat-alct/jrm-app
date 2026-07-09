import { Box, Flex, FlexProps } from '@chakra-ui/react';
import React from 'react';

export interface StatusPillProps extends Omit<FlexProps, 'children'> {
  palette: string;
  label: string;
}

export const StatusPill: React.FC<StatusPillProps> = ({
  palette,
  label,
  ...rest
}) => (
  <Flex
    as="span"
    display="inline-flex"
    align="center"
    gap="1.5"
    colorPalette={palette}
    bg="colorPalette.100"
    color="colorPalette.700"
    rounded="full"
    px="2.5"
    py="0.5"
    fontSize="xs"
    fontWeight="500"
    w="fit-content"
    {...rest}
  >
    <Box as="span" w="6px" h="6px" rounded="full" bg="colorPalette.500" flexShrink={0} />
    {label}
  </Flex>
);
