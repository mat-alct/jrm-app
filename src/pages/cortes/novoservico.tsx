// --- Bloco de Importações ---
// Importa componentes de UI da biblioteca Chakra UI para criar a interface.
import { HStack, RadioGroup } from '@chakra-ui/react';
// Importa o componente Head do Next.js para modificar o <head> do HTML (ex: título da página).
import Head from 'next/head';
// Importa o hook useRouter do Next.js para acessar informações da rota e navegar entre páginas.
import { useRouter } from 'next/router';
// Importa hooks essenciais do React para gerenciar estado e efeitos colaterais.
import React, { useCallback, useEffect, useState } from 'react';

// --- Bloco de Importações Internas do Projeto ---
// Importa componentes de layout customizados do seu projeto.
import { Dashboard } from '../../components/Dashboard';
import { Header } from '../../components/Dashboard/Content/Header';
import { Loader } from '../../components/Loader';
// Importa os componentes que formam a página de novo serviço.
import { Cutlist } from '../../components/NewOrder/Cutlist';
import { OrderData } from '../../components/NewOrder/OrderData';
// Importa o tipo 'CutlistType' para garantir a segurança de tipos dos dados.
import { Cutlist as CutlistType } from '../../types';
// Importa o hook de autenticação customizado para verificar o status do usuário.
import { useAuth } from '../../hooks/authContext';

// --- Componente Principal: NovoServiço ---
// Esta é a página principal para a criação de um novo serviço ou orçamento.
const NovoServiço = () => {
  // --- Bloco de Hooks e Estados Iniciais ---

  // Lógica de autenticação: obtém o objeto 'user' do nosso contexto.
  const { user } = useAuth();
  // Obtém a instância do router para navegação e acesso a parâmetros da URL.
  const router = useRouter();

  // Efeito para proteger a rota. Ele roda sempre que o estado 'user' ou 'router' muda.
  useEffect(() => {
    // Se a verificação de autenticação terminou e o resultado é 'null', significa que o usuário não está logado.
    if (user === null) {
      // Redireciona o usuário para a página de login.
      router.push('/login');
    }
  }, [user, router]); // A lista de dependências garante que o efeito só rode quando necessário.

  // Estado para armazenar a lista de peças do plano de corte.
  const [cutlist, setCutlist] = useState<CutlistType[]>([]);

  // Extrai o objeto 'query' do router, que contém os parâmetros da URL (ex: ?id=123).
  const { query } = router;

  // Função para atualizar a lista de peças (cutlist).
  // 'useCallback' é usado para otimizar a performance, garantindo que a função não seja recriada a cada renderização.
  const updateCutlist = useCallback(
    (cutlistData: CutlistType[], maintainOldValues = true) => {
      // Se for para manter os valores antigos, adiciona os novos dados à lista existente.
      if (maintainOldValues) {
        setCutlist(prevValue => {
          const newList = [...prevValue, ...cutlistData];
          // Salva a nova lista no localStorage do navegador para persistir os dados.
          localStorage.setItem(
            'app@jrmcompensados:cutlist',
            JSON.stringify(newList),
          );
          return newList;
        });
      } else {
        // Se não for para manter, substitui a lista inteira pelos novos dados.
        setCutlist([...cutlistData]);
        localStorage.setItem(
          'app@jrmcompensados:cutlist',
          JSON.stringify([...cutlistData]),
        );
      }
    },
    [], // O array vazio indica que esta função não depende de nenhuma prop ou estado externo.
  );

  // Efeito para carregar os dados iniciais do plano de corte.
  // Roda sempre que o parâmetro 'cutlist' na URL muda.
  useEffect(() => {
    // Verifica se a URL contém um parâmetro 'cutlist' (ex: ao editar um orçamento).
    if (query.cutlist && typeof query.cutlist === 'string') {
      // Se sim, usa os dados da URL para popular o estado e o localStorage.
      const cutlistFromQuery = JSON.parse(query.cutlist);
      setCutlist(cutlistFromQuery);
      localStorage.setItem('app@jrmcompensados:cutlist', query.cutlist);
      // 'return' encerra a execução do efeito aqui.
      return;
    }

    // Se não houver dados na URL, tenta carregar do localStorage.
    const cutlistFromStorage = localStorage.getItem(
      'app@jrmcompensados:cutlist',
    );

    // Se encontrar dados no localStorage, usa-os para popular o estado.
    if (cutlistFromStorage) {
      setCutlist(JSON.parse(cutlistFromStorage));
    }
  }, [query.cutlist]); // Depende do parâmetro 'cutlist' da URL.

  // Estado para controlar se a tela está no modo "Serviço" ou "Orçamento".
  const [orderType, setOrderType] = useState<string>('Serviço');

  // Estado para armazenar o ID de um orçamento que está sendo convertido em pedido.
  // A função inicializadora só roda uma vez, na primeira renderização.
  const [estimateId] = useState<string | undefined>(() => {
    if (query.estimateId && typeof query.estimateId === 'string') {
      return query.estimateId;
    }
    return undefined;
  });

  // Bairro pré-preenchido vindo do orçamento (se existia).
  const [prefillArea] = useState<string | undefined>(() => {
    if (query.area && typeof query.area === 'string') {
      return query.area;
    }
    return undefined;
  });

  // Bairro corrente do form, espelhado pelo OrderData via callback,
  // para que o Cutlist exiba o frete junto com o total.
  const [currentArea, setCurrentArea] = useState<string | undefined>(
    prefillArea,
  );

  const [currentDeliveryType, setCurrentDeliveryType] = useState<
    string | undefined
  >(undefined);

  // --- Bloco de Renderização ---

  // Se o estado 'user' for indefinido, significa que a verificação de autenticação ainda está em andamento.
  // Exibe um componente de 'Loader' para o usuário.
  if (!user) {
    return <Loader />;
  }

  // Se o usuário estiver autenticado, renderiza o conteúdo da página.
  return (
    <>
      {/* Define o título da aba do navegador. */}
      <Head>
        <title>Novo Serviço | JRM Compensados</title>
      </Head>
      {/* Componente de layout principal que inclui a sidebar. */}
      <Dashboard>
        {/* Cabeçalho da página, com título dinâmico e botões de ação. */}
        <Header
          pageTitle={`Novo ${
            orderType === 'Orçamento' ? 'Orçamento' : 'Serviço'
          }`}
        >
          {/* Componente para selecionar entre "Pedido" e "Orçamento". */}
          <RadioGroup.Root
            colorScheme="orange"
            value={orderType}
            onValueChange={e => {
              if (e.value) {
                setOrderType(e.value);
              }
            }}
            ml={[1, 1, 5]}
          >
            <HStack gap="3">
              <RadioGroup.Item value="Serviço">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Pedido</RadioGroup.ItemText>
              </RadioGroup.Item>
              <RadioGroup.Item value="Orçamento">
                <RadioGroup.ItemHiddenInput />
                <RadioGroup.ItemIndicator />
                <RadioGroup.ItemText>Orçamento</RadioGroup.ItemText>
              </RadioGroup.Item>
            </HStack>
          </RadioGroup.Root>
        </Header>

        {/* Componente para gerenciar o plano de corte (adicionar/remover peças). */}
        <Cutlist
          cutlist={cutlist}
          updateCutlist={updateCutlist}
          selectedArea={currentArea}
          deliveryType={currentDeliveryType}
        />

        {/* Componente para preencher os dados do cliente e do pedido. */}
        <OrderData
          orderType={orderType}
          cutlist={cutlist}
          estimateId={estimateId}
          prefillArea={prefillArea}
          onAreaChange={setCurrentArea}
          onDeliveryTypeChange={setCurrentDeliveryType}
        />
      </Dashboard>
    </>
  );
};

// Exporta o componente para ser usado como uma página pelo Next.js.
export default NovoServiço;
