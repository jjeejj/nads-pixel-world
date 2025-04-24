import React, { useEffect } from 'react';
import styled from 'styled-components';

// Toast样式组件
const ToastContainer = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  width: 100%;
  max-width: 320px;
  display: flex;
  justify-content: center;
`;

const ToastContent = styled.div`
  display: flex;
  align-items: center;
  padding: 14px 18px;
  background-color: ${props => props.type === "error" ? "rgba(231, 76, 60, 0.9)" : "rgba(52, 152, 219, 0.9)"};
  color: white;
  border-radius: 15px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideDown 0.3s ease-out forwards;
  width: 100%;
  backdrop-filter: blur(5px);
  border: 1px solid ${props => props.type === "error" ? "rgba(231, 76, 60, 0.6)" : "rgba(52, 152, 219, 0.6)"};

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ToastIcon = styled.div`
  margin-right: 10px;
  font-size: 20px;
`;

const ToastMessage = styled.div`
  flex: 1;
  font-size: 14px;
  font-weight: 500;
`;

const ToastCloseButton = styled.button`
  background-color: rgba(255, 255, 255, 0.25);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: 10px;

  &:hover {
    background-color: rgba(255, 255, 255, 0.35);
  }
`;

// Toast组件
const Toast = ({ message, isVisible, onClose, type = "info" }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <ToastContainer>
      <ToastContent type={type}>
        <ToastIcon>{type === "error" ? "⚠️" : "ℹ️"}</ToastIcon>
        <ToastMessage>{message}</ToastMessage>
        <ToastCloseButton onClick={onClose}>OK</ToastCloseButton>
      </ToastContent>
    </ToastContainer>
  );
};

export default Toast;