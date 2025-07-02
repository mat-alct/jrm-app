import { createSystem, defaultConfig } from '@chakra-ui/react';

export const theme = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        gray: {
          900:{value: '#181B23'} ,
          800: {value: '#1F2029'},
          700: {value: '#353646'} ,
          600: {value: '#4B4D63'} ,
          500: {value: '#616480'} ,
          400: {value: '#797D94'} ,
          300: {value: '#9699B0'} ,
          200: {value: '#B3B5C6'} ,
          100: {value: '#D1D2DC'} ,
          50: {value:'#EEEEF2'},
        },
      },
      fonts: {
        heading: {value: 'Roboto'} ,
        body: {value: 'Roboto'} ,
      },
      styles: {
        global: {
          body: {
            color: {value: 'gray.800'} ,
          },
        },
      },
      components: {
        Button: {
          baseStyle: {
            cursor: 'pointer',
          },
        },
      },
    }
  }

});
