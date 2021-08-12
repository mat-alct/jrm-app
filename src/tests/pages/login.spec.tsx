/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import firebase from 'firebase/app';
import { mocked } from 'ts-jest/utils';

import Login from '../../pages/login';

const firebaseAuth = firebase.auth;

jest.mock('next/router', () => {
  return {
    useRouter: () => {
      return {
        push: jest.fn(),
      };
    },
  };
});

jest.mock('firebase/app', () => {
  return {
    auth: jest.fn(),
  };
});

let signInWithEmailAndPasswordFunction: jest.Mock;

describe('Page: Login', () => {
  beforeEach(() => {
    render(<Login />);

    // Clear Fields

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: '' },
    });

    fireEvent.change(screen.getByPlaceholderText(/senha/i), {
      target: { value: '' },
    });

    // Mock signInWithEmailAndPassword
    const authFirebaseMocked = mocked(firebaseAuth);

    signInWithEmailAndPasswordFunction = jest.fn((email, password) =>
      Promise.resolve({ email, password }),
    );

    authFirebaseMocked.mockReturnValueOnce({
      signInWithEmailAndPassword: signInWithEmailAndPasswordFunction,
    } as any);
  });

  // Render test
  it('render the page correctly', () => {
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  // Validation tests
  it('should display required error when value is invalid', async () => {
    fireEvent.submit(screen.getByRole('button', { name: /entrar/i }));

    expect(await waitFor(() => screen.findAllByRole('alert'))).toHaveLength(2);
    expect(signInWithEmailAndPasswordFunction).not.toBeCalled();
  });

  it('should display validation error if email is in wrong format', async () => {
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'johndoe' },
    });

    fireEvent.change(screen.getByPlaceholderText(/senha/i), {
      target: { value: 'password' },
    });

    await waitFor(() =>
      fireEvent.click(screen.getByRole('button', { name: /entrar/i })),
    );

    expect(await waitFor(() => screen.findAllByRole('alert'))).toHaveLength(1);

    expect(signInWithEmailAndPasswordFunction).not.toBeCalledWith(
      'johndoe',
      'password',
    );
  });

  // TODO should display validation error if password has less than 8 digits

  // Submit tests
  // TODO should return error if sign in fail

  // TODO should call login function if everything is ok
});
