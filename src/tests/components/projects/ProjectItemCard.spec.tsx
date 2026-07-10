import { Timestamp } from 'firebase/firestore';

import { ProjectItemCard } from '@/components/projects/ProjectItemCard';
import { ProjectItem } from '@/types/projects';

import { render, screen } from '../../testUtils';

function item(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: 'item-1',
    projectId: 'project-1',
    name: 'Cozinha planejada',
    environment: 'Cozinha',
    status: 'aguardando_desenho',
    ...overrides,
  } as ProjectItem;
}

function daysFromNow(days: number): Timestamp {
  return Timestamp.fromDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

describe('ProjectItemCard', () => {
  it('mostra nome, ambiente e status do item', () => {
    render(<ProjectItemCard projectId="project-1" item={item()} />);

    expect(screen.getByText('Cozinha planejada')).toBeInTheDocument();
    expect(screen.getByText('Cozinha')).toBeInTheDocument();
    expect(screen.getByText('Aguardando desenho')).toBeInTheDocument();
  });

  it('leva para a pagina do item', () => {
    render(<ProjectItemCard projectId="project-1" item={item()} />);

    expect(screen.getByRole('link')).toHaveAttribute(
      'href',
      '/projetos/project-1/itens/item-1',
    );
  });

  it('marca como atrasado quando o prazo ja passou e o item nao terminou', () => {
    render(
      <ProjectItemCard
        projectId="project-1"
        item={item({ deadlineCurrent: daysFromNow(-1) })}
      />,
    );

    expect(screen.getByText('Atrasado')).toBeInTheDocument();
  });

  it('nao marca atraso quando o prazo esta no futuro', () => {
    render(
      <ProjectItemCard
        projectId="project-1"
        item={item({ deadlineCurrent: daysFromNow(3) })}
      />,
    );

    expect(screen.queryByText('Atrasado')).not.toBeInTheDocument();
  });

  it('nao marca atraso quando nao ha prazo definido', () => {
    render(<ProjectItemCard projectId="project-1" item={item()} />);

    expect(screen.queryByText('Atrasado')).not.toBeInTheDocument();
  });

  it('nao marca atraso em item finalizado, mesmo com prazo vencido', () => {
    render(
      <ProjectItemCard
        projectId="project-1"
        item={item({ status: 'finalizado', deadlineCurrent: daysFromNow(-10) })}
      />,
    );

    expect(screen.queryByText('Atrasado')).not.toBeInTheDocument();
    expect(screen.getByText('Finalizado')).toBeInTheDocument();
  });
});
