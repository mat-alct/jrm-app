'use client';

// --- 1. Bloco de Importações Atualizado ---
// Importa o Button para as ações e os novos componentes do Modal e Portal.
import { Button, CloseButton, Dialog, Portal } from '@chakra-ui/react';
// Importa tipos e hooks essenciais do React.
import React, { ReactNode } from 'react';

// --- 2. Interface de Props Atualizada ---
// Define a estrutura das props que o nosso FormModal aceita.
interface FormModalProps {
  title: string;
  isOpen: boolean; // Controla se o modal está visível ou não.
  onClose: () => void; // Função para fechar o modal.
  onSubmit: () => void; // Função a ser executada ao clicar no botão principal.
  children: ReactNode; // Tipagem explícita para os componentes filhos.
}

// --- 3. Componente Atualizado (sem React.FC) ---
// A definição do componente foi simplificada para seguir os padrões modernos.
export const FormModal = ({
  children,
  title,
  isOpen,
  onClose,
  onSubmit,
}: FormModalProps) => {
  return (
    // 4. Nova Estrutura do Modal ---
    // Modal.Root é o componente principal que gerencia o estado do modal.
    // Usamos 'open' e 'onOpenChange' para criar um "modal controlado",
    // onde o estado é gerenciado pelo componente pai (via useDisclosure).
    <Dialog.Root
      open={isOpen}
      onOpenChange={e => {
        // Se o evento for para fechar o modal (ex: clique no overlay, tecla ESC),
        // chamamos a função onClose que recebemos via props.
        if (!e.open) {
          onClose();
        }
      }}
    >
      {/* O Portal garante que o modal seja renderizado no topo da árvore DOM,
          ficando acima de todo o outro conteúdo da página. */}
      <Portal>
        {/* Modal.Backdrop é o fundo escurecido que cobre a página. */}
        <Dialog.Backdrop />
        {/* Modal.Positioner centraliza o conteúdo do modal na tela. */}
        <Dialog.Positioner>
          {/* Modal.Content é o container principal do modal (o card branco). */}
          <Dialog.Content>
            {/* Cabeçalho do modal. */}
            <Dialog.Header>
              <Dialog.Title>{title}</Dialog.Title>
            </Dialog.Header>
            {/* Corpo do modal, onde o formulário ({children}) será renderizado. */}
            <Dialog.Body pb={6}>{children}</Dialog.Body>
            {/* Rodapé do modal, com os botões de ação. */}
            <Dialog.Footer>
              <Button
                colorScheme="orange"
                mr={3}
                // O onClick aqui chama a função de submissão que vem do componente pai.
                // Geralmente, essa função é o resultado de handleSubmit do react-hook-form.
                onClick={onSubmit}
              >
                Salvar {/* Alterado de "Criar" para um termo mais genérico */}
              </Button>
              <Button onClick={onClose}>Cancelar</Button>
            </Dialog.Footer>
            {/* Botão 'X' para fechar o modal, posicionado automaticamente. */}
            <Dialog.CloseTrigger asChild>
              <CloseButton />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
