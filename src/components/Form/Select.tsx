/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  BoxProps,
  FormControl,
  FormErrorMessage,
  FormLabel,
} from '@chakra-ui/react';
import React from 'react';
import { Control, useController } from 'react-hook-form';
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
  control: Control<any>;
}

export const SelectWithSearch: React.FC<SelectWithSearchProps> = ({
  options,
  placeholder,
  hasDefaultValue,
  isClearable = false,
  label,
  name,
  control,
  ...rest
}) => {
  const {
    field,
    formState: { errors },
  } = useController({
    control,
    name,
  });

  return (
    <FormControl isInvalid={!!errors[name]} w="100%" {...rest}>
      {label && (
        <FormLabel color="gray.700" htmlFor={name}>
          {label}
        </FormLabel>
      )}
      <Select
        id={name}
        name={name}
        options={options}
        style={{ marginLeft: 0 }}
        isClearable={isClearable}
        placeholder={placeholder}
        value={field.value}
        onChange={field.onChange}
        defaultValue={
          hasDefaultValue
            ? options[options.map(opt => opt.value).indexOf(hasDefaultValue)]
            : null
        }
      />
      {!!errors[name] && (
        // Role is necessary for validation tests
        <FormErrorMessage role="alert">{errors[name].message}</FormErrorMessage>
      )}
    </FormControl>
  );
};
