import {
  Box,
  Button,
  Field,
  Flex,
  Input,
  NativeSelect,
  Stack,
  Text,
  VStack,
  chakra,
} from '@chakra-ui/react';
import React from 'react';

import { AssignAssemblerInput } from '@/services/projects/assembler.service';
import { AppUser } from '@/types/projects';

interface AssignAssemblerModalProps {
  assemblers: AppUser[];
  suggestedAmount?: number;
  isSubmitting?: boolean;
  onSubmit: (assignments: AssignAssemblerInput[]) => Promise<void> | void;
}

interface DraftAssignment {
  assemblerId: string;
  amountToReceive: string;
}

export function AssignAssemblerModal({
  assemblers,
  suggestedAmount,
  isSubmitting = false,
  onSubmit,
}: AssignAssemblerModalProps) {
  const [rows, setRows] = React.useState<DraftAssignment[]>([
    {
      assemblerId: assemblers[0]?.id ?? '',
      amountToReceive: suggestedAmount ? String(suggestedAmount) : '',
    },
  ]);
  const [error, setError] = React.useState<string | null>(null);

  function updateRow(index: number, patch: Partial<DraftAssignment>) {
    setRows(current =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
  }

  function addRow() {
    setRows(current => [
      ...current,
      { assemblerId: assemblers[0]?.id ?? '', amountToReceive: '' },
    ]);
  }

  function removeRow(index: number) {
    setRows(current => current.filter((_, rowIndex) => rowIndex !== index));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const assignments = rows.map(row => {
      const assembler = assemblers.find(item => item.id === row.assemblerId);
      return {
        assemblerId: row.assemblerId,
        assemblerName: assembler?.name,
        amountToReceive: Number(row.amountToReceive),
      };
    });

    if (
      assignments.length === 0 ||
      assignments.some(
        assignment =>
          !assignment.assemblerId ||
          !Number.isFinite(assignment.amountToReceive) ||
          assignment.amountToReceive <= 0,
      )
    ) {
      setError('Informe montador e valor maior que zero.');
      return;
    }

    setError(null);
    await onSubmit(assignments);
  }

  return (
    <chakra.form
      bg="white"
      border="1px solid"
      borderColor="gray.100"
      borderRadius="8px"
      p={4}
      onSubmit={handleSubmit}
    >
      <VStack align="stretch" gap={4}>
        <Text fontSize="lg" fontWeight="800">
          Atribuir montadores
        </Text>

        {rows.map((row, index) => (
          <Stack key={index} direction={{ base: 'column', md: 'row' }} gap={3}>
            <Field.Root>
              <Field.Label>Montador</Field.Label>
              <NativeSelect.Root>
                <NativeSelect.Field
                  value={row.assemblerId}
                  onChange={event =>
                    updateRow(index, { assemblerId: event.target.value })
                  }
                >
                  {assemblers.map(assembler => (
                    <option key={assembler.id} value={assembler.id}>
                      {assembler.name}
                    </option>
                  ))}
                </NativeSelect.Field>
                <NativeSelect.Indicator />
              </NativeSelect.Root>
            </Field.Root>
            <Field.Root>
              <Field.Label>Valor a receber</Field.Label>
              <Input
                inputMode="decimal"
                value={row.amountToReceive}
                onChange={event =>
                  updateRow(index, { amountToReceive: event.target.value })
                }
                placeholder="0,00"
              />
            </Field.Root>
            {rows.length > 1 ? (
              <Button
                alignSelf={{ base: 'stretch', md: 'end' }}
                variant="outline"
                onClick={() => removeRow(index)}
              >
                Remover
              </Button>
            ) : null}
          </Stack>
        ))}

        {error ? (
          <Text color="red.600" fontSize="sm">
            {error}
          </Text>
        ) : null}

        <Flex gap={2} justify="space-between" wrap="wrap">
          <Button type="button" variant="outline" onClick={addRow}>
            Adicionar montador
          </Button>
          <Button
            type="submit"
            loading={isSubmitting}
            bgColor="orange.500"
            color="white"
            _hover={{ bgColor: 'orange.400' }}
          >
            Salvar atribuições
          </Button>
        </Flex>
      </VStack>
    </chakra.form>
  );
}
