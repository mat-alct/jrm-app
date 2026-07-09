import { Box } from '@chakra-ui/react';
import React from 'react';
import { FieldError, UseFormRegister } from 'react-hook-form';

import { FormInput } from '../Form/Input';

export interface ProjectFormValues {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
}

interface ProjectFormProps {
  register: UseFormRegister<any>;
  errors: Partial<Record<keyof ProjectFormValues, FieldError>>;
}

export function ProjectForm({ register, errors }: ProjectFormProps) {
  return (
    <Box display="flex" flexDirection="column" gap={4}>
      <FormInput
        {...register('customerName')}
        name="customerName"
        label="Nome do cliente"
        error={errors.customerName}
      />
      <FormInput
        {...register('customerPhone')}
        name="customerPhone"
        label="Telefone"
        error={errors.customerPhone}
      />
      <FormInput
        {...register('customerEmail')}
        name="customerEmail"
        label="E-mail"
        type="email"
        error={errors.customerEmail}
      />
      <FormInput
        {...register('customerAddress')}
        name="customerAddress"
        label="Endereço"
        error={errors.customerAddress}
      />
    </Box>
  );
}
