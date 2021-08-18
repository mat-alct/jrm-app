import { Box, HStack, useRadio, useRadioGroup } from '@chakra-ui/react';
import React from 'react';

const RadioCard: React.FC = ({ children, ...rest }) => {
  const { getInputProps, getCheckboxProps } = useRadio({ ...rest });

  const input = getInputProps();
  const checkbox = getCheckboxProps();

  return (
    <Box as="label">
      <input {...input} />
      <Box
        {...checkbox}
        cursor="pointer"
        borderWidth="1px"
        borderRadius="md"
        boxShadow="md"
        _checked={{
          bg: 'teal.600',
          color: 'white',
          borderColor: 'teal.600',
        }}
        _focus={{
          boxShadow: 'outline',
        }}
        px={5}
        py={3}
      >
        {children}
      </Box>
    </Box>
  );
};

interface RadioButtonProps {
  name: string;
  defaultValue?: string;
  options: string[];
  changeFunction: () => void;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  options,
  name,
  defaultValue,
  changeFunction,
}) => {
  const { getRootProps, getRadioProps } = useRadioGroup({
    name,
    defaultValue,
    onChange: changeFunction,
  });

  const group = getRootProps();

  return (
    <HStack {...group}>
      {options.map(value => {
        const radio = getRadioProps({ value });
        return (
          <RadioCard key={value} {...radio}>
            {value}
          </RadioCard>
        );
      })}
    </HStack>
  );
};
