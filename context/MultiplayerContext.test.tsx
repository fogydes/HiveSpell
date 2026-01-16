import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MultiplayerProvider, useMultiplayer } from './MultiplayerContext';
import { AuthProvider } from './AuthContext';

// Mock dependencies
vi.mock('../services/multiplayerService', () => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  leaveRoom: vi.fn(),
  subscribeToRoom: vi.fn(() => () => {}),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user' },
    userData: { username: 'Test User' },
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const TestComponent = () => {
  const { loading, error } = useMultiplayer();
  return (
    <div>
      <span data-testid="loading">{loading.toString()}</span>
      <span data-testid="error">{error || 'no error'}</span>
    </div>
  );
};

describe('MultiplayerContext', () => {
  it('renders children and provides initial state', () => {
    // We need to render with the provider
    render(
      <AuthProvider>
        <MultiplayerProvider>
          <TestComponent />
        </MultiplayerProvider>
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('false');
    expect(screen.getByTestId('error').textContent).toBe('no error');
  });
});
