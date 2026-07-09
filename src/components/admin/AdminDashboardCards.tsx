import { SimpleGrid } from '@chakra-ui/react';
import React from 'react';

import { StatCard } from '@/components/ui/stat-card';
import { DashboardCounts } from '@/services/projects/dashboard.service';

interface AdminDashboardCardsProps {
  counts: DashboardCounts;
  pendingAssemblerPayments?: number;
}

function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export const AdminDashboardCards: React.FC<AdminDashboardCardsProps> = ({
  counts,
  pendingAssemblerPayments,
}) => {
  const cards: { label: string; value: string | number }[] = [
    { label: 'Projetos em aberto', value: counts.projetosEmAberto },
    { label: 'Itens atrasados', value: counts.atrasados },
    { label: 'Aguardando desenho', value: counts.aguardandoDesenho },
    { label: 'Aguardando orçamento', value: counts.aguardandoOrcamento },
    { label: 'Aguardando aprovação', value: counts.aguardandoAprovacao },
    { label: 'Aguardando montador', value: counts.aguardandoMontador },
    { label: 'Em produção', value: counts.emProducao },
    { label: 'Em montagem', value: counts.emMontagem },
    ...(pendingAssemblerPayments !== undefined
      ? [{ label: 'Montadores a pagar', value: pendingAssemblerPayments }]
      : []),
    { label: 'Vendido no mês', value: formatBRL(counts.totalVendidoNoMes) },
  ];

  return (
    <SimpleGrid columns={[2, 2, 3, 4]} gap={4}>
      {cards.map(card => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          palette={card.label === 'Itens atrasados' ? 'red' : 'brand'}
        />
      ))}
    </SimpleGrid>
  );
};
