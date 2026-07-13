/* eslint-disable @typescript-eslint/no-explicit-any */
import 'react-datepicker/dist/react-datepicker.css';

import { Box, Fieldset } from '@chakra-ui/react';
import { addDays, getDay, isWeekend } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import React, { type FC } from 'react';
import type { DatePickerProps as ReactDatePickerProps } from 'react-datepicker';
import { Control, useController } from 'react-hook-form';

const DatePicker = dynamic(
  () =>
    import('react-datepicker').then(module => {
      module.registerLocale('pt-BR', ptBR);
      return module.default as unknown as FC<ReactDatePickerProps>;
    }),
  { ssr: false },
);

interface DatePickerProps {
  name: string;
  control: Control<any>;
}

export const FormDatePicker: React.FC<DatePickerProps> = ({
  name,
  control,
}) => {
  const today = new Date();

  const defaultValue = addDays(today, isWeekend(today) ? 9 : 7);

  const {
    field,
    formState: { errors },
  } = useController({
    control,
    name,
    defaultValue,
  });
  const rawValue: unknown = field.value;
  const selected = rawValue instanceof Date ? rawValue : null;

  const isWeekday = (date: Date) => {
    const day = getDay(date);
    return day !== 0 && day !== 6;
  };

  return (
    <Fieldset.Root display="flex" flexDirection="row" invalid={!!errors[name]}>
      <Box>
        <DatePicker
          selected={selected}
          onChange={(date: Date | null) => field.onChange(date)}
          locale="pt-BR"
          dateFormat="dd/MM/yyyy"
          filterDate={isWeekday}
          name={name}
        />
      </Box>
      {/* {!!errors[name] && (
        <Fieldset.ErrorText role="alert">{errors[name].message}</Fieldset.ErrorText>
      )} */}
    </Fieldset.Root>
  );
};
