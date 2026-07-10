import { ProjectSummaryCards } from '@/components/projects/ProjectSummaryCards';
import { ProjectItemSummary } from '@/types/projects';

import { render, screen } from '../../testUtils';

const summary: ProjectItemSummary = {
  total: 7,
  aguardandoAprovacao: 1,
  aprovados: 2,
  emProducao: 3,
  emMontagem: 4,
  finalizados: 5,
  atrasados: 6,
};

describe('ProjectSummaryCards', () => {
  it('mostra um card por metrica, com o rotulo certo', () => {
    render(<ProjectSummaryCards summary={summary} />);

    for (const label of [
      'Itens',
      'Aguardando aprovação',
      'Aprovados',
      'Em produção',
      'Em montagem',
      'Finalizados',
      'Atrasados',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('associa cada valor ao seu rotulo', () => {
    render(<ProjectSummaryCards summary={summary} />);

    const pairs: Array<[string, string]> = [
      ['Itens', '7'],
      ['Aguardando aprovação', '1'],
      ['Aprovados', '2'],
      ['Em produção', '3'],
      ['Em montagem', '4'],
      ['Finalizados', '5'],
      ['Atrasados', '6'],
    ];

    for (const [label, value] of pairs) {
      const card = screen.getByText(label).parentElement as HTMLElement;
      expect(card).toHaveTextContent(value);
    }
  });

  it('mostra zeros para um projeto recem-criado', () => {
    const zeros: ProjectItemSummary = {
      total: 0,
      aguardandoAprovacao: 0,
      aprovados: 0,
      emProducao: 0,
      emMontagem: 0,
      finalizados: 0,
      atrasados: 0,
    };

    render(<ProjectSummaryCards summary={zeros} />);

    expect(screen.getAllByText('0')).toHaveLength(7);
  });
});
