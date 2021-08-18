import { Box, BoxProps } from '@chakra-ui/react';
import Select from 'react-select';

interface Options {
  value: string;
  label: string;
}

interface SelectWithSearchProps extends BoxProps {
  options: Options[];
}

export const SelectWithSearch: React.FC<SelectWithSearchProps> = ({
  options,
  ...rest
}) => {
  return (
    <Box {...rest}>
      <Select options={options} isClearable placeholder="Material" />
    </Box>
  );
};
