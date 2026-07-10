import { Timestamp } from 'firebase/firestore';

import { DelayedItemsTable } from '@/components/admin/DelayedItemsTable';
import { Project, ProjectItem } from '@/types/projects';

import { render, screen, within } from '../../testUtils';

const projectsById: Record<string, Project> = {
  'project-1': { id: 'project-1', customerName: 'Cliente Alpha' } as Project,
  'project-2': { id: 'project-2', customerName: 'Cliente Beta' } as Project,
};

function item(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: 'item-1',
    projectId: 'project-1',
    name: 'Cozinha planejada',
    status: 'aguardando_desenho',
    deadlineCurrent: Timestamp.fromDate(new Date('2026-01-10T12:00:00.000Z')),
    ...overrides,
  } as ProjectItem;
}

describe('DelayedItemsTable', () => {
  it('mostra o estado vazio quando nao ha itens atrasados', () => {
    render(<DelayedItemsTable items={[]} projectsById={projectsById} />);

    expect(screen.getByText('Nenhum item atrasado.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('mostra cliente, item, status e prazo de cada linha', () => {
    render(<DelayedItemsTable items={[item()]} projectsById={projectsById} />);

    const row = screen.getByRole('row', { name: /Cliente Alpha/ });
    expect(within(row).getByText('Cliente Alpha')).toBeInTheDocument();
    expect(within(row).getByText('Cozinha planejada')).toBeInTheDocument();
    expect(within(row).getByText('Aguardando desenho')).toBeInTheDocument();
    expect(within(row).getByText('10/01/2026')).toBeInTheDocument();
  });

  it('linka o cliente para a pagina do item', () => {
    render(<DelayedItemsTable items={[item()]} projectsById={projectsById} />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/projetos/project-1/itens/item-1',
    );
  });

  it('renderiza uma linha por item, de projetos diferentes', () => {
    render(
      <DelayedItemsTable
        items={[
          item(),
          item({ id: 'item-2', projectId: 'project-2', name: 'Armario' }),
        ]}
        projectsById={projectsById}
      />,
    );

    expect(screen.getByText('Cliente Alpha')).toBeInTheDocument();
    expect(screen.getByText('Cliente Beta')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3); // cabecalho + 2 itens
  });

  it('usa travessao quando o projeto nao esta no mapa', () => {
    render(
      <DelayedItemsTable
        items={[item({ projectId: 'projeto-sumido' })]}
        projectsById={projectsById}
      />,
    );

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('usa travessao quando o item nao tem prazo', () => {
    render(
      <DelayedItemsTable
        items={[item({ deadlineCurrent: undefined })]}
        projectsById={projectsById}
      />,
    );

    const row = screen.getByRole('row', { name: /Cliente Alpha/ });
    expect(within(row).getByText('—')).toBeInTheDocument();
  });
});
