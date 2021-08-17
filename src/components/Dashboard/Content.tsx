import { Box } from '@chakra-ui/react';

export const Content: React.FC = ({ children }) => {
  return (
    <Box as="main" mt={16}>
      {children}
    </Box>
  );
};
