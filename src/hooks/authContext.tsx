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
    // 1. Primeiro, autentica no lado do cliente como você já faz
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    // 2. PEÇA-CHAVE FALTANTE: Pega o ID Token do usuário
    const token = await userCredential.user.getIdToken();

    // 3. Envia o token para a sua API route para criar o cookie de sessão
    await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
  });
};

  const signOut = async () => {
    // 1. PEÇA-CHAVE FALTANTE: Informa o backend para remover o cookie de sessão
    await fetch('/api/logout', {
      method: 'POST',
    });

    // 2. Desloga o usuário no lado do cliente
    await firebaseSignOut(auth);

    // 3. Redireciona (opcional, pode ser mantido aqui ou movido para o componente que chama signOut)
    // router.push('/login'); // O redirecionamento já é feito no componente de login, então pode não ser necessário aqui.
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
