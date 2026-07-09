import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Fieldset,
  HStack,
} from '@chakra-ui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';

import { UserRole } from '@/types/projects';
import { createUserSchema } from '@/utils/yup/usuariosValidations';

import { FormInput } from '../Form/Input';

export interface UserFormValues {
  name: string;
  email: string;
  phone?: string;
  password: string;
  roles: UserRole[];
}

interface UserFormProps {
  onSubmit: (values: UserFormValues) => Promise<void> | void;
  isSubmitting?: boolean;
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'seller', label: 'Vendedor' },
  { value: 'designer', label: 'Desenhista' },
  { value: 'assembler', label: 'Montador' },
  { value: 'woodworker', label: 'Marceneiro' },
];

export const UserForm: React.FC<UserFormProps> = ({
  onSubmit,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(createUserSchema),
    defaultValues: { roles: [] as UserRole[] },
  });

  const submit = handleSubmit(async values => {
    await onSubmit(values as UserFormValues);
    reset();
  });

  return (
    <Box as="form" onSubmit={submit} display="flex" flexDirection="column" gap={4}>
      <FormInput
        {...register('name')}
        name="name"
        label="Nome"
        error={errors.name}
      />
      <FormInput
        {...register('email')}
        name="email"
        label="E-mail"
        type="email"
        error={errors.email}
      />
      <FormInput
        {...register('phone')}
        name="phone"
        label="Telefone"
        error={errors.phone}
      />
      <FormInput
        {...register('password')}
        name="password"
        label="Senha inicial"
        type="password"
        error={errors.password}
      />
      <Controller
        control={control}
        name="roles"
        render={({ field }) => (
          <Fieldset.Root invalid={!!errors.roles}>
            <Fieldset.Legend>Papéis</Fieldset.Legend>
            <CheckboxGroup
              value={field.value}
              onValueChange={field.onChange}
            >
              <HStack wrap="wrap" gap={4}>
                {ROLE_OPTIONS.map(option => (
                  <Checkbox.Root key={option.value} value={option.value}>
                    <Checkbox.HiddenInput />
                    <Checkbox.Control />
                    <Checkbox.Label>{option.label}</Checkbox.Label>
                  </Checkbox.Root>
                ))}
              </HStack>
            </CheckboxGroup>
            {!!errors.roles && (
              <Fieldset.ErrorText role="alert">
                {errors.roles.message}
              </Fieldset.ErrorText>
            )}
          </Fieldset.Root>
        )}
      />
      <Button
        type="submit"
        colorScheme="orange"
        loading={isSubmitting}
        alignSelf="flex-start"
      >
        Salvar
      </Button>
    </Box>
  );
};
