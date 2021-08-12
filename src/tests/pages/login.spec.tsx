/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen } from '@testing-library/react';
import firebase from 'firebase/app';
import { mocked } from 'ts-jest/utils';

import Login from '../../pages/login';

const firebaseAuth = firebase.auth;

jest.mock('firebase/app', () => {
  return {
    auth: jest.fn(),
  };
});

describe('Page: Login', () => {
  beforeEach(() => {
    render(<Login />);
  });

  // Render test
  it('render the page correctly', () => {
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  // Validation tests
  it('should display required error when value is invalid', async () => {
    const authFirebaseMocked = mocked(firebaseAuth);

    const signInWithEmailAndPasswordFunction = jest.fn();

    authFirebaseMocked.mockReturnValueOnce({
      signInWithEmailAndPassword: signInWithEmailAndPasswordFunction,
    } as any);

    fireEvent.submit(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findAllByRole('alert'));
    expect(signInWithEmailAndPasswordFunction).not.toBeCalled();
  });

  // TODO should display validation error if email is in wrong format

  // TODO should display validation error if password has less than 8 digits

  // Submit tests
  // TODO should return error if sign in fail

  // TODO should call login function if everything is ok
});
