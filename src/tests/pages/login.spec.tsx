import { render } from '@testing-library/react';

// import { mocked } from 'ts-jest/utils';
import Login from '../../pages/login';

// jest.mock('next/router');

describe('Login page', () => {
  it('renders correctly', async () => {
    const { debug } = render(<Login />);

    debug();
  });
});
