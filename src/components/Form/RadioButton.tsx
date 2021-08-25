/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Box,
  FormControl,
  FormLabel,
  HStack,
  useRadio,
  useRadioGroup,
} from '@chakra-ui/react';
import React from 'react';
import { Control, useController } from 'react-hook-form';

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
        px={3}
        py={1}
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
  label?: string;
  isHorizontal?: boolean;
  control: Control<any>;
}

export const RadioButton: React.FC<RadioButtonProps> = ({
  options,
  name,
  defaultValue,
  label,
  isHorizontal,
  control,
}) => {
  const {
    field,
    formState: { errors },
  } = useController({
    control,
    name,
    rules: { required: { value: true, message: 'Required field' } },
  });

  const { getRootProps, getRadioProps } = useRadioGroup({
    name,
    defaultValue,
    onChange: field.onChange,
    value: field.value,
  });

  const group = getRootProps();

  return (
    <FormControl display={isHorizontal ? 'flex' : ''} alignItems="center">
      {label && (
        <FormLabel
          htmlFor={name}
          color="gray.700"
          mb={isHorizontal ? 0 : ''}
          minW="150px"
        >
          {label}
        </FormLabel>
      )}
      <HStack {...group} spacing={0}>
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
