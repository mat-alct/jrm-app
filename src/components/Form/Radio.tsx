'use client';

// --- 1. Bloco de Importações ---
import { Box, Field, Stack } from '@chakra-ui/react';
import React from 'react';
import {
  Control,
  FieldPath,
  FieldPathValue,
  FieldValues,
  useController,
} from 'react-hook-form';

// --- 2. Interface de Props ---
interface FormRadioProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  control: Control<TFieldValues>;
  options: string[];
  label?: string;
  defaultValue?: FieldPathValue<TFieldValues, FieldPath<TFieldValues>>;
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
  const labelId = `${name}-label`;
  const error = errors[name];
  const errorMessage =
    error && typeof error.message === 'string' ? error.message : undefined;

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
            id={labelId}
            mb={0} // Remove margem inferior padrão quando estiver na horizontal
            minW={isLabelHorizontal ? 'fit-content' : undefined}
          >
            {label}
          </Field.Label>
        )}

        <Stack
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : name}
          role="radiogroup"
          gap={4}
          direction={isHorizontal ? 'row' : 'column'}
        >
          {options.map(option => (
            <Box
              as="label"
              key={option}
              display="inline-flex"
              alignItems="center"
              cursor="pointer"
              gap={2}
            >
              <input
                type="radio"
                name={field.name}
                value={option}
                checked={field.value === option}
                onBlur={field.onBlur}
                onChange={() => field.onChange(option)}
                ref={field.ref}
                style={{ accentColor: '#B8860B' }}
              />
              <span>{option}</span>
            </Box>
          ))}
        </Stack>
      </Stack>

      {errorMessage && (
        <Field.ErrorText role="alert">{errorMessage}</Field.ErrorText>
      )}
    </Field.Root>
  );
};
