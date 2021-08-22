import { Flex, Heading, HStack } from '@chakra-ui/react';

interface HeaderProps {
  pageTitle: string;
}

export const Header: React.FC<HeaderProps> = ({ pageTitle, children }) => {
  return (
    <Flex align="center" justify="space-between" mb={8}>
      <Heading color="gray.700">{pageTitle}</Heading>

      <HStack spacing={4}>{children}</HStack>
    </Flex>
  );
};
