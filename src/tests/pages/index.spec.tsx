import { render } from '@testing-library/react';

import Home from '../../pages/index';

jest.mock('firebase/app', () => {
  return {
    auth: () => {
      return {
        signOut: () => jest.fn(),
      };
    },
  };
});

describe('Page: Home', () => {
  it('render the page correctly', () => {
    render(<Home />); //
  });
});
