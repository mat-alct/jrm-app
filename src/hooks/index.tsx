import { CustomerProvider } from './customer';
import { MaterialProvider } from './material';

export const AuthProvider: React.FC = ({ children }) => {
  return (
    <MaterialProvider>
      <CustomerProvider>{children} </CustomerProvider>
    </MaterialProvider>
  );
};
