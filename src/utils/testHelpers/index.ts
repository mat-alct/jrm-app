import { fireEvent, screen, waitFor } from '@testing-library/react';

export const changeInputByPlaceholder = (
  placeholder: string,
  value: string,
) => {
  fireEvent.change(screen.getByPlaceholderText(new RegExp(placeholder, 'i')), {
    target: { value },
  });
};

export const clickButtonByName = async (buttonName: string) => {
  await waitFor(() =>
    fireEvent.click(
      screen.getByRole('button', { name: new RegExp(buttonName, 'i') }),
    ),
  );
};
