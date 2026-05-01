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
import { FaTrash } from 'react-icons/fa';

type ConfirmDeactivateDialogProps = {
  order: any | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
  loading: boolean;
};

export const ConfirmDeactivateDialog: React.FC<ConfirmDeactivateDialogProps> = ({
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
              <Dialog.Title>Desativar pedido</Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={4}>
              {order && (
                <Stack gap={3}>
                  <Text color="gray.700">
                    Tem certeza que deseja{' '}
                    <Text as="span" fontWeight="bold">
                      desativar
                    </Text>{' '}
                    este pedido? Ele deixará de aparecer na lista, mas continuará
                    acessível pela busca.
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
                </Stack>
              )}
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
                  colorScheme="red"
                  size={['lg', 'lg', 'md']}
                  loading={loading}
                  onClick={() => order && onConfirm(order.id)}
                  w={['100%', '100%', 'auto']}
                >
                  <FaTrash /> Desativar
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

export default ConfirmDeactivateDialog;
