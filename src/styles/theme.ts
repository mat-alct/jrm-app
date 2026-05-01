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
        orange: {
          50: {value: '#F4F4F4'},
          100: {value: '#E5E5E4'},
          200: {value: '#C7C6C5'},
          300: {value: '#A6A5A4'},
          400: {value: '#7F7E7D'},
          500: {value: '#2E2D2C'},
          600: {value: '#272625'},
          700: {value: '#20201F'},
          800: {value: '#171716'},
          900: {value: '#0E0D0D'},
        },
        yellow: {
          50: {value: '#FFF8E1'},
          100: {value: '#FFE5A8'},
          200: {value: '#F8D173'},
          300: {value: '#E8B842'},
          400: {value: '#D9A015'},
          500: {value: '#B8860B'},
          600: {value: '#9F7409'},
          700: {value: '#866207'},
          800: {value: '#6D5006'},
          900: {value: '#543E04'},
        },
      },
      fonts: {
        heading: {value: 'Roboto'} ,
        body: {value: 'Roboto'} ,
      },
      // styles: {
      //   global: {
      //     body: {
      //       color: {value: 'gray.800'} ,
      //     },
      //   },
      // },
      // components: {
      //   Button: {
      //     baseStyle: {
      //       cursor: 'pointer',
      //     },
      //   },
      },
    }
  }
);
