import { render, screen } from '@testing-library/react';

import { FormInput } from '../../../components/Form/Input';

describe('Component: FormInput', () => {
  it('render the component', () => {
    render(<FormInput name="teste" />);
  });

  it('render the component with an error message', () => {
    render(
      <FormInput name="teste" error={{ type: 'error', message: 'Erro' }} />,
    );

    expect(screen.getByText('Erro')).toBeInTheDocument();
  });

  it('render the component with a label', () => {
    render(<FormInput name="teste" label="sinistro" />);

    expect(screen.getByText('sinistro')).toBeInTheDocument();
  });
});
