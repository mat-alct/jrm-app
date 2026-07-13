import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';

import { Project, ProjectItem, StatusHistory } from '@/types/projects';

import {
  createProject,
  CreateProjectActor,
  CreateProjectInput,
  getProject,
  listProjects,
  ListProjectsFilters,
  updateProject,
  UpdateProjectInput,
} from './project.service';
import {
  createProjectItem,
  CreateProjectItemInput,
  getProjectItem,
  listItemStatusHistory,
  listProjectItems,
  updateProjectItem,
  UpdateProjectItemInput,
} from './projectItem.service';
import { StatusActor, updateItemStatus } from './status.service';

export function useProjects(
  filters: ListProjectsFilters = {},
): UseQueryResult<Project[]> {
  return useQuery({
    queryKey: ['projects', filters],
    queryFn: () => listProjects(filters),
  });
}

export function useProject(projectId: string): UseQueryResult<Project | null> {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: () => getProject(projectId),
    enabled: !!projectId,
  });
}

export function useProjectItems(
  projectId: string,
): UseQueryResult<ProjectItem[]> {
  return useQuery({
    queryKey: ['projects', projectId, 'items'],
    queryFn: () => listProjectItems(projectId),
    enabled: !!projectId,
  });
}

export function useProjectItem(
  projectId: string,
  itemId: string,
): UseQueryResult<ProjectItem | null> {
  return useQuery({
    queryKey: ['projects', projectId, 'items', itemId],
    queryFn: () => getProjectItem(projectId, itemId),
    enabled: !!projectId && !!itemId,
  });
}

export function useItemStatusHistory(
  projectId: string,
  itemId: string,
): UseQueryResult<StatusHistory[]> {
  return useQuery({
    queryKey: ['projects', projectId, 'items', itemId, 'statusHistory'],
    queryFn: () => listItemStatusHistory(projectId, itemId),
    enabled: !!projectId && !!itemId,
  });
}

export function useCreateProject(): UseMutationResult<
  string,
  Error,
  { input: CreateProjectInput; actor: CreateProjectActor }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, actor }) => createProject(input, actor),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject(
  projectId: string,
): UseMutationResult<
  void,
  Error,
  { updates: UpdateProjectInput; updatedBy: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ updates, updatedBy }) =>
      updateProject(projectId, updates, updatedBy),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useCreateProjectItem(
  projectId: string,
): UseMutationResult<
  string,
  Error,
  { input: CreateProjectItemInput; createdBy: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, createdBy }) =>
      createProjectItem(projectId, input, createdBy),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items'],
      });
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}

export function useUpdateProjectItem(
  projectId: string,
): UseMutationResult<
  void,
  Error,
  { itemId: string; updates: UpdateProjectItemInput; updatedBy: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, updates, updatedBy }) =>
      updateProjectItem(projectId, itemId, updates, updatedBy),
    onSuccess: (_data, { itemId }) => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId],
      });
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}

export function useUpdateItemStatus(
  projectId: string,
  itemId: string,
): UseMutationResult<
  void,
  Error,
  { next: ProjectItem['status']; actor: StatusActor; note?: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ next, actor, note }) =>
      updateItemStatus(projectId, itemId, next, actor, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['projects', projectId, 'items', itemId, 'statusHistory'],
      });
      void queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}
