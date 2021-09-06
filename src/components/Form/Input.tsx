import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  Input,
  InputProps as ChakraInputProps,
} from '@chakra-ui/react';
import React, { forwardRef, ForwardRefRenderFunction } from 'react';
import { FieldError } from 'react-hook-form';

type InputProps = ChakraInputProps & {
  name: string;
  label?: string;
  error?: FieldError;
  isHorizontal?: boolean;
};

const InputBase: ForwardRefRenderFunction<HTMLInputElement, InputProps> = (
  { name, label, error, isHorizontal, ...rest },
  ref,
) => {
  return (
    <FormControl
      isInvalid={!!error}
      display={isHorizontal ? 'flex' : ''}
      alignItems={isHorizontal ? 'center' : ''}
    >
      {label && (
        <FormLabel htmlFor={name} mb={isHorizontal ? 0 : 2}>
          {label}
        </FormLabel>
      )}
      <Input
        ref={ref}
        id={name}
        name={name}
        focusBorderColor="orange.500"
        {...rest}
      />
      {!!error && (
        // Role is necessary for validation tests
        <FormErrorMessage role="alert" ml={isHorizontal ? 4 : 0}>
          {error.message}
        </FormErrorMessage>
      )}
    </FormControl>
  );
};

export const FormInput = forwardRef(InputBase);
