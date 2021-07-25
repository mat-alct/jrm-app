import { ChakraProvider } from '@chakra-ui/react';
import type { AppProps } from 'next/app';

import initAuth from '../services/initAuth';

initAuth();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}
export default MyApp;
