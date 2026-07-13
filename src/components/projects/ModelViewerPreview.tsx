import { Box, Button, Text } from '@chakra-ui/react';
import React from 'react';

interface ModelViewerPreviewProps {
  src: string;
  fileName: string;
  compact?: boolean;
}

export function ModelViewerPreview({
  src,
  fileName,
  compact = false,
}: ModelViewerPreviewProps) {
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    import('@google/model-viewer')
      .then(() => {
        if (mounted) setCanRender(true);
      })
      .catch(() => {
        if (mounted) setCanRender(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <Box
      borderWidth="1px"
      borderColor="gray.200"
      borderRadius="md"
      overflow="hidden"
      bg="gray.50"
    >
      <Box
        h={compact ? '220px' : { base: '280px', md: '420px' }}
        minH={compact ? '220px' : '280px'}
      >
        {canRender ? (
          React.createElement('model-viewer', {
            src,
            alt: `Modelo 3D - ${fileName}`,
            'camera-controls': true,
            'auto-rotate': true,
            ar: true,
            exposure: '0.9',
            'shadow-intensity': '0.8',
            style: {
              width: '100%',
              height: '100%',
              backgroundColor: '#f7fafc',
            },
          })
        ) : (
          <Box
            alignItems="center"
            display="flex"
            h="100%"
            justifyContent="center"
            p={4}
            textAlign="center"
          >
            <Text color="gray.600" fontSize="sm">
              Carregando visualizador 3D...
            </Text>
          </Box>
        )}
      </Box>
      <Box
        alignItems={{ base: 'stretch', sm: 'center' }}
        bg="white"
        borderTopWidth="1px"
        borderTopColor="gray.200"
        display="flex"
        flexDirection={{ base: 'column', sm: 'row' }}
        gap={2}
        justifyContent="space-between"
        p={3}
      >
        <Text fontSize="sm" fontWeight="semibold" truncate>
          {fileName}
        </Text>
        <Button asChild size="xs" variant="outline">
          <a href={src} target="_blank" rel="noreferrer">
            Baixar modelo
          </a>
        </Button>
      </Box>
    </Box>
  );
}
