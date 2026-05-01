import {
  Flex,
  HStack,
  IconButton,
  Spinner,
  Text,
  useBreakpointValue,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import React, { useEffect, useState } from 'react';
import { RiMenuLine } from 'react-icons/ri';

import { useSidebarDrawer } from '../../../../hooks/sidebar';

interface HeaderProps {
  pageTitle: string;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  children,
  isLoading,
}) => {
  const { onOpen } = useSidebarDrawer();
  const isWideVersion = useBreakpointValue([false, false, false, true]);

  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Flex
      as="header"
      bg="white"
      borderBottomWidth="1px"
      borderColor="blackAlpha.100"
      px={[5, 5, 9]}
      h="56px"
      align="center"
      justify="space-between"
      position="sticky"
      top="0"
      zIndex={50}
      mx={[-8, -8, -8, -16, -16]}
      mt={[-4, -4, -8, -8, -16]}
      mb={6}
    >
      <HStack gap="3.5">
        {!isWideVersion && (
          <IconButton
            aria-label="Open navigation"
            fontSize="20px"
            variant="outline"
            size="sm"
            onClick={onOpen}
          >
            <RiMenuLine />
          </IconButton>
        )}
        <Text
          fontSize="14.5px"
          fontWeight="semibold"
          color="gray.800"
          lineHeight="1"
        >
          {pageTitle}
        </Text>
        {isLoading && <Spinner size="sm" color="gray.500" />}
      </HStack>

      <HStack gap="3">
        <Text
          display={['none', 'none', 'block']}
          fontSize="12px"
          color="gray.500"
          fontWeight="normal"
          whiteSpace="nowrap"
          fontVariantNumeric="tabular-nums"
        >
          {now
            ? `${format(now, "EEEE, d 'de' MMM", { locale: ptBR })} · ${format(
                now,
                'HH:mm:ss',
              )}`
            : ''}
        </Text>

        {children && <HStack gap="2">{children}</HStack>}
      </HStack>
    </Flex>
  );
};
