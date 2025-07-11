'use client';

// --- 1. Bloco de Importações ---
// Importa o componente 'Field' (seu sistema de formulário customizado) e componentes de layout do Chakra UI.
import { Field, HStack, RadioGroup, Stack } from '@chakra-ui/react';
// Importa tipos e hooks essenciais do React.
import React from 'react';
// Importa hooks e tipos do React Hook Form para integração e segurança de tipos.
import {
  Control,
  FieldValues,
  Path,
  PathValue,
  useController,
} from 'react-hook-form';

// --- 2. Interface de Props ---
// A interface define o "contrato" do nosso componente, ou seja, quais props ele aceita.
// Ela é genérica (<TFieldValues>) para garantir que 'name' e 'control'
// correspondam ao tipo do formulário, evitando erros de digitação.
interface FormRadioProps<TFieldValues extends FieldValues> {
  // 'name' é o nome do campo no formulário. 'Path<TFieldValues>' garante que seja um nome válido.
  name: string;
  // 'control' é o objeto do react-hook-form que gerencia o estado do formulário.
  control: Control<any, any, TFieldValues>;
  // 'options' é um array de strings que serão usadas para criar os botões de rádio.
  options: string[];
  // Props opcionais para customização.
  label?: string;
  defaultValue?: string;
  isHorizontal?: boolean;
}
// --- 3. Definição do Componente ---
// O componente é genérico para se adaptar a qualquer formulário.
// A definição foi simplificada (sem React.FC) para seguir os padrões modernos do React.
export const FormRadio = <TFieldValues extends FieldValues>({
  name,
  label,
  control,
  defaultValue,
  options,
  isHorizontal,
}: FormRadioProps<TFieldValues>) => {
  // --- 4. Lógica do Componente (Hooks) ---

  // O hook 'useController' é a ponte entre o react-hook-form e componentes de UI controlados.
  const {
    field, // 'field' contém as propriedades essenciais como 'value' e 'onChange'.
    formState: { errors }, // 'errors' contém os erros de validação para este campo.
  } = useController({
    name,
    control,
    defaultValue,
  });

  // --- 5. Renderização do Componente (JSX) ---
  return (
    // Usa o seu componente customizado 'Field.Root' para manter a consistência visual
    // e de tratamento de erros com os outros campos de formulário.
    // A prop 'isInvalid' controla o estilo de erro (ex: borda vermelha).
    <Field.Root invalid={!!errors[name]}>
      {/* Renderiza o label do grupo de rádio, se um for fornecido. */}
      {label && <Field.Label htmlFor={name}>{label}</Field.Label>}

      {/* 'RadioGroup.Root' é o container da nova API do Chakra que gerencia o estado do grupo. */}
      <RadioGroup.Root
        // O valor selecionado é controlado pelo estado do formulário (field.value).
        value={field.value}
        // 'onValueChange' é a nova prop para capturar mudanças.
        // Ela retorna um objeto { value: string }, por isso passamos e.value para o field.onChange.
        onValueChange={e => field.onChange(e.value)}
        colorScheme="orange"
      >
        {/* 'Stack' ou 'HStack' organiza os botões na vertical ou horizontal. */}
        <Stack gap={4} direction={isHorizontal ? 'row' : 'column'}>
          {/* Um loop para criar um item de rádio para cada 'option' recebida. */}
          {options.map(option => (
            // 'RadioGroup.Item' representa um único botão de rádio.
            <RadioGroup.Item key={option} value={option}>
              {/* Sub-componentes necessários pela nova API do Chakra. */}
              <RadioGroup.ItemHiddenInput />
              <RadioGroup.ItemIndicator />
              <RadioGroup.ItemText>{option}</RadioGroup.ItemText>
            </RadioGroup.Item>
          ))}
        </Stack>
      </RadioGroup.Root>

      {/* Exibe a mensagem de erro vinda do Yup, se houver um erro para este campo. */}
      {!!errors[name] && (
        <Field.ErrorText role="alert">
          {/* O 'as any' é um escape para acessar 'message', pois o tipo do erro pode ser complexo. */}
          {(errors[name] as any).message}
        </Field.ErrorText>
      )}
    </Field.Root>
  );
};
