/* eslint-disable @typescript-eslint/no-explicit-any */
import 'react-datepicker/dist/react-datepicker.css';

import {
  Box,
  Fieldset
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

  // registerLocale('ptBR', ptBR);

  return (
    <Fieldset.Root display="flex" flexDirection="row" invalid={!!errors[name]}>
      <Fieldset.Legend mb={0}>Data de Entrega:</Fieldset.Legend>
      <Box>
        <DatePicker
          selected={field.value}
          // onChange={(date: Date) => field.onChange(date)}
          locale="ptBR"
          dateFormat="P"
          filterDate={isWeekday}
          value={field.value}
          name={name}
        />
      </Box>
      {/* {!!errors[name] && (
        <Fieldset.ErrorText role="alert">{errors[name].message}</Fieldset.ErrorText>
      )} */}
    </Fieldset.Root>
  );
};
