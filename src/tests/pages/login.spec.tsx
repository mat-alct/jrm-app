/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import firebase from 'firebase/app';
import { mocked } from 'ts-jest/utils';

import Login from '../../pages/login';
import {
  changeInputByPlaceholder,
  clickButtonByName,
} from '../../utils/testHelpers';

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
    changeInputByPlaceholder('email', '');
    changeInputByPlaceholder('senha', '');

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
    await clickButtonByName('entrar');

    expect(await waitFor(() => screen.findAllByRole('alert'))).toHaveLength(2);
    expect(
      await waitFor(() => screen.getByText('Email obrigatório')),
    ).toBeInTheDocument();
    expect(signInWithEmailAndPasswordFunction).not.toBeCalled();
  });

  it('should display validation error if email is in wrong format', async () => {
    changeInputByPlaceholder('email', 'johndoe');
    changeInputByPlaceholder('senha', 'password');

    await clickButtonByName('entrar');

    expect(await waitFor(() => screen.findAllByRole('alert'))).toHaveLength(1);

    expect(signInWithEmailAndPasswordFunction).not.toBeCalledWith(
      'johndoe',
      'password',
    );
  });

  it('should display validation error if password has less than 8 digits', async () => {
    changeInputByPlaceholder('email', 'johndoe@example.com');
    changeInputByPlaceholder('senha', '12345');

    await clickButtonByName('entrar');

    expect(await waitFor(() => screen.findAllByRole('alert'))).toHaveLength(1);
    expect(signInWithEmailAndPasswordFunction).not.toBeCalledWith(
      'johndoe@example.com',
      '12345',
    );
  });

  // Submit tests
  // TODO should return error if sign in fail

  // TODO should call login function if everything is ok
});
