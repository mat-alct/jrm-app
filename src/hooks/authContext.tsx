// src/hooks/AuthContext.tsx

import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { useRouter } from 'next/router';
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

// Importamos a instância 'auth' do nosso novo arquivo de serviço
import { auth } from '../services/firebase';

// Interface que define o que nosso contexto fornecerá
interface AuthContextData {
  user: User | null | undefined; // undefined = carregando, null = deslogado, User = logado
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const router = useRouter();

  // Função de login que será usada na página de login
  const signIn = async (email: string, password: string) => {
    // Usa a função modular do Firebase v9+
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Função de logout
  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push('/login'); // Redireciona após o logout
  };

  // Efeito que monitora o estado de autenticação em tempo real
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // Quando o estado muda (login/logout), atualizamos nosso estado 'user'
      setUser(currentUser);
    });

    // Desliga o monitoramento ao sair do componente para evitar vazamento de memória
    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook customizado para facilitar o uso do contexto nos componentes
export const useAuth = (): AuthContextData => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }

  return context;
};
