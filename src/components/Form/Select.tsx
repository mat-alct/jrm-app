/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormControl, FormErrorMessage, FormLabel } from '@chakra-ui/react';
import React from 'react';
import { Control, useController } from 'react-hook-form';
import Select from 'react-select';

interface Options {
  value: string | number;
  label: string;
}
//
interface FormSelectProps {
  options: Options[];
  name: string;
  placeholder?: string;
  defaultValue?: string;
  isClearable?: boolean;
  label?: string;
  control: Control<any>;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  options,
  placeholder,
  isClearable = false,
  label,
  name,
  control,
  defaultValue,
}) => {
  const {
    field,
    formState: { errors },
  } = useController({
    control,
    name,
    defaultValue,
  });

  return (
    <FormControl isInvalid={!!errors[name]}>
      {label && (
        <FormLabel color="gray.700" htmlFor={name}>
          {label}
        </FormLabel>
      )}
      <Select
        id={name}
        name={name}
        options={options}
        isClearable={isClearable}
        placeholder={placeholder}
        value={field.value}
        onChange={field.onChange}
      />
      {!!errors[name] && (
        <FormErrorMessage role="alert">{errors[name].message}</FormErrorMessage>
      )}
    </FormControl>
  );
};
