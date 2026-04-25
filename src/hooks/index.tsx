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
        <MaterialProvider>{children}</MaterialProvider>
      </OrderProvider>
    </SidebarDrawerProvider>
  );
};
