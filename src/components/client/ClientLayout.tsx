import {
  Box,
  Button,
  Container,
  Flex,
  Image,
  Text,
  VStack,
} from '@chakra-ui/react';
import Head from 'next/head';
import React from 'react';
import { FaPhone } from 'react-icons/fa';

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
      <Box minH="100vh" bg="app.canvas" color="app.text">
        <Box
          as="header"
          bg="app.surface"
          borderBottom="1px solid"
          borderColor="app.border"
          shadow="sm"
        >
          <Container maxW="960px" py={4}>
            <Flex align="center" justify="space-between" gap={4}>
              <Image src="/images/cm.png" alt="JRM Compensados" maxW="170px" />
              {contactPhone ? (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  borderColor="app.borderStrong"
                  color="app.text"
                  rounded="lg"
                  _hover={{ bg: 'app.sunken' }}
                  _focusVisible={{ shadow: 'focus', outline: 'none' }}
                >
                  <a href={`tel:${contactPhone}`}>
                    <FaPhone />
                    {contactPhone}
                  </a>
                </Button>
              ) : (
                <Text color="app.textMuted" fontSize="sm" textAlign="right">
                  Atendimento JRM
                </Text>
              )}
            </Flex>
          </Container>
        </Box>
        <Container maxW="720px" py={{ base: 5, md: 8 }}>
          <VStack align="stretch" gap={5}>
            {children}
          </VStack>
        </Container>
        <Container maxW="720px" pb={6}>
          <Text fontSize="xs" color="app.textMuted" textAlign="center">
            JRM Compensados
          </Text>
        </Container>
      </Box>
    </>
  );
}
