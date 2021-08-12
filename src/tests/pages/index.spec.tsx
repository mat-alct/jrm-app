/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from '@testing-library/react';
import firebase from 'firebase/app';
import { mocked } from 'ts-jest/utils';

import Home from '../../pages/index';

const firebaseAuth = firebase.auth;

jest.mock('firebase/app', () => {
  return {
    auth: jest.fn(),
  };
});

describe('Page: Home', () => {
  it('render the page correctly', () => {
    render(<Home />);
  });

  it('Sign out if signOut button is clicked', async () => {
    render(<Home />);

    const mockedAuth = mocked(firebaseAuth);

    const signOutFunction = jest.fn(() => Promise.resolve());

    mockedAuth.mockReturnValueOnce({
      signOut: signOutFunction,
    } as any);

    const logOutButton = screen.getByText('Sair');

    fireEvent.click(logOutButton);

    expect(signOutFunction).toHaveBeenCalled();
  });
});
