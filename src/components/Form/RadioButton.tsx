import {
  Box,
  FormControl,
  FormLabel,
  HStack,
  useRadio,
  useRadioGroup,
} from '@chakra-ui/react';
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
        borderRadius="xs"
        boxShadow="xs"
        _checked={{
          bg: 'orange.600',
          color: 'white',
          borderColor: 'orange.600',
        }}
        _focus={{
          boxShadow: 'outline',
        }}
        px={4}
        py={2}
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
  label?: string;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  options,
  name,
  defaultValue,
  label,
  changeFunction,
}) => {
  const { getRootProps, getRadioProps } = useRadioGroup({
    name,
    defaultValue,
    onChange: changeFunction,
  });

  const group = getRootProps();

  return (
    <FormControl display="flex" alignItems="center">
      {label && (
        <FormLabel htmlFor={name} color="gray.700" mb={0}>
          {label}
        </FormLabel>
      )}
      <HStack {...group}>
        {options.map(value => {
          const radio = getRadioProps({ value });
          return (
            <RadioCard name={name} key={value} {...radio}>
              {value}
            </RadioCard>
          );
        })}
      </HStack>
    </FormControl>
  );
};
