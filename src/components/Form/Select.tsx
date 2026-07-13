import { Fieldset } from '@chakra-ui/react';
import React from 'react';
import {
  Control,
  FieldPath,
  FieldPathValue,
  FieldValues,
  useController,
} from 'react-hook-form';
import Select from 'react-select';

interface Options {
  value: string | number;
  label: string;
}
//
interface FormSelectProps<TFieldValues extends FieldValues> {
  options: Options[];
  name: FieldPath<TFieldValues>;
  placeholder?: string;
  defaultValue?: FieldPathValue<TFieldValues, FieldPath<TFieldValues>>;
  isClearable?: boolean;
  label?: string;
  control: Control<TFieldValues>;
  isDisabled?: boolean;
}

export const FormSelect = <TFieldValues extends FieldValues>({
  options,
  placeholder,
  isClearable = false,
  label,
  name,
  control,
  defaultValue,
  isDisabled,
}: FormSelectProps<TFieldValues>) => {
  const {
    field,
    formState: { errors },
  } = useController({
    control,
    name,
    defaultValue,
  });
  const error = errors[name];
  const errorMessage =
    error && typeof error.message === 'string' ? error.message : undefined;

  return (
    <Fieldset.Root invalid={!!errors[name]}>
      {label && <Fieldset.Legend color="gray.700">{label}</Fieldset.Legend>}
      <Select
        inputId={name}
        name={name}
        options={options}
        isClearable={isClearable}
        placeholder={placeholder}
        isDisabled={isDisabled}
        value={options.find(c => c.value === field.value)}
        onChange={val => field.onChange(val?.value)}
      />
      {errorMessage && (
        <Fieldset.ErrorText role="alert">{errorMessage}</Fieldset.ErrorText>
      )}
    </Fieldset.Root>
  );
};
