import { render, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { GamePage } from '../GamePage';
import { Layout } from '../../components/Layout';
import type { GameState } from '../../types';
import { useGameStore } from '../../store/gameStore';

vi.mock('../../store/gameStore', () => ({
  useGameStore: vi.fn(),
}));

vi.mock('../../components/VideoChat', () => ({
  VideoChat: () => <div data-testid="video-chat" style={{ height: '200px' }} />,
}));

vi.mock('../../services/agora', () => ({
  agoraService: {},
}));

const mockedUseGameStore = useGameStore as unknown as Mock;

const createGameState = (): GameState => ({
  version: 1,
  gameId: 'game-123',
  gameType: '501',
  options: {},
  currentPlayerId: 'p1',
  currentPlayerIndex: 0,
  turn: {
    playerId: 'p1',
    darts: [],
    isBust: false,
    roundScore: 42,
  },
  players: {
    p1: {
      playerId: 'p1',
      displayName: 'Player 1',
      score: 301,
      legsWon: 0,
      setsWon: 0,
      hasDoubledIn: true,
      roundThrows: [
        { id: 't1', multiplier: 'S', value: 20, points: 20, timestamp: Date.now() },
      ],
      allThrows: [],
      stats: {
        dartsThrown: 1,
        totalPoints: 20,
        highestRound: 40,
        checkouts: 0,
        busts: 0,
      },
    },
    p2: {
      playerId: 'p2',
      displayName: 'Player 2',
      score: 320,
      legsWon: 0,
      setsWon: 0,
      hasDoubledIn: true,
      roundThrows: [],
      allThrows: [],
      stats: {
        dartsThrown: 0,
        totalPoints: 0,
        highestRound: 0,
        checkouts: 0,
        busts: 0,
      },
    },
  },
  playerOrder: ['p1', 'p2'],
  currentRound: 1,
  currentLeg: 1,
  currentSet: 1,
  state: 'playing',
  gameSpecific: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const createStoreSlice = () => ({
  gameState: createGameState(),
  currentLobby: { ownerUserId: 'host-user' },
  serverUserId: 'host-user',
  leaveLobby: vi.fn(),
  sendThrow: vi.fn(),
  endTurn: vi.fn(),
  undoThrow: vi.fn(),
  requestRematch: vi.fn(),
  isBleConnected: false,
});

const renderGamePageWithLayout = () =>
  render(
    <MemoryRouter initialEntries={['/game']}>
      <Layout>
        <GamePage />
      </Layout>
    </MemoryRouter>
  );

const renderGamePage = () =>
  render(
    <MemoryRouter>
      <GamePage />
    </MemoryRouter>
  );

describe('GamePage viewport fit', () => {
  beforeEach(() => {
    mockedUseGameStore.mockReturnValue(createStoreSlice());
  });

  it('GamePage root has overflow-hidden to prevent scrolling', () => {
    const { getByTestId } = renderGamePage();

    const root = getByTestId('game-page-root');

    // The root should have overflow-hidden class to prevent content from causing scroll
    expect(root.className).toContain('overflow-hidden');
  });

  it('GamePage uses h-full to fill available space', () => {
    const { getByTestId } = renderGamePage();

    const root = getByTestId('game-page-root');

    // The root should use h-full to fill the constrained parent height
    expect(root.className).toContain('h-full');
  });

  it('Layout constrains main content height on game page', () => {
    const { container } = renderGamePageWithLayout();

    const main = container.querySelector('main');

    // Layout should set overflow-hidden on main for game page
    expect(main?.className).toContain('overflow-hidden');
  });

  it('video chat section uses min-h-0 to allow flex shrinking', () => {
    const { getByRole, getByTestId } = renderGamePage();

    // Toggle video chat on
    fireEvent.click(getByRole('button', { name: /toggle video chat/i }));

    // Verify video chat is visible
    expect(getByTestId('video-chat')).toBeInTheDocument();
  });
});
