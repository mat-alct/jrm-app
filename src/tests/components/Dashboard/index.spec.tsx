import { Dashboard } from '../../../components/Dashboard';
import { render } from '../../testUtils';

jest.mock('next/router', () => ({
  useRouter: () => ({
    asPath: '/',
    push: jest.fn(),
  }),
}));

describe('Component: Dashboard', () => {
  it('render the component', () => {
    render(<Dashboard>Teste de Dashboard</Dashboard>);
  });
});
