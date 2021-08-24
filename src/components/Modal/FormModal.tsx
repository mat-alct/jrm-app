import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  ModalProps,
} from '@chakra-ui/react';
import React from 'react';

interface FormModalProps extends ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

export const FormModal: React.FC<FormModalProps> = ({
  children,
  title,
  isOpen,
  onClose,
  onSubmit,
  ...rest
}) => {
  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} {...rest}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{title}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>{children}</ModalBody>

          <ModalFooter>
            <Button
              colorScheme="orange"
              mr={3}
              type="submit"
              onClick={onSubmit}
            >
              Criar
            </Button>
            <Button onClick={onClose}>Cancelar</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};
