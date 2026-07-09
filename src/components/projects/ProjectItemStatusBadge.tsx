import React from 'react';

import { StatusPill, StatusPillProps } from '@/components/ui/status-pill';
import { ProjectItemStatus } from '@/types/projects';
import {
  INTERNAL_STATUS_COLORS,
  INTERNAL_STATUS_LABELS,
} from '@/utils/projects/status';

interface ProjectItemStatusBadgeProps
  extends Omit<StatusPillProps, 'palette' | 'label'> {
  status: ProjectItemStatus;
}

export const ProjectItemStatusBadge: React.FC<ProjectItemStatusBadgeProps> = ({
  status,
  ...rest
}) => (
  <StatusPill
    palette={INTERNAL_STATUS_COLORS[status]}
    label={INTERNAL_STATUS_LABELS[status]}
    {...rest}
  />
);
