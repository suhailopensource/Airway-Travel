import { Alert, AlertDescription } from '@sparrowengg/twigs-react';

export const ErrorMessage = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <Alert
      status="error"
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

