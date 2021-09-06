/* eslint-disable @typescript-eslint/no-explicit-any */
import 'react-datepicker/dist/react-datepicker.css';

import {
  Box,
  FormControl,
  FormErrorMessage,
  FormLabel,
} from '@chakra-ui/react';
import { addDays, getDay, isWeekend } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import React from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import { Control, useController } from 'react-hook-form';

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

  const isWeekday = (date: Date) => {
    const day = getDay(date);
    return day !== 0 && day !== 6;
  };

  registerLocale('ptBR', ptBR);

  return (
    <FormControl display="flex" flexDirection="row" isInvalid={!!errors[name]}>
      <FormLabel mb={0}>Data de Entrega:</FormLabel>
      <Box>
        <DatePicker
          selected={field.value}
          onChange={(date: Date) => field.onChange(date)}
          locale="ptBR"
          dateFormat="P"
          filterDate={isWeekday}
          value={field.value}
          name={name}
        />
      </Box>
      {!!errors[name] && (
        <FormErrorMessage role="alert">{errors[name].message}</FormErrorMessage>
      )}
    </FormControl>
  );
};
