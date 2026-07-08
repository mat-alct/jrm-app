import { Badge, BadgeProps } from '@chakra-ui/react';
import React from 'react';

import { ProjectItemStatus } from '@/types/projects';
import {
  INTERNAL_STATUS_COLORS,
  INTERNAL_STATUS_LABELS,
} from '@/utils/projects/status';

interface ProjectItemStatusBadgeProps extends Omit<BadgeProps, 'colorScheme'> {
  status: ProjectItemStatus;
}

export const ProjectItemStatusBadge: React.FC<ProjectItemStatusBadgeProps> = ({
  status,
  ...rest
}) => (
  <Badge colorScheme={INTERNAL_STATUS_COLORS[status]} {...rest}>
    {INTERNAL_STATUS_LABELS[status]}
  </Badge>
);
