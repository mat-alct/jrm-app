import { CustomerProvider } from './customer';
import { MaterialProvider } from './material';
import { OrderProvider } from './order';

export const AuthProvider: React.FC = ({ children }) => {
  return (
    <OrderProvider>
      <MaterialProvider>
        <CustomerProvider>{children} </CustomerProvider>
      </MaterialProvider>
    </OrderProvider>
  );
};
