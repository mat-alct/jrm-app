import { CustomerProvider } from './customer';
import { MaterialProvider } from './material';
import { OrderProvider } from './order';
import { SidebarDrawerProvider } from './sidebar';

export const AuthProvider: React.FC = ({ children }) => {
  return (
    <SidebarDrawerProvider>
      <OrderProvider>
        <MaterialProvider>
          <CustomerProvider>{children} </CustomerProvider>
        </MaterialProvider>
      </OrderProvider>
    </SidebarDrawerProvider>
  );
};
