/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Fieldset,
  RadioGroup,
  Stack,
  useBreakpointValue,
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
  isLabelHorizontal?: boolean;
}

export const FormRadio: React.FC<FormRadioProps> = ({
  name,
  label,
  control,
  defaultValue,
  options,
  isHorizontal,
  isLabelHorizontal,
}) => {
  const {
    field,
    formState: { errors },
  } = useController({
    control,
    name,
    defaultValue,
  });
  const radioSize = useBreakpointValue(['sm', 'sm', 'md', 'md', 'lg', 'lg']);

  return (
    <Fieldset.Root
      invalid={!!errors[name]}
      display={isLabelHorizontal ? 'flex' : ''}
    >
      {label && (
        <Fieldset.Legend mb={isLabelHorizontal ? '0' : ''}>{label}</Fieldset.Legend>
      )}
      <RadioGroup.Root
        value={field.value}
        onChange={field.onChange}
        colorScheme="orange"
        // size={radioSize}
      >
        <Stack gap={4} direction={isHorizontal ? 'row' : 'column'}>
          {options.map(option => (
            <RadioGroup.Item
              // size={radioSize}
              // name={option}
              id={option}
              value={option}
              key={option}
            >
              {option}
            </RadioGroup.Item>
          ))}
        </Stack>
      </RadioGroup.Root>
      {/* {!!errors[name] && (
        <Fieldset.ErrorText role="alert">{errors[name].message}</Fieldset.ErrorText>
      )} */}
    </Fieldset.Root>
  );
};
