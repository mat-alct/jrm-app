import 'firebase/firestore';
import '../styles/reactPrintStyles.css';

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
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Component {...pageProps} />

          <ReactQueryDevtools />
        </AuthProvider>
      </QueryClientProvider>
    </ChakraProvider>
  );
}
export default MyApp;
