import { Box } from '@chakra-ui/react';
import React from 'react';
import { FieldError, Path, UseFormRegister } from 'react-hook-form';

import { FormInput } from '../Form/Input';

export interface ProjectFormValues {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
}

interface ProjectFormProps<TFieldValues extends ProjectFormValues> {
  register: UseFormRegister<TFieldValues>;
  errors: Partial<Record<keyof ProjectFormValues, FieldError>>;
}

export function ProjectForm<TFieldValues extends ProjectFormValues>({
  register,
  errors,
}: ProjectFormProps<TFieldValues>) {
  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <FormInput
        {...register('customerName' as Path<TFieldValues>)}
        name="customerName"
        label="Nome do cliente"
        error={errors.customerName}
      />
      <FormInput
        {...register('customerPhone' as Path<TFieldValues>)}
        name="customerPhone"
        label="Telefone"
        error={errors.customerPhone}
      />
      <FormInput
        {...register('customerEmail' as Path<TFieldValues>)}
        name="customerEmail"
        label="E-mail"
        type="email"
        error={errors.customerEmail}
      />
      <FormInput
        {...register('customerAddress' as Path<TFieldValues>)}
        name="customerAddress"
        label="Endereço"
        error={errors.customerAddress}
      />
    </Box>
  );
}
