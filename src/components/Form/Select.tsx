import { Box, BoxProps } from '@chakra-ui/react';
import Select from 'react-select';

interface Options {
  value: string;
  label: string;
}

interface SelectWithSearchProps extends BoxProps {
  options: Options[];
  placeholder?: string;
  hasDefaultValue?: boolean;
  isClearable?: boolean;
}

export const SelectWithSearch: React.FC<SelectWithSearchProps> = ({
  options,
  placeholder,
  hasDefaultValue = false,
  isClearable = false,
  ...rest
}) => {
  return (
    <Box {...rest}>
      <Select
        options={options}
        style={{ marginLeft: 0 }}
        isClearable={isClearable}
        placeholder={placeholder}
        defaultValue={hasDefaultValue ? options[0] : null}
      />
    </Box>
  );
};
