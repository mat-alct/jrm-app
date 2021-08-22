import 'firebase/firestore';

import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';
import React from 'react';
import { QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';

import { AuthProvider } from '../hooks';
import initAuth from '../services/initAuth';
import { queryClient } from '../services/queryClient';
import { theme } from '../styles/theme';

initAuth();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ChakraProvider theme={theme}>
          <Component {...pageProps} />
        </ChakraProvider>

        <ReactQueryDevtools />
      </AuthProvider>
    </QueryClientProvider>
  );
}
export default MyApp;
