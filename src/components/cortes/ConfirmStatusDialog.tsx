/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Portal,
  Stack,
  Text,
} from '@chakra-ui/react';
import React from 'react';
import { FaCheck } from 'react-icons/fa';

type ConfirmStatusDialogProps = {
  order: any | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
  loading: boolean;
};

const nextStatusLabel = (status?: string) => {
  if (status === 'Em Produção') return 'Liberar para Transporte';
  if (status === 'Liberado para Transporte') return 'Concluir pedido';
  return null;
};

export const ConfirmStatusDialog: React.FC<ConfirmStatusDialogProps> = ({
  order,
  onCancel,
  onConfirm,
  loading,
}) => {
  return (
    <Dialog.Root
      open={!!order}
      onOpenChange={(e) => {
        if (!e.open && !loading) onCancel();
      }}
      placement="center"
      motionPreset="slide-in-bottom"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner padding={[2, 4]}>
          <Dialog.Content
            mx="auto"
            w={['100%', '100%', 'auto']}
            maxW={['100%', '100%', '420px']}
          >
            <Dialog.Header>
              <Dialog.Title>Confirmar alteração de status</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={4}>
              {order &&
                (() => {
                  const next = nextStatusLabel(order.orderStatus);
                  return (
                    <Stack gap={3}>
                      <Text color="gray.700">
                        Tem certeza que deseja{' '}
                        <Text as="span" fontWeight="bold">
                          {next?.toLowerCase()}
                        </Text>
                        ?
                      </Text>
                      <Box
                        bg="gray.50"
                        borderWidth="1px"
                        borderColor="gray.200"
                        borderRadius="md"
                        p={3}
                      >
                        <Text fontSize="sm" color="gray.500">
                          Pedido #{order.orderCode}
                        </Text>
                        <Text fontWeight="bold" color="gray.800">
                          {order.customer?.name || 'Cliente Removido'}
                        </Text>
                        <Text fontSize="sm" color="gray.600" mt={1}>
                          Status atual: <strong>{order.orderStatus}</strong>
                        </Text>
                      </Box>
                      <Text fontSize="xs" color="gray.500">
                        Esta ação não pode ser desfeita pela tela de listagem.
                      </Text>
                    </Stack>
                  );
                })()}
            </Dialog.Body>
            <Dialog.Footer>
              <Stack
                direction={['column-reverse', 'column-reverse', 'row']}
                w="100%"
                gap={2}
                justify="flex-end"
              >
                <Button
                  variant="outline"
                  colorScheme="gray"
                  size={['lg', 'lg', 'md']}
                  onClick={onCancel}
                  disabled={loading}
                  w={['100%', '100%', 'auto']}
                >
                  Cancelar
                </Button>
                <Button
                  colorScheme="green"
                  size={['lg', 'lg', 'md']}
                  loading={loading}
                  onClick={() => order && onConfirm(order.id)}
                  w={['100%', '100%', 'auto']}
                >
                  <FaCheck /> Confirmar
                </Button>
              </Stack>
            </Dialog.Footer>
            <Dialog.CloseTrigger asChild>
              <CloseButton disabled={loading} />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default ConfirmStatusDialog;
