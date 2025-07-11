import { CustomerProvider } from './customer';
import { MaterialProvider } from './material';
import { OrderProvider } from './order';
import { SidebarDrawerProvider } from './sidebar';

type AuthProviderProps = {
  children: React.ReactNode;
};

export const Providers = ({ children }: AuthProviderProps) => {
  return (
    <SidebarDrawerProvider>
      <OrderProvider>
        <MaterialProvider>
          <CustomerProvider>{children}</CustomerProvider>
        </MaterialProvider>
      </OrderProvider>
    </SidebarDrawerProvider>
  );
};
