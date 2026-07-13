import { Box, Button, Flex, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import { useFieldArray, useForm } from 'react-hook-form';

import { ItemBudget } from '@/types/projects';

import { FormInput } from '../Form/Input';

interface BudgetFormValues {
  lines: { description: string; amount: number }[];
  customerAmount: number;
  suggestedAssemblerAmount: number;
}

interface ItemBudgetFormProps {
  initialBudget?: ItemBudget;
  isSubmitting?: boolean;
  onSubmit: (values: BudgetFormValues) => Promise<void> | void;
}

export function ItemBudgetForm({
  initialBudget,
  isSubmitting = false,
  onSubmit,
}: ItemBudgetFormProps) {
  const { register, control, handleSubmit, watch } = useForm<BudgetFormValues>({
    defaultValues: {
      lines: initialBudget?.lines.length
        ? initialBudget.lines.map(line => ({
            description: line.description,
            amount: line.amount,
          }))
        : [{ description: '', amount: 0 }],
      customerAmount: initialBudget?.customerAmount ?? 0,
      suggestedAssemblerAmount: initialBudget?.suggestedAssemblerAmount ?? 0,
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const lines = watch('lines');

  const totalCost = lines.reduce(
    (total, line) => total + (Number(line.amount) || 0),
    0,
  );

  const submit = handleSubmit(async values => {
    await onSubmit(values);
  });

  return (
    <Box
      as="form"
      onSubmit={event => void submit(event)}
      display="flex"
      flexDirection="column"
      gap={4}
    >
      <Text fontWeight="700">Linhas de custo</Text>
      <VStack align="stretch" gap={3}>
        {fields.map((field, index) => (
          <HStack key={field.id} align="flex-end">
            <FormInput
              {...register(`lines.${index}.description`)}
              name={`lines.${index}.description`}
              label="Descrição"
            />
            <FormInput
              {...register(`lines.${index}.amount`, { valueAsNumber: true })}
              name={`lines.${index}.amount`}
              label="Valor"
              type="number"
              step="0.01"
            />
            {fields.length > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => remove(index)}
              >
                Remover
              </Button>
            ) : null}
          </HStack>
        ))}
      </VStack>
      <Button
        type="button"
        variant="outline"
        alignSelf="flex-start"
        onClick={() => append({ description: '', amount: 0 })}
      >
        Adicionar linha
      </Button>

      <Text fontWeight="700">Custo total: {totalCost.toFixed(2)}</Text>

      <FormInput
        {...register('customerAmount', { valueAsNumber: true })}
        name="customerAmount"
        label="Valor cobrado do cliente"
        type="number"
        step="0.01"
      />
      <FormInput
        {...register('suggestedAssemblerAmount', { valueAsNumber: true })}
        name="suggestedAssemblerAmount"
        label="Sugestão de valor para o montador"
        type="number"
        step="0.01"
      />

      <Flex justify="flex-end">
        <Button type="submit" colorScheme="orange" loading={isSubmitting}>
          Salvar orçamento
        </Button>
      </Flex>
    </Box>
  );
}
