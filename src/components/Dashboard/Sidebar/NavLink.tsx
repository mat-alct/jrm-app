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

const GOLD = '#F5B820';

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
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <Flex
        align="center"
        gap="2.5"
        px="3"
        py="2"
        borderRadius="md"
        position="relative"
        cursor="pointer"
        whiteSpace="nowrap"
        transition="all 0.15s ease"
        bg={isActive ? 'rgba(245,184,32,0.12)' : 'transparent'}
        color={isActive ? GOLD : 'whiteAlpha.600'}
        fontWeight={isActive ? 'medium' : 'normal'}
        fontSize="sm"
        _hover={
          isActive
            ? undefined
            : { bg: 'whiteAlpha.100', color: 'whiteAlpha.900' }
        }
        _before={
          isActive
            ? {
                content: '""',
                position: 'absolute',
                left: '-12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '3px',
                height: '18px',
                background: GOLD,
                borderRadius: '0 2px 2px 0',
              }
            : undefined
        }
      >
        <Icon as={icon} boxSize="4" flexShrink={0} />
        <Text flex="1" fontSize="13.5px" lineHeight="1.4">
          {children}
        </Text>
      </Flex>
    </NextLink>
  );
};
