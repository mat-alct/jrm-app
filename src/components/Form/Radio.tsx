/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
} from '@chakra-ui/react';
import React from 'react';
import { Control, useController } from 'react-hook-form';

interface FormRadioProps {
  name: string;
  label?: string;
  control: Control<any>;
  defaultValue?: string;
  options: string[];
  isHorizontal?: boolean;
}

export const FormRadio: React.FC<FormRadioProps> = ({
  name,
  label,
  control,
  defaultValue,
  options,
  isHorizontal,
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
      {label && <FormLabel>{label}</FormLabel>}
      <RadioGroup
        value={field.value}
        onChange={field.onChange}
        colorScheme="orange"
      >
        <Stack spacing={4} direction={isHorizontal ? 'row' : 'column'}>
          {options.map(option => (
            <Radio name={option} id={option} value={option} key={option}>
              {option}
            </Radio>
          ))}
        </Stack>
      </RadioGroup>
      {!!errors[name] && (
        <FormErrorMessage role="alert">{errors[name].message}</FormErrorMessage>
      )}
    </FormControl>
  );
};
