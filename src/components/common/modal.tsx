import React from "react";
import Modal from "react-modal";
import { Icon } from "@iconify/react";

export function DefaultModal({
  children,
  isOpen,
  onRequestClose,
  style,
}: {
  children: React.ReactNode;
  isOpen: boolean;
  onRequestClose?: () => void;
  style?: {
    overlay?: Record<string, string | number>;
    content?: Record<string, string | number>;
  };
}) {
  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={() => {
        if (onRequestClose) {
          onRequestClose();
        }
      }}
      style={style || {}}
    >
      {children}
    </Modal>
  );
}
