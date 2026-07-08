import {
  Box,
  Container,
  Flex,
  Image,
  Link,
  Text,
  VStack,
} from '@chakra-ui/react';
import Head from 'next/head';
import React from 'react';

interface ClientLayoutProps {
  children: React.ReactNode;
  title?: string;
  contactPhone?: string;
}

export function ClientLayout({
  children,
  title = 'Portal do Cliente | JRM Compensados',
  contactPhone,
}: ClientLayoutProps) {
  return (
    <>
      <Head>
        <title>{title}</title>
      </Head>
      <Box minH="100vh" bg="gray.50" color="gray.900">
        <Box as="header" bg="white" borderBottom="1px solid" borderColor="gray.100">
          <Container maxW="960px" py={4}>
            <Flex align="center" justify="space-between" gap={4}>
              <Image src="/images/cm.png" alt="JRM Compensados" maxW="170px" />
              {contactPhone ? (
                <Link
                  href={`tel:${contactPhone}`}
                  color="orange.500"
                  fontWeight="700"
                  whiteSpace="nowrap"
                >
                  {contactPhone}
                </Link>
              ) : (
                <Text color="gray.500" fontSize="sm" textAlign="right">
                  Atendimento JRM
                </Text>
              )}
            </Flex>
          </Container>
        </Box>
        <Container maxW="960px" py={{ base: 5, md: 8 }}>
          <VStack align="stretch" gap={5}>
            {children}
          </VStack>
        </Container>
      </Box>
    </>
  );
}
