import '../styles/reactPrintStyles.css';

import { ChakraProvider } from '@chakra-ui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { AppProps } from 'next/app';
import React from 'react';

import { AccessGate } from '@/components/auth/AccessGate';
import { Toaster } from '@/components/ui/toaster';

import { Providers } from '../hooks';
import { AuthProvider } from '../hooks/authContext';
import { queryClient } from '../services/queryClient';
import { theme } from '../styles/theme';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider value={theme}>
      <QueryClientProvider client={queryClient}>
        <Providers>
          <AuthProvider>
            <AccessGate>
              <Component {...pageProps} />
            </AccessGate>
          </AuthProvider>
        </Providers>
        <Toaster />
        <ReactQueryDevtools />
      </QueryClientProvider>
    </ChakraProvider>
  );
}
export default MyApp;
