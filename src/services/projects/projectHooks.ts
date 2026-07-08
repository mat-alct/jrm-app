import {
  useMutation,
  UseMutationResult,
  useQuery,
  useQueryClient,
  UseQueryResult,
} from '@tanstack/react-query';

import { Project, ProjectItem } from '@/types/projects';

import {
  CreateProjectInput,
  createProject,
  getProject,
  ListProjectsFilters,
  listProjects,
  UpdateProjectInput,
  updateProject,
} from './project.service';
import {
  CreateProjectItemInput,
  createProjectItem,
  listProjectItems,
  UpdateProjectItemInput,
  updateProjectItem,
} from './projectItem.service';

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

export function useCreateProject(): UseMutationResult<
  string,
  Error,
  { input: CreateProjectInput; createdBy: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, createdBy }) => createProject(input, createdBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject(
  projectId: string,
): UseMutationResult<void, Error, { updates: UpdateProjectInput; updatedBy: string }> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ updates, updatedBy }) =>
      updateProject(projectId, updates, updatedBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
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
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}
