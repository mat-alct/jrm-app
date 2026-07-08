import { ProjectItem } from '@/types/projects';

import { isFinalStatus } from './status';

export function isDelayed(
  item: Pick<ProjectItem, 'deadlineCurrent' | 'status'>,
  now: Date = new Date(),
): boolean {
  if (!item.deadlineCurrent) return false;
  if (isFinalStatus(item.status)) return false;

  return item.deadlineCurrent.toDate().getTime() < now.getTime();
}
