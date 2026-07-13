import { Dashboard } from '../../../components/Dashboard';
import { act, render } from '../../testUtils';

jest.mock('next/router', () => ({
  useRouter: () => ({
    asPath: '/',
    push: jest.fn(),
  }),
}));

describe('Component: Dashboard', () => {
  it('render the component', async () => {
    render(<Dashboard>Teste de Dashboard</Dashboard>);
    await act(() => Promise.resolve());
  });
});
