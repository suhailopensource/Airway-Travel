import { useNavigate } from 'react-router-dom';
import { Button } from '@sparrowengg/twigs-react';
import '../styles/ui-components.css';

interface BackButtonProps {
  to?: string;
  label?: string;
  onClick?: () => void;
}

export const BackButton = ({ to, label = 'Back', onClick }: BackButtonProps) => {
  const navigate = useNavigate();

  const handleClick = (): void => {
    if (onClick) {
      onClick();
    } else if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="back-button-container">
      <Button
        variant="ghost"
        onClick={handleClick}
        css={{
          background: 'transparent',
          color: 'var(--ss-primary)',
          border: 'none',
          padding: '0.5rem 1rem',
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          '&:hover': {
            background: 'var(--ss-primary-lighter)',
            transform: 'translateX(-4px)',
          },
          '&:focus-visible': {
            outline: '2px solid var(--ss-primary)',
            outlineOffset: '2px',
          },
        }}
      >
        ← {label}
      </Button>
    </div>
  );
};

