import { fireEvent, render, screen } from '@testing-library/react';

import Home from '../../pages/index';

jest.mock('firebase/app', () => {
  return {
    auth: () => {
      return {
        signOut: () => jest.fn(() => Promise.resolve()),
      };
    },
  };
});

describe('Page: Home', () => {
  it('render the page correctly', () => {
    render(<Home />);
  });

  it('Sign out if signOut button is clicked', () => {
    render(<Home />);

    const logOutButton = screen.getByText('Sair');

    fireEvent.click(logOutButton);
  });
});
