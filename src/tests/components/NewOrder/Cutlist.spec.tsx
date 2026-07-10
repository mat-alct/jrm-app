import React from 'react';

import { Cutlist } from '@/components/NewOrder/Cutlist';
import { MaterialProvider } from '@/hooks/material';
import { getAllMaterials } from '@/services/materials.service';
import { Cutlist as CutlistType } from '@/types';
import { calculateCutlistPrice } from '@/utils/cutlist/calculatePrice';

import { fireEvent, render, screen, waitFor, within } from '../../testUtils';

// Services sao a unica fronteira mockada. `calculateCutlistPrice` roda de verdade:
// o preco mostrado ao usuario precisa bater com a funcao que cobra do cliente.
jest.mock('@/services/materials.service', () => ({
  getAllMaterials: jest.fn(),
  createMaterial: jest.fn(),
  updateMaterial: jest.fn(),
  deleteMaterial: jest.fn(),
  updateMaterialPrice: jest.fn(),
}));

jest.mock('@/hooks/useAreas', () => ({
  useAreas: () => ({ data: [{ name: 'Centro', freight: 30 }] }),
  findAreaFreight: (_areas: unknown, area?: string) => (area ? 30 : 0),
}));

const MATERIAL = {
  id: 'mat-1',
  name: 'MDF Branco 15mm',
  width: 1000,
  height: 1000,
  price: 100,
  materialType: 'MDF' as const,
};

function renderCutlist(
  cutlist: CutlistType[] = [],
  options: { orderType?: string; cuttingPlanPrice?: number } = {},
) {
  const updateCutlist = jest.fn();

  const utils = render(
    <MaterialProvider>
      <Cutlist
        cutlist={cutlist}
        updateCutlist={updateCutlist}
        selectedArea="Centro"
        deliveryType="Entrega"
        orderType={options.orderType ?? 'Pedido'}
        cuttingPlanPrice={options.cuttingPlanPrice}
      />
    </MaterialProvider>,
  );

  return { ...utils, updateCutlist };
}

/** Escolhe o material no react-select (inputId = materialId). */
async function chooseMaterial(label = MATERIAL.name) {
  const input = document.querySelector('#materialId') as HTMLInputElement;
  fireEvent.focus(input);
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  fireEvent.click(await screen.findByText(label));
}

function fillPiece({
  amount = '1',
  sideA = '1000',
  sideB = '2000',
}: { amount?: string; sideA?: string; sideB?: string } = {}) {
  fireEvent.change(document.getElementById('amount') as HTMLInputElement, {
    target: { value: amount },
  });
  fireEvent.change(document.getElementById('sideA') as HTMLInputElement, {
    target: { value: sideA },
  });
  fireEvent.change(document.getElementById('sideB') as HTMLInputElement, {
    target: { value: sideB },
  });
}

function existingPiece(overrides: Partial<CutlistType> = {}): CutlistType {
  return {
    id: 'cut-1',
    material: {
      materialId: MATERIAL.id,
      name: MATERIAL.name,
      width: MATERIAL.width,
      height: MATERIAL.height,
      price: MATERIAL.price,
    },
    amount: 1,
    sideA: 1000,
    sideB: 2000,
    borderA: 0,
    borderB: 0,
    price: 350,
    hasHingeHoles: false,
    hingeHolesQuantity: 0,
    hasDrawerSlot: false,
    hasRoundedCorners: false,
    ...overrides,
  } as CutlistType;
}

describe('NewOrder/Cutlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getAllMaterials).mockResolvedValue([MATERIAL] as never);
  });

  it('adiciona uma peca com o preco vindo do calculateCutlistPrice real', async () => {
    const { updateCutlist } = renderCutlist();

    await chooseMaterial();
    fillPiece({ amount: '2', sideA: '1000', sideB: '2000' });
    fireEvent.click(screen.getByRole('button', { name: /ADD/i }));

    await waitFor(() => expect(updateCutlist).toHaveBeenCalled());

    const [[pieces]] = updateCutlist.mock.calls;
    const expectedPrice = calculateCutlistPrice(
      { width: 1000, height: 1000, price: 100 },
      { amount: 2, sideA: 1000, sideB: 2000, borderA: 0, borderB: 0 },
      75,
    );

    expect(pieces).toHaveLength(1);
    expect(pieces[0]).toMatchObject({
      amount: 2,
      sideA: 1000,
      sideB: 2000,
      price: expectedPrice,
    });
    // 2 * ceil(2.000.000 * 100 * 1,75 / 1.000.000) = 700
    expect(expectedPrice).toBe(700);
  });

  it('mantém identificação e veio apenas dentro das opções auxiliares', async () => {
    const { updateCutlist } = renderCutlist();

    await chooseMaterial();
    fillPiece();

    expect(
      screen.queryByLabelText('Identificação da peça'),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sentido do veio')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Opções de Detalhe' }));
    fireEvent.change(screen.getByLabelText('Identificação da peça'), {
      target: { value: 'Porta esquerda' },
    });
    const grain = document.querySelector('#grainDirection') as HTMLInputElement;
    fireEvent.focus(grain);
    fireEvent.keyDown(grain, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByText('Horizontal (lado maior)'));

    expect(screen.queryByLabelText('Espessura (mm)')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Acabamento')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Cor / padrão')).not.toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ADD/i }));

    await waitFor(() => expect(updateCutlist).toHaveBeenCalled());
    expect(updateCutlist.mock.calls[0][0][0]).toMatchObject({
      description: 'Porta esquerda',
      grainDirection: 'along_length',
    });
    expect(updateCutlist.mock.calls[0][0][0]).not.toHaveProperty('thicknessMm');
    expect(updateCutlist.mock.calls[0][0][0]).not.toHaveProperty('canRotate');
  });

  it('bloqueia material sem espessura no nome ao adicionar peça ao plano', async () => {
    const malformed = { ...MATERIAL, name: 'MDF Branco' };
    jest.mocked(getAllMaterials).mockResolvedValue([malformed] as never);
    const { updateCutlist } = renderCutlist([], {
      orderType: 'Plano de corte',
    });

    await chooseMaterial(malformed.name);
    fillPiece();
    fireEvent.click(screen.getByRole('button', { name: /ADD/i }));

    expect(
      await screen.findByText(/precisa informar a espessura no nome/i),
    ).toBeInTheDocument();
    expect(updateCutlist).not.toHaveBeenCalled();
  });

  it('recalcula os precos da lista ao trocar a porcentagem', async () => {
    const { updateCutlist } = renderCutlist([existingPiece()]);
    await screen.findByText(MATERIAL.name);

    // O radio de porcentagem e rotulado por publico-alvo: 75=Balcao, 50=Marceneiro, 1=Custo.
    fireEvent.click(screen.getByText('Marceneiro'));

    await waitFor(() => expect(updateCutlist).toHaveBeenCalled());
    const [pieces, maintainOldValues] = updateCutlist.mock.calls.at(-1)!;

    // 2.000.000 * 100 * 1,50 / 1.000.000 = 300
    expect(pieces[0].price).toBe(300);
    expect(maintainOldValues).toBe(false);
  });

  it('exige quantidade par quando a peca tem rasgo de gaveta', async () => {
    const { updateCutlist } = renderCutlist();

    await chooseMaterial();
    fillPiece({ amount: '3' });
    fireEvent.click(screen.getByRole('button', { name: 'Opções de Detalhe' }));
    fireEvent.click(screen.getByRole('button', { name: /Rasgo/ }));
    fireEvent.click(screen.getByRole('button', { name: /ADD/i }));

    expect(
      await screen.findByText('Qtd deve ser par para rasgo'),
    ).toBeInTheDocument();
    expect(updateCutlist).not.toHaveBeenCalled();
  });

  it('valida as medidas minimas e maximas pelo schema', async () => {
    const { updateCutlist } = renderCutlist();

    await chooseMaterial();
    fillPiece({ sideA: '59' });
    fireEvent.click(screen.getByRole('button', { name: /ADD/i }));

    expect(await screen.findByText('Mín: 60mm')).toBeInTheDocument();
    expect(updateCutlist).not.toHaveBeenCalled();
  });

  it('exige material selecionado', async () => {
    const { updateCutlist } = renderCutlist();

    fillPiece();
    fireEvent.click(screen.getByRole('button', { name: /ADD/i }));

    expect(await screen.findByText('Material obrigatório')).toBeInTheDocument();
    expect(updateCutlist).not.toHaveBeenCalled();
  });

  it('lista as pecas existentes com material e preco', async () => {
    renderCutlist([existingPiece()]);

    expect(await screen.findByText(MATERIAL.name)).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText(/350/)).toBeInTheDocument();
  });

  it('remove a peca escolhida', async () => {
    const { updateCutlist } = renderCutlist([
      existingPiece(),
      existingPiece({ id: 'cut-2' }),
    ]);
    await screen.findAllByText(MATERIAL.name);

    const removeButtons = screen.getAllByRole('button', { name: 'Remover' });
    fireEvent.click(removeButtons[0]);

    await waitFor(() => expect(updateCutlist).toHaveBeenCalled());
    const [pieces] = updateCutlist.mock.calls.at(-1)!;
    expect(pieces.map((p: CutlistType) => p.id)).toEqual(['cut-2']);
  });

  it('mostra apenas o preço total do plano e oculta preços individuais', async () => {
    renderCutlist([existingPiece()], {
      orderType: 'Plano de corte',
      cuttingPlanPrice: 123.45,
    });

    expect(await screen.findByText(/123,45/)).toBeInTheDocument();
    expect(screen.queryByText('Balcão')).not.toBeInTheDocument();
    expect(screen.queryByText('Marceneiro')).not.toBeInTheDocument();
    expect(screen.queryByText('Custo')).not.toBeInTheDocument();

    const table = screen.getByRole('table');
    expect(within(table).queryByText('Preço')).not.toBeInTheDocument();
    expect(within(table).queryByText(/350/)).not.toBeInTheDocument();
  });
});
