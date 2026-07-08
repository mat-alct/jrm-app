import { Box } from '@chakra-ui/react';
import React from 'react';
import { Control, FieldError, UseFormRegister } from 'react-hook-form';

import { AppUser } from '@/types/projects';

import { FormInput } from '../Form/Input';
import { FormSelect } from '../Form/Select';

export interface ProjectFormValues {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  sellerId: string;
}

interface ProjectFormProps {
  register: UseFormRegister<any>;
  control: Control<any>;
  errors: Partial<Record<keyof ProjectFormValues, FieldError>>;
  sellers: AppUser[];
}

export function ProjectForm({
  register,
  control,
  errors,
  sellers,
}: ProjectFormProps) {
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
      <FormSelect
        control={control}
        name="sellerId"
        label="Vendedor responsável"
        placeholder="Selecione o vendedor"
        options={sellers.map(seller => ({
          value: seller.id,
          label: seller.name,
        }))}
      />
    </Box>
  );
}
