import { addDays, format, isWeekend } from 'date-fns';
import React from 'react';
import { useForm } from 'react-hook-form';

import { FormDatePicker } from '@/components/Form/DatePicker';

import { fireEvent, render, screen, waitFor } from '../../testUtils';

function Harness({
  onSubmit,
}: {
  onSubmit: (values: { deliveryDate: Date }) => void;
}) {
  const { control, handleSubmit } = useForm<{ deliveryDate: Date }>();

  return (
    <form onSubmit={event => void handleSubmit(onSubmit)(event)}>
      <FormDatePicker name="deliveryDate" control={control} />
      <button type="submit">Salvar</button>
    </form>
  );
}

function dateField(): HTMLInputElement {
  return document.querySelector(
    'input[name="deliveryDate"]',
  ) as HTMLInputElement;
}

describe('FormDatePicker', () => {
  it('propoe 7 dias uteis a frente (9 se hoje for fim de semana)', async () => {
    render(<Harness onSubmit={jest.fn()} />);

    await waitFor(() => expect(dateField()).toBeInTheDocument());

    const today = new Date();
    const expected = addDays(today, isWeekend(today) ? 9 : 7);
    expect(dateField().value).toBe(format(expected, 'dd/MM/yyyy'));
  });

  it('entrega a data escolhida ao formulario', async () => {
    const onSubmit = jest.fn();
    render(<Harness onSubmit={onSubmit} />);

    await waitFor(() => expect(dateField()).toBeInTheDocument());

    // Uma segunda-feira, para passar pelo filtro de dias uteis.
    fireEvent.change(dateField(), { target: { value: '02/03/2026' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const submitted = onSubmit.mock.calls[0][0].deliveryDate as Date;
    expect(format(submitted, 'dd/MM/yyyy')).toBe('02/03/2026');
  });

  it('desabilita sabados e domingos no calendario (filterDate)', async () => {
    render(<Harness onSubmit={jest.fn()} />);

    await waitFor(() => expect(dateField()).toBeInTheDocument());
    fireEvent.focus(dateField());

    const days = await waitFor(() => {
      const found = document.querySelectorAll('.react-datepicker__day');
      if (found.length === 0) throw new Error('calendario nao abriu');
      return Array.from(found);
    });

    const weekendDays = days.filter(day =>
      /--(saturday|sunday|weekend)/.test(day.className),
    );
    const weekdays = days.filter(
      day => !/--(saturday|sunday|weekend|outside-month)/.test(day.className),
    );

    expect(weekendDays.length).toBeGreaterThan(0);
    expect(weekendDays.every(day => day.className.includes('--disabled'))).toBe(
      true,
    );
    expect(weekdays.some(day => !day.className.includes('--disabled'))).toBe(
      true,
    );
  });
});
