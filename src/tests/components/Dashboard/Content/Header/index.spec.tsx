import { render, screen } from '@testing-library/react';

import { Header } from '../../../../../components/Dashboard/Content/Header';

describe('Component: Header', () => {
  it('render the component', () => {
    render(<Header pageTitle="Página de testes" />);

    expect(screen.getByText('Página de testes')).toBeInTheDocument();
  });

  it('render spinner if loading is true', () => {
    render(<Header pageTitle="Página de testes" isLoading />);

    expect(screen.getByText(/loading\.\.\./i)).toBeInTheDocument();
  });
});
