import { Box, Text } from '@sparrowengg/twigs-react';

export const Loading = () => {
  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
        gap: '$lg',
      }}
    >
      {/* Spinner */}
      <Box
        css={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(0, 130, 141, 0.2)',
          borderTop: '4px solid var(--ss-primary)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <Text
        css={{
          color: '$neutral600',
          fontSize: '$lg',
          fontWeight: '500',
          background: 'linear-gradient(135deg, var(--ss-primary) 0%, var(--ss-primary-dark) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        Loading...
      </Text>
    </Box>
  );
};



