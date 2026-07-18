import { Box, Button, Text, Textarea } from '@chakra-ui/react';
import React from 'react';

import { AppCard } from '@/components/ui/card';
import {
  NotificationActor,
  useRequestMoreInformation,
} from '@/services/projects/notification.service';

import { toaster } from '../ui/toaster';

interface RequestMoreInfoPanelProps {
  projectId: string;
  itemId: string;
  itemName: string;
  actor: NotificationActor;
}

export const RequestMoreInfoPanel: React.FC<RequestMoreInfoPanelProps> = ({
  projectId,
  itemId,
  itemName,
  actor,
}) => {
  const [message, setMessage] = React.useState('');
  const requestMoreInfo = useRequestMoreInformation();

  const handleSubmit = async () => {
    try {
      await requestMoreInfo.mutateAsync({
        projectId,
        itemId,
        itemName,
        message,
        actor,
      });
      setMessage('');
      toaster.create({
        type: 'success',
        description: 'Pedido de informações enviado ao vendedor.',
      });
    } catch (error) {
      toaster.create({
        type: 'error',
        description:
          error instanceof Error
            ? error.message
            : 'Erro ao pedir mais informações.',
      });
    }
  };

  return (
    <AppCard>
      <Box display="flex" flexDirection="column" gap={3}>
        <Text fontSize="sm" fontWeight="500" color="app.textSecondary">
          Pedir mais informações ao vendedor
        </Text>
        <Textarea
          placeholder="O que falta para você conseguir desenhar este item?"
          value={message}
          onChange={e => setMessage(e.target.value)}
          bg="app.surface"
          borderColor="app.borderStrong"
          rounded="lg"
          _focusVisible={{
            borderColor: 'app.accent',
            shadow: 'focus',
            outline: 'none',
          }}
        />
        <Button
          alignSelf="flex-start"
          loading={requestMoreInfo.isPending}
          variant="outline"
          colorPalette="orange"
          onClick={() => void handleSubmit()}
        >
          Pedir mais informações
        </Button>
      </Box>
    </AppCard>
  );
};
