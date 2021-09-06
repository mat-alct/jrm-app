import 'react-datepicker/dist/react-datepicker.css';

import { Box, FormControl, FormLabel } from '@chakra-ui/react';
import { addDays, getDay, isWeekend } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import React, { useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';

export const FormDatePicker = () => {
  const today = new Date();

  const [startDate, setStartDate] = useState<Date | null>(
    addDays(today, isWeekend(today) ? 9 : 7),
  );

  const isWeekday = (date: Date) => {
    const day = getDay(date);
    return day !== 0 && day !== 6;
  };

  registerLocale('ptBR', ptBR);

  return (
    <FormControl display="flex" flexDirection="row">
      <FormLabel mb={0}>Data de Entrega:</FormLabel>
      <Box>
        <DatePicker
          selected={startDate}
          onChange={(date: Date) => setStartDate(date)}
          locale="ptBR"
          dateFormat="P"
          filterDate={isWeekday}
        />
      </Box>
    </FormControl>
  );
};
