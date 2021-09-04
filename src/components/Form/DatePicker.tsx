import 'react-datepicker/dist/react-datepicker.css';

import { Box, FormControl, FormLabel } from '@chakra-ui/react';
import { getDay } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import React, { useState } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';

export const FormDatePicker = () => {
  const [startDate, setStartDate] = useState<Date | null>(new Date());

  const isWeekday = (date: Date) => {
    const day = getDay(date);
    return day !== 0 && day !== 6;
  };

  registerLocale('ptBR', ptBR);

  return (
    <FormControl display="flex" flexDirection="row">
      <FormLabel color="gray.700" mb={0} minW="150px">
        Data de Entrega:
      </FormLabel>
      <Box border="2px solid gray.500" bg="gray.200" p="1px">
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
