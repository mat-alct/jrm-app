import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React, { ReactNode } from 'react';

import {
  createProject,
  getProject,
  listProjects,
  updateProject,
} from '@/services/projects/project.service';
import {
  useCreateProject,
  useProject,
  useProjectItem,
  useProjectItems,
  useProjects,
  useUpdateProject,
} from '@/services/projects/projectHooks';
import {
  getProjectItem,
  listProjectItems,
} from '@/services/projects/projectItem.service';
import { Project, ProjectItem } from '@/types/projects';

jest.mock('@/services/projects/project.service', () => ({
  listProjects: jest.fn(),
  getProject: jest.fn(),
  createProject: jest.fn(),
  updateProject: jest.fn(),
}));
jest.mock('@/services/projects/projectItem.service', () => ({
  listProjectItems: jest.fn(),
  getProjectItem: jest.fn(),
  createProjectItem: jest.fn(),
  updateProjectItem: jest.fn(),
}));
jest.mock('@/services/projects/status.service', () => ({
  listItemStatusHistory: jest.fn().mockResolvedValue([]),
}));

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  return { Wrapper, queryClient };
}

describe('useProjects', () => {
  beforeEach(() => jest.clearAllMocks());

  it('repassa os filtros ao service e guarda pela queryKey correspondente', async () => {
    const projects = [{ id: 'project-1' }] as Project[];
    jest.mocked(listProjects).mockResolvedValue(projects);
    const { Wrapper, queryClient } = makeWrapper();

    const filters = { sellerId: 'seller-1' };
    const { result } = renderHook(() => useProjects(filters), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(projects));
    expect(listProjects).toHaveBeenCalledWith(filters);
    expect(queryClient.getQueryState(['projects', filters])).toBeDefined();
  });
});

describe('useProject e useProjectItems', () => {
  beforeEach(() => jest.clearAllMocks());

  it('busca o projeto pelo id', async () => {
    const project = { id: 'project-1' } as Project;
    jest.mocked(getProject).mockResolvedValue(project);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useProject('project-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(project));
    expect(getProject).toHaveBeenCalledWith('project-1');
  });

  it('não busca sem projectId', () => {
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useProject(''), { wrapper: Wrapper });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getProject).not.toHaveBeenCalled();
  });

  it('busca os itens do projeto', async () => {
    const items = [{ id: 'item-1' }] as ProjectItem[];
    jest.mocked(listProjectItems).mockResolvedValue(items);
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useProjectItems('project-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.data).toEqual(items));
  });

  it('não busca o item sem projectId ou itemId', () => {
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(() => useProjectItem('project-1', ''), {
      wrapper: Wrapper,
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(getProjectItem).not.toHaveBeenCalled();
  });
});

describe('mutações de projeto', () => {
  beforeEach(() => jest.clearAllMocks());

  it('useCreateProject invalida a lista de projetos no sucesso', async () => {
    jest.mocked(createProject).mockResolvedValue('project-novo');
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: Wrapper,
    });

    const params = {
      input: { customerName: 'Cliente' },
      actor: { uid: 'user-1' },
    } as never;
    await expect(result.current.mutateAsync(params)).resolves.toBe(
      'project-novo',
    );

    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['projects'] }),
    );
  });

  it('useCreateProject não invalida quando o service falha', async () => {
    jest
      .mocked(createProject)
      .mockRejectedValue(new Error('permission-denied'));
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useCreateProject(), {
      wrapper: Wrapper,
    });

    await expect(result.current.mutateAsync({} as never)).rejects.toThrow(
      'permission-denied',
    );
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('useUpdateProject repassa projectId e invalida a lista', async () => {
    jest.mocked(updateProject).mockResolvedValue(undefined);
    const { Wrapper, queryClient } = makeWrapper();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateProject('project-1'), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({
      updates: { customerName: 'Novo Nome' },
      updatedBy: 'user-1',
    } as never);

    expect(updateProject).toHaveBeenCalledWith(
      'project-1',
      { customerName: 'Novo Nome' },
      'user-1',
    );
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['projects'] }),
    );
  });
});
