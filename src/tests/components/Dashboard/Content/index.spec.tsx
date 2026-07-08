import { Content } from '../../../../components/Dashboard/Content';
import { render, screen } from '../../../testUtils';

describe('Component: Content', () => {
  it('render the component', () => {
    render(<Content>Teste de Content</Content>);

    expect(screen.getByText('Teste de Content')).toBeInTheDocument();
  });
});
