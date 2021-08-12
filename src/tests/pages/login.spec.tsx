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
  it('render the page correctly', () => {
    render(<Login />);

    screen.logTestingPlaygroundURL();

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  // it('call login function after click on sign in button', () => {
  //   render(<Login />);

  //   const authFirebaseMocked = mocked(firebaseAuth);

  //   const signInWithEmailAndPasswordFunction = jest.fn();

  //   authFirebaseMocked.mockReturnValueOnce({
  //     signInWithEmailAndPassword: signInWithEmailAndPasswordFunction,
  //   } as any);

  //   screen.logTestingPlaygroundURL();

  //   expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
  //   expect(screen.getByPlaceholderText(/senha/i)).toBeInTheDocument();
  //   expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  // });

  it('should display required error when value is invalid', async () => {
    render(<Login />);

    const authFirebaseMocked = mocked(firebaseAuth);

    const signInWithEmailAndPasswordFunction = jest.fn();

    authFirebaseMocked.mockReturnValueOnce({
      signInWithEmailAndPassword: signInWithEmailAndPasswordFunction,
    } as any);

    fireEvent.submit(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findAllByRole('alert'));
    expect(signInWithEmailAndPasswordFunction).not.toBeCalled();
  });
});
