import { ChakraProvider } from '@chakra-ui/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { AppProps } from 'next/app';
import React from 'react';
import { AuthProvider } from '../hooks/authContext';
import { queryClient } from '../services/queryClient';
import { theme } from '../styles/theme';
import '../styles/reactPrintStyles.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider value={theme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Component {...pageProps} />
        </AuthProvider>
        <ReactQueryDevtools />
      </QueryClientProvider>
    </ChakraProvider>
  );
}
export default MyApp;
