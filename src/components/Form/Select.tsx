/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fieldset } from '@chakra-ui/react';
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
  defaultValue?: string | number;
  isClearable?: boolean;
  label?: string;
  control: Control<any>;
  isDisabled?: boolean;
}

export const FormSelect: React.FC<FormSelectProps> = ({
  options,
  placeholder,
  isClearable = false,
  label,
  name,
  control,
  defaultValue,
  isDisabled,
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
    <Fieldset.Root invalid={!!errors[name]}>
      {label && (
        <Fieldset.Legend color="gray.700">
          {label}
        </Fieldset.Legend>
      )}
      <Select
        id={name}
        name={name}
        options={options}
        isClearable={isClearable}
        placeholder={placeholder}
        isDisabled={isDisabled}
        // value={options.find(c => c.value === field.value)}
        onChange={val => field.onChange(val?.value)}
      />
      {/* {!!errors[name] && (
        <Fieldset.ErrorText role="alert">{errors[name].message}</Fieldset.ErrorText>
      )} */}
    </Fieldset.Root>
  );
};
