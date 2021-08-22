import { MaterialProvider } from './material';

export const AuthProvider: React.FC = ({ children }) => {
  return <MaterialProvider>{children}</MaterialProvider>;
};
