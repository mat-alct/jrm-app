// src/hooks/AuthContext.tsx

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from 'firebase/auth';
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

// Importamos a instância 'auth' do nosso novo arquivo de serviço
import { auth } from '../services/firebase';

// Interface que define o que nosso contexto fornecerá
export interface AuthContextData {
  user: User | null | undefined; // undefined = carregando, null = deslogado, User = logado
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export class ServerSessionError extends Error {
  constructor() {
    super('Nao foi possivel iniciar a sessao. Tente novamente.');
    this.name = 'ServerSessionError';
  }
}

async function createServerSession(user: User): Promise<void> {
  const token = await user.getIdToken();
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });

  if (!response.ok) {
    throw new ServerSessionError();
  }
}

// Exportado para que os testes possam prover um valor controlado sem mockar o hook.
export const AuthContext = createContext<AuthContextData>(
  {} as AuthContextData,
);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const pendingSession = React.useRef<{
    uid: string;
    promise: Promise<void>;
  } | null>(null);

  const ensureServerSession = React.useCallback((currentUser: User) => {
    if (pendingSession.current?.uid === currentUser.uid) {
      return pendingSession.current.promise;
    }

    const promise = createServerSession(currentUser).finally(() => {
      if (pendingSession.current?.promise === promise) {
        pendingSession.current = null;
      }
    });
    pendingSession.current = { uid: currentUser.uid, promise };
    return promise;
  }, []);

  // Função de login que será usada na página de login
  const signIn = async (email: string, password: string) => {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

    try {
      await ensureServerSession(userCredential.user);
    } catch (error) {
      await firebaseSignOut(auth);
      throw error;
    }
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
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      if (!currentUser) {
        setUser(null);
        return;
      }

      // O Firebase restaura o usuario via IndexedDB, mas o cookie HTTP-only pode
      // ter expirado ou nunca ter sido criado. Renova-o antes de liberar o app.
      setUser(undefined);
      void ensureServerSession(currentUser)
        .then(() => setUser(currentUser))
        .catch(async () => {
          await firebaseSignOut(auth);
          setUser(null);
        });
    });

    // Desliga o monitoramento ao sair do componente para evitar vazamento de memória
    return () => unsubscribe();
  }, [ensureServerSession]);

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
