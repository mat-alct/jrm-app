import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';

import { MaterialProvider, useMaterial } from '@/hooks/material';
import { OrderProvider, useOrder } from '@/hooks/order';
import * as materialsService from '@/services/materials.service';
import * as ordersService from '@/services/orders.service';
import { queryClient } from '@/services/queryClient';
import { toaster } from '@/components/ui/toaster';

jest.mock('@/services/orders.service');
jest.mock('@/services/materials.service');
jest.mock('@/services/queryClient', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
  },
}));
jest.mock('@/components/ui/toaster', () => ({
  toaster: {
    create: jest.fn(),
  },
}));

const mockedOrders = ordersService as jest.Mocked<typeof ordersService>;
const mockedMaterials = materialsService as jest.Mocked<typeof materialsService>;
const mockedInvalidate = queryClient.invalidateQueries as jest.Mock;
const mockedToast = toaster.create as jest.Mock;

function wrapperFor(provider: 'order' | 'material') {
  return function Wrapper({ children }: { children: ReactNode }) {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const content =
      provider === 'order' ? (
        <OrderProvider>{children}</OrderProvider>
      ) : (
        <MaterialProvider>{children}</MaterialProvider>
      );

    return <QueryClientProvider client={client}>{content}</QueryClientProvider>;
  };
}

describe('legacy hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('wraps order creation with service call, success toast and orders invalidation', async () => {
    mockedOrders.createOrder.mockResolvedValue(undefined);
    const { result } = renderHook(() => useOrder(), {
      wrapper: wrapperFor('order'),
    });

    await act(async () => {
      await result.current.createOrder({ customer: { name: 'Pedro' } } as any);
    });

    expect(mockedOrders.createOrder).toHaveBeenCalledWith({
      customer: { name: 'Pedro' },
    });
    expect(mockedInvalidate).toHaveBeenCalledWith({ queryKey: ['orders'] });
    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'success',
        description: 'Pedido criado com sucesso',
      }),
    );
  });

  it('shows an error toast and rethrows when order creation fails', async () => {
    mockedOrders.createOrder.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useOrder(), {
      wrapper: wrapperFor('order'),
    });

    await expect(
      act(async () => {
        await result.current.createOrder({ customer: { name: 'Pedro' } } as any);
      }),
    ).rejects.toThrow('boom');

    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          description: 'Erro ao criar pedido.',
        }),
      ),
    );
  });

  it('delegates order reads and invalidates only after a successful cutlist update', async () => {
    mockedOrders.getOrders.mockResolvedValue({
      data: [{ id: 'order-1' }] as any,
      totalCount: 1,
      lastDoc: null,
    });
    mockedOrders.updateOrderCutlist
      .mockResolvedValueOnce({ success: false, reason: 'invalid-password' })
      .mockResolvedValueOnce({
        success: true,
        editedBy: 'Vendedor',
        priceDifference: 10,
      });
    const { result } = renderHook(() => useOrder(), {
      wrapper: wrapperFor('order'),
    });

    await expect(result.current.getOrders('Concluído')).resolves.toMatchObject({
      totalCount: 1,
    });
    await expect(
      result.current.updateOrderCutlist('order-1', [], 'bad', true),
    ).resolves.toEqual({ success: false, reason: 'invalid-password' });
    expect(mockedInvalidate).not.toHaveBeenCalled();

    await expect(
      result.current.updateOrderCutlist('order-1', [], 'ok', true),
    ).resolves.toMatchObject({ success: true });
    expect(mockedInvalidate).toHaveBeenCalledWith({ queryKey: ['orders'] });
  });

  it('wraps material mutations with invalidation and exposes material queries', async () => {
    mockedMaterials.createMaterial.mockResolvedValue(undefined);
    mockedMaterials.getMaterials.mockResolvedValue([{ id: 'm1', name: 'MDF' } as any]);
    const { result } = renderHook(() => useMaterial(), {
      wrapper: wrapperFor('material'),
    });

    await act(async () => {
      await result.current.createMaterial({ name: 'MDF' } as any);
    });
    await waitFor(() =>
      expect(mockedInvalidate).toHaveBeenCalledWith({ queryKey: ['materials'] }),
    );
    await expect(result.current.getMaterials('MDF')).resolves.toEqual([
      expect.objectContaining({ id: 'm1' }),
    ]);
  });

  it('shows material mutation error toasts', async () => {
    mockedMaterials.updateMaterialPrice.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useMaterial(), {
      wrapper: wrapperFor('material'),
    });

    await expect(
      act(async () => {
        await result.current.updateMaterialPrice({ id: 'm1', newPrice: 10 });
      }),
    ).rejects.toThrow('boom');

    await waitFor(() =>
      expect(mockedToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          title: 'Erro ao atualizar preço',
        }),
      ),
    );
  });
});
