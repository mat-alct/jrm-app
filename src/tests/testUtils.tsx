import { ChakraProvider } from '@chakra-ui/react';
import { render, RenderOptions } from '@testing-library/react';
import React, { ReactElement } from 'react';

import { theme } from '../styles/theme';

const AllProviders = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider value={theme}>{children}</ChakraProvider>
);

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };
