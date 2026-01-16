import { Alert, AlertDescription } from '@sparrowengg/twigs-react';

interface SuccessMessageProps {
  message: string | null | undefined;
  onClose?: () => void;
}

export const SuccessMessage = ({ message, onClose }: SuccessMessageProps) => {
  if (!message) return null;

  return (
    <Alert
      status="success"
      closable={!!onClose}
      onClose={onClose}
      css={{
        marginBottom: '$md',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
};

