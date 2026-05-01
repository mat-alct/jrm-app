import { Flex, Icon, Text } from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import React, { ElementType, MouseEventHandler } from 'react';

interface NavLinkProps {
  icon: ElementType;
  href: string;
  children: React.ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export const NavLink: React.FC<NavLinkProps> = ({
  icon,
  children,
  href,
  onClick,
}) => {
  const { asPath } = useRouter();
  const isActive = asPath === href;

  return (
    <NextLink
      href={href}
      onClick={onClick}
      style={{ textDecoration: 'none' }}
    >
      <Flex align="center" color={isActive ? 'yellow.500' : 'gray.600'}>
        <Icon as={icon} fontSize="20" />
        <Text ml="4" fontWeight="medium">
          {children}
        </Text>
      </Flex>
    </NextLink>
  );
};
