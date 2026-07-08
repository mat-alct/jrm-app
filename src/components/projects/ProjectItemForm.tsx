import { Box, Button, Checkbox, Heading, HStack } from '@chakra-ui/react';
import React from 'react';
import { FieldError, UseFormRegister } from 'react-hook-form';

import { FormInput } from '../Form/Input';

export interface ProjectItemFormValues {
  name: string;
  environment: string;
  material?: string;
  finish?: string;
  measurements?: string;
  description?: string;
  notes?: string;
  customerPrice: number;
  requiresDesigner: boolean;
}

export interface ProjectItemFormParentValues {
  items: ProjectItemFormValues[];
}

type ProjectItemFieldErrors = Partial<
  Record<keyof ProjectItemFormValues, FieldError>
>;

interface ProjectItemFormProps {
  index: number;
  register: UseFormRegister<any>;
  errors: Partial<Record<'items', ProjectItemFieldErrors[]>>;
  onRemove: () => void;
  canRemove: boolean;
}

export function ProjectItemForm({
  index,
  register,
  errors,
  onRemove,
  canRemove,
}: ProjectItemFormProps) {
  const itemErrors = errors.items?.[index];
  const field = (suffix: string) => `items.${index}.${suffix}`;

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      p={4}
      display="flex"
      flexDirection="column"
      gap={4}
    >
      <HStack justify="space-between">
        <Heading size="sm">Item {index + 1}</Heading>
        {canRemove && (
          <Button size="xs" variant="outline" colorScheme="red" onClick={onRemove}>
            Remover
          </Button>
        )}
      </HStack>

      <FormInput
        {...register(field('name'))}
        name={`items.${index}.name`}
        label="Nome do item"
        error={itemErrors?.name}
      />
      <FormInput
        {...register(field('environment'))}
        name={`items.${index}.environment`}
        label="Ambiente"
        error={itemErrors?.environment}
      />
      <FormInput
        {...register(field('material'))}
        name={`items.${index}.material`}
        label="Material"
        error={itemErrors?.material}
      />
      <FormInput
        {...register(field('finish'))}
        name={`items.${index}.finish`}
        label="Acabamento"
        error={itemErrors?.finish}
      />
      <FormInput
        {...register(field('measurements'))}
        name={`items.${index}.measurements`}
        label="Medidas"
        error={itemErrors?.measurements}
      />
      <FormInput
        {...register(field('description'))}
        name={`items.${index}.description`}
        label="Descrição"
        error={itemErrors?.description}
      />
      <FormInput
        {...register(field('notes'))}
        name={`items.${index}.notes`}
        label="Observações"
        error={itemErrors?.notes}
      />
      <FormInput
        {...register(field('customerPrice'), { valueAsNumber: true })}
        name={`items.${index}.customerPrice`}
        label="Preço"
        type="number"
        step="0.01"
        error={itemErrors?.customerPrice}
      />
      <Checkbox.Root>
        <Checkbox.HiddenInput
          {...register(field('requiresDesigner'))}
        />
        <Checkbox.Control />
        <Checkbox.Label>Requer desenhista</Checkbox.Label>
      </Checkbox.Root>
    </Box>
  );
}
