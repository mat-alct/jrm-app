import { Box, Skeleton, Table } from '@chakra-ui/react';

export interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  cols = 4,
}) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Table.Row key={rowIndex} borderColor="app.border">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <Table.Cell key={colIndex}>
            <Box py="1">
              <Skeleton h="20px" rounded="md" />
            </Box>
          </Table.Cell>
        ))}
      </Table.Row>
    ))}
  </>
);
