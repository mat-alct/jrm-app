import {
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Radio,
  RadioGroup,
} from '@chakra-ui/react';
import React from 'react';
import { Control, useController } from 'react-hook-form';

interface FormRadioProps {
  name: string;
  label?: string;
  control: Control<any>;
}

export const FormRadio: React.FC<FormRadioProps> = ({
  name,
  label,
  control,
}) => {
  const {
    field,
    formState: { errors },
  } = useController({
    control,
    name,
  });

  return (
    <FormControl isInvalid={!!errors[name]}>
      <FormLabel>{label}</FormLabel>
      <RadioGroup value={field.value} onChange={field.onChange}>
        <HStack spacing={4}>
          <Radio name="MDF" value="MDF" isChecked>
            MDF
          </Radio>
          <Radio name="Compensado" value="Compensado">
            Compensado
          </Radio>
        </HStack>
      </RadioGroup>

      {!!errors[name] && (
        <FormErrorMessage role="alert">{errors[name].message}</FormErrorMessage>
      )}
    </FormControl>
  );
};
