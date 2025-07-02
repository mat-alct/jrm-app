import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

import { Dashboard } from '../components/Dashboard';
import { Header } from '../components/Dashboard/Content/Header';
import { Loader } from '../components/Loader';
import { useAuth } from '../hooks/authContext'; // Importando o novo hook

const Home = () => {
  const { user } = useAuth();
  const router = useRouter();

  // Efeito para proteger a rota
  useEffect(() => {
    // Se o estado de autenticação foi verificado e não há usuário, redireciona
    if (user === null) {
      router.push('/login');
    }
  }, [user, router]);

  // Exibe um loader enquanto a autenticação é verificada para evitar
  // que o conteúdo protegido apareça rapidamente para um usuário deslogado.
  if (!user) {
    return <Loader />;
  }

  return (
    <>
      <Head>
        <title>Início | JRM Compensados</title>
      </Head>
      <Dashboard>
        <Header pageTitle="Início" />
      </Dashboard>
    </>
  );
};

export default Home;
