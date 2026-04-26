/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Button,
  CloseButton,
  Dialog,
  Flex,
  Portal,
  Text,
  VStack,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import React from 'react';

type HistoryDialogProps = {
  order: any | null;
  onClose: () => void;
  onSelectVersion: (versionSnapshot: any) => void;
};

const buildVersionSnapshot = (order: any, versionIndex: number) => {
  const edits: any[] = order.edits ?? [];
  if (versionIndex === 0) {
    return {
      ...order,
      cutlist: edits[0]?.previousCutlist ?? order.cutlist,
      orderPrice: edits[0]?.previousOrderPrice ?? order.orderPrice,
      edits: [],
    };
  }
  const nextEdit = edits[versionIndex];
  return {
    ...order,
    cutlist: nextEdit?.previousCutlist ?? order.cutlist,
    orderPrice: nextEdit?.previousOrderPrice ?? order.orderPrice,
    edits: edits.slice(0, versionIndex),
  };
};

export const HistoryDialog: React.FC<HistoryDialogProps> = ({
  order,
  onClose,
  onSelectVersion,
}) => {
  return (
    <Dialog.Root
      open={!!order}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      size="md"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                Histórico do Pedido #{order?.orderCode}
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body pb={6}>
              {order && (
                <VStack gap={2} align="stretch">
                  {(() => {
                    const edits: any[] = order.edits ?? [];
                    const versionCount = edits.length + 1;
                    const items: React.ReactNode[] = [];
                    for (let v = 0; v < versionCount; v++) {
                      const isOriginal = v === 0;
                      const editAtIndex = isOriginal ? null : edits[v - 1];
                      const when = editAtIndex?.editedAt?.seconds
                        ? format(
                            new Date(editAtIndex.editedAt.seconds * 1000),
                            "dd/MM/yyyy 'às' HH:mm",
                          )
                        : null;
                      const diff = editAtIndex?.priceDifference ?? 0;
                      const shouldCharge =
                        !!editAtIndex?.shouldCharge && diff !== 0;
                      items.push(
                        <Button
                          key={v}
                          onClick={() => {
                            const snap = buildVersionSnapshot(order, v);
                            onSelectVersion(snap);
                          }}
                          variant="outline"
                          colorScheme="orange"
                          justifyContent="flex-start"
                          height="auto"
                          py={3}
                          px={4}
                          whiteSpace="normal"
                          textAlign="left"
                        >
                          <Flex
                            direction="column"
                            align="flex-start"
                            w="100%"
                            gap={0.5}
                          >
                            <Text fontWeight="bold">
                              {isOriginal
                                ? 'Versão Original'
                                : `Edição ${v}`}
                            </Text>
                            {isOriginal ? (
                              <Text fontSize="xs" color="gray.600">
                                Pedido como foi criado inicialmente
                              </Text>
                            ) : (
                              <>
                                <Text fontSize="xs" color="gray.700">
                                  {when ?? 'Data indisponível'}
                                  {editAtIndex?.editedBy
                                    ? ` · por ${editAtIndex.editedBy}`
                                    : ''}
                                </Text>
                                {diff !== 0 && (
                                  <Text
                                    fontSize="xs"
                                    color={
                                      diff > 0 ? 'red.600' : 'green.600'
                                    }
                                    fontWeight="medium"
                                  >
                                    Diferença: {diff > 0 ? '+' : '−'}R${' '}
                                    {Math.abs(diff)},00
                                    {shouldCharge && ' · acertar'}
                                  </Text>
                                )}
                              </>
                            )}
                          </Flex>
                        </Button>,
                      );
                    }
                    return items;
                  })()}
                  <Text fontSize="xs" color="gray.500" mt={2}>
                    Clique em uma versão para imprimir o resumo
                    correspondente.
                  </Text>
                </VStack>
              )}
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};

export default HistoryDialog;
