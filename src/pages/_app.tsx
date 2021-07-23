import type { AppProps } from 'next/app';

import initAuth from '../services/initAuth';

initAuth();

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
export default MyApp;
