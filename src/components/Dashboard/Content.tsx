import { Box } from '@chakra-ui/react';

export const Content: React.FC = ({ children }) => {
  return (
    <Box as="main" mt={16} w="100%">
      {children}
    </Box>
  );
};
