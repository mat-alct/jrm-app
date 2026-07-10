import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { ReactNode } from 'react';

import { SidebarDrawerProvider, useSidebarDrawer } from '@/hooks/sidebar';

const mockRouter = { asPath: '/' };

jest.mock('next/router', () => ({
  useRouter: () => mockRouter,
}));

function wrapper({ children }: { children: ReactNode }) {
  return <SidebarDrawerProvider>{children}</SidebarDrawerProvider>;
}

describe('SidebarDrawerProvider', () => {
  beforeEach(() => {
    mockRouter.asPath = '/';
  });

  it('comeca fechado', () => {
    const { result } = renderHook(() => useSidebarDrawer(), { wrapper });
    expect(result.current.isOpen).toBe(false);
  });

  it('onOpen abre, onClose fecha e onToggle alterna', () => {
    const { result } = renderHook(() => useSidebarDrawer(), { wrapper });

    act(() => result.current.onOpen());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.onToggle());
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.onToggle());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.onClose());
    expect(result.current.isOpen).toBe(false);
  });

  it('fecha sozinho quando a rota muda', () => {
    const { result, rerender } = renderHook(() => useSidebarDrawer(), { wrapper });

    act(() => result.current.onOpen());
    expect(result.current.isOpen).toBe(true);

    mockRouter.asPath = '/projetos';
    rerender();

    expect(result.current.isOpen).toBe(false);
  });

  it('compartilha o mesmo estado entre consumidores distintos', () => {
    function Toggler() {
      const { onToggle } = useSidebarDrawer();
      return <button type="button" onClick={onToggle}>alternar</button>;
    }
    function Display() {
      const { isOpen } = useSidebarDrawer();
      return <span>{isOpen ? 'aberto' : 'fechado'}</span>;
    }

    render(
      <SidebarDrawerProvider>
        <Toggler />
        <Display />
      </SidebarDrawerProvider>,
    );

    expect(screen.getByText('fechado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'alternar' }));
    expect(screen.getByText('aberto')).toBeInTheDocument();
  });
});
