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
};

const InputBase: ForwardRefRenderFunction<HTMLInputElement, InputProps> = (
  { name, label, error, ...rest },
  ref,
) => {
  return (
    <FormControl isInvalid={!!error}>
      {label && (
        <FormLabel color="gray.700" htmlFor={name}>
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
        <FormErrorMessage role="alert">{error.message}</FormErrorMessage>
      )}
    </FormControl>
  );
};

export const FormInput = forwardRef(InputBase);
