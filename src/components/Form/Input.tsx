import {
  Fieldset,
  Input,
  Field,
  InputProps as ChakraInputProps,
  useBreakpointValue,
} from '@chakra-ui/react';
import React, { forwardRef, ForwardRefRenderFunction } from 'react';
import { FieldError } from 'react-hook-form';

type InputProps = ChakraInputProps & {
  name: string;
  label?: string;
  error?: FieldError;
  isHorizontal?: boolean;
};

type InputSize = NonNullable<ChakraInputProps['size']>;

const InputBase: ForwardRefRenderFunction<HTMLInputElement, InputProps> = (
  { name, label, error, isHorizontal, ...rest },
  ref,
) => {
  const possibleSize = useBreakpointValue(['sm', 'sm', 'md', 'md', 'lg', 'lg']);
  const inputSize: InputSize = (possibleSize || 'md') as InputSize;

  console.log(inputSize);

  return (
    <Fieldset.Root
      invalid={!!error}
      display={isHorizontal ? 'flex' : ''}
      alignItems={isHorizontal ? 'center' : ''}
    >
      {label && (
        <Field.Label htmlFor={name} mb={isHorizontal ? 0 : 2}>
          {label}
        </Field.Label>
      )}
      <Input
        ref={ref}
        id={name}
        name={name}
        borderColor="orange.500"
        size={inputSize}
        {...rest}
      />
      {!!error && (
        // Role is necessary for validation tests
        <Field.ErrorText role="alert" ml={isHorizontal ? 4 : 0}>
          {error.message}
        </Field.ErrorText>
      )}
    </Fieldset.Root>
  );
};

export const FormInput = forwardRef(InputBase);
