'use client';

// --- 1. Bloco de Importações ---
import { Field, RadioGroup, Stack } from '@chakra-ui/react';
import React from 'react';
import { Control, FieldValues, useController } from 'react-hook-form';

// --- 2. Interface de Props ---
interface FormRadioProps<TFieldValues extends FieldValues> {
  name: string;
  control: Control<any, any, TFieldValues>;
  options: string[];
  label?: string;
  defaultValue?: string;
  isHorizontal?: boolean; // Controla a direção dos botões (RadioGroup)
  isLabelHorizontal?: boolean; // Controla a direção do Label vs RadioGroup
}

// --- 3. Definição do Componente ---
export const FormRadio = <TFieldValues extends FieldValues>({
  name,
  label,
  control,
  defaultValue,
  options,
  isHorizontal,
  isLabelHorizontal,
}: FormRadioProps<TFieldValues>) => {
  // --- 4. Lógica do Componente (Hooks) ---
  const {
    field,
    formState: { errors },
  } = useController({
    name,
    control,
    defaultValue,
  });

  // --- 5. Renderização do Componente (JSX) ---
  return (
    <Field.Root invalid={!!errors[name]}>
      {/* Stack controla o layout entre o Label e o Grupo de Radios */}
      <Stack
        direction={isLabelHorizontal ? 'row' : 'column'}
        align={isLabelHorizontal ? 'center' : 'flex-start'}
        gap={isLabelHorizontal ? 4 : 1}
      >
        {label && (
          <Field.Label
            htmlFor={name}
            mb={0} // Remove margem inferior padrão quando estiver na horizontal
            minW={isLabelHorizontal ? 'fit-content' : undefined}
          >
            {label}
          </Field.Label>
        )}

        <RadioGroup.Root
          value={field.value}
          onValueChange={e => field.onChange(e.value)}
          colorScheme="orange"
        >
          <Stack gap={4} direction={isHorizontal ? 'row' : 'column'}>
            {options.map(option => (
              <RadioGroup.Item key={option} value={option}>
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>{option}</RadioGroup.ItemText>
              </RadioGroup.Item>
            ))}
          </Stack>
        </RadioGroup.Root>
      </Stack>

      {!!errors[name] && (
        <Field.ErrorText role="alert">
          {(errors[name] as any).message}
        </Field.ErrorText>
      )}
    </Field.Root>
  );
};
