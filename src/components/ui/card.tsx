import { Box, BoxProps, Flex, Text } from '@chakra-ui/react';
import React from 'react';

export interface AppCardProps extends Omit<BoxProps, 'title'> {
  interactive?: boolean;
  title?: React.ReactNode;
  action?: React.ReactNode;
}

export const AppCard: React.FC<AppCardProps> = ({
  interactive,
  title,
  action,
  children,
  ...rest
}) => (
  <Box
    bg="app.surface"
    borderWidth="1px"
    borderColor="app.border"
    rounded="xl"
    shadow="card"
    transition="transform 0.15s, box-shadow 0.15s, border-color 0.15s"
    {...(interactive
      ? {
          cursor: 'pointer',
          _hover: {
            transform: 'translateY(-2px)',
            shadow: 'cardHover',
            borderColor: 'brand.200',
          },
        }
      : {})}
    {...rest}
  >
    {title && (
      <Flex
        align="center"
        justify="space-between"
        px="5"
        py="4"
        borderBottomWidth="1px"
        borderColor="app.border"
      >
        <Text fontSize="sm" fontWeight="600" color="app.text">
          {title}
        </Text>
        {action}
      </Flex>
    )}
    <Box p="5">{children}</Box>
  </Box>
);
