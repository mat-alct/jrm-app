import { render, screen } from '@testing-library/react';

import { Content } from '../../../../components/Dashboard/Content';

describe('Component: Content', () => {
  it('render the component', () => {
    render(<Content>Teste de Content</Content>);

    expect(screen.getByText('Teste de Content')).toBeInTheDocument();
  });
});
