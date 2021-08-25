import {
  BoxProps,
  FormControl,
  FormErrorMessage,
  FormLabel,
} from '@chakra-ui/react';
import React, { forwardRef, ForwardRefRenderFunction } from 'react';
import { FieldError } from 'react-hook-form';
import Select from 'react-select';

interface Options {
  value: string;
  label: string;
}
//
interface SelectWithSearchProps extends BoxProps {
  options: Options[];
  name: string;
  placeholder?: string;
  hasDefaultValue?: string;
  isClearable?: boolean;
  label?: string;
  error?: FieldError;
}

const SelectWithSearch: ForwardRefRenderFunction<
  HTMLSelectElement,
  SelectWithSearchProps
> = (
  {
    options,
    placeholder,
    hasDefaultValue,
    isClearable = false,
    label,
    error,
    name,
    ...rest
  },
  ref,
) => {
  return (
    <FormControl isInvalid={!!error} w="100%" {...rest}>
      {label && (
        <FormLabel color="gray.700" htmlFor={name}>
          {label}
        </FormLabel>
      )}
      <Select
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        ref={ref}
        id={name}
        name={name}
        options={options}
        style={{ marginLeft: 0 }}
        isClearable={isClearable}
        placeholder={placeholder}
        defaultValue={
          hasDefaultValue
            ? options[options.map(opt => opt.value).indexOf(hasDefaultValue)]
            : null
        }
      />
      {!!error && (
        // Role is necessary for validation tests
        <FormErrorMessage role="alert">{error.message}</FormErrorMessage>
      )}
    </FormControl>
  );
};

export const FormSelectWithSearch = forwardRef(SelectWithSearch);
