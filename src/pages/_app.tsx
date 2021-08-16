import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';

import initAuth from '../services/initAuth';
import { theme } from '../styles/theme';

initAuth();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}
export default MyApp;
