import { Header } from '../../../../../components/Dashboard/Content/Header';
import { render, screen } from '../../../../testUtils';

describe('Component: Header', () => {
  it('render the component', () => {
    render(<Header pageTitle="Página de testes" />);

    expect(screen.getByText('Página de testes')).toBeInTheDocument();
  });

  it('render spinner if loading is true', () => {
    const { container } = render(
      <Header pageTitle="Página de testes" isLoading />,
    );

    expect(container.querySelector('.chakra-spinner')).toBeInTheDocument();
  });
});
