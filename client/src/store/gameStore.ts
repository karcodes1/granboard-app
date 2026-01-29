import { create } from 'zustand';
import { User } from 'firebase/auth';
import { firebaseService } from '../services/firebase';
import {
  socketService,
  onLobbyState,
  onLobbyList,
  onGameState,
  onAuthSuccess,
  onError,
  onActiveGame,
  onPlayerDisconnected,
  onPlayerReconnected,
  onReconnectError,
} from '../services/socket';
import { bleService, DartHit } from '../services/ble';
import { getAuthErrorMessage } from '../utils/authErrors';
import type { Lobby, GameState, GameType, GameOptions, TeamMode, TeamConfig, UserActiveGame, DisconnectedPlayer } from '../types';

interface GameStore {
  // Auth state
  user: User | null;
  isAuthLoading: boolean;
  serverUserId: string | null;
  serverDisplayName: string | null;

  // Connection state
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;

  // BLE state
  isBleConnected: boolean;
  isBleConnecting: boolean;
  bleDeviceName: string | null;
  lastDartHit: DartHit | null;

  // Lobby state
  currentLobby: Lobby | null;
  availableLobbies: Lobby[];

  // Game state
  gameState: GameState | null;

  // Active game state (for reconnection)
  activeGame: UserActiveGame | null;
  disconnectedPlayers: DisconnectedPlayer[];

  // Error state
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: () => Promise<void>;

  connectToServer: () => Promise<void>;
  disconnectFromServer: () => void;

  connectBle: () => Promise<void>;
  disconnectBle: () => Promise<void>;

  createLobby: (gameType: GameType, options?: GameOptions) => void;
  joinLobby: (lobbyId: string) => void;
  leaveLobby: () => void;
  refreshLobbies: () => void;

  addGuest: (name: string) => void;
  removeGuest: (guestId: string) => void;
  setReady: (ready: boolean) => void;
  updateOptions: (options: Partial<GameOptions>, gameType?: GameType) => void;
  setTeamMode: (teamMode: TeamMode, teamConfig?: TeamConfig) => void;
  assignTeam: (playerId: string, teamId: string) => void;
  setDisplayName: (displayName: string) => void;
  startGame: () => void;

  sendThrow: (multiplier: string, value: number, points: number) => void;
  endTurn: () => void;
  undoThrow: () => void;
  undoRound: () => void;
  requestRematch: () => void;

  // Active game actions
  fetchActiveGame: () => void;
  reconnectToGame: (gameId: string, lobbyId: string) => void;
  leaveGame: () => void;

  clearError: () => void;
}

export const useGameStore = create<GameStore>((set, get) => {
  const socketUnsubscribes: Array<() => void> = [];

  // Set up BLE callbacks
  bleService.onConnectionChange((connected) => {
    set({
      isBleConnected: connected,
      bleDeviceName: connected ? bleService.getDeviceName() : null,
    });
  });

  bleService.onHit((hit) => {
    set({ lastDartHit: hit });
    // Auto-send throw to server if connected and in game
    const { gameState, isConnected } = get();
    if (isConnected && gameState?.state === 'playing') {
      socketService.sendThrow(hit.multiplier, hit.value, hit.points);
    }
  });

  return {
    // Initial state
    user: null,
    isAuthLoading: true,
    serverUserId: null,
    serverDisplayName: null,
    isConnected: false,
    isConnecting: false,
    connectionError: null,
    isBleConnected: false,
    isBleConnecting: false,
    bleDeviceName: null,
    lastDartHit: null,
    currentLobby: null,
    availableLobbies: [],
    gameState: null,
    activeGame: null,
    disconnectedPlayers: [],
    error: null,

    // Initialize app
    initialize: async () => {
      // Set up auth listener
      firebaseService.onAuthStateChanged((user) => {
        set({ user, isAuthLoading: false });
        if (user) {
          // Auto-connect to server when user signs in
          get().connectToServer();
        }
      });

      // Tear down previous listeners
      socketUnsubscribes.forEach((unsubscribe) => unsubscribe());
      socketUnsubscribes.length = 0;

      // Set up socket event listeners
      socketUnsubscribes.push(
        onLobbyState(({ lobby }) => {
          set({ currentLobby: lobby });
        }),
      );

      socketUnsubscribes.push(
        onLobbyList(({ lobbies }) => {
          set({ availableLobbies: lobbies });
        }),
      );

      socketUnsubscribes.push(
        onGameState(({ state }) => {
          set({ gameState: state });
        }),
      );

      socketUnsubscribes.push(
        onAuthSuccess(({ userId, displayName }) => {
          set({ serverUserId: userId, serverDisplayName: displayName });
          socketService.getLobbies();
        }),
      );

      socketUnsubscribes.push(
        onError(({ message }) => {
          set({ error: message });
        }),
      );

      // Active game event listeners
      socketUnsubscribes.push(
        onActiveGame(({ activeGame }) => {
          set({ activeGame });
        }),
      );

      socketUnsubscribes.push(
        onPlayerDisconnected(({ playerId, displayName }) => {
          set((state) => ({
            disconnectedPlayers: [...state.disconnectedPlayers, { playerId, displayName }],
          }));
        }),
      );

      socketUnsubscribes.push(
        onPlayerReconnected(({ playerId }) => {
          set((state) => ({
            disconnectedPlayers: state.disconnectedPlayers.filter(p => p.playerId !== playerId),
          }));
        }),
      );

      socketUnsubscribes.push(
        onReconnectError(({ message }) => {
          set({ error: message, activeGame: null });
        }),
      );
    },

    // Auth actions
    registerWithEmail: async (email, password, displayName) => {
      try {
        await firebaseService.registerWithEmail(email, password, displayName);
      } catch (error) {
        set({ error: getAuthErrorMessage(error) });
      }
    },

    signInWithEmail: async (email, password) => {
      try {
        await firebaseService.signInWithEmail(email, password);
      } catch (error) {
        set({ error: getAuthErrorMessage(error) });
      }
    },

    signInAnonymously: async () => {
      try {
        await firebaseService.signInAnonymously();
      } catch (error) {
        set({ error: getAuthErrorMessage(error) });
      }
    },

    signOut: async () => {
      try {
        socketService.disconnect();
        await firebaseService.signOut();
        set({
          user: null,
          serverUserId: null,
          serverDisplayName: null,
          isConnected: false,
          currentLobby: null,
          gameState: null,
        });
      } catch (error) {
        set({ error: (error as Error).message });
      }
    },

    // Server connection
    connectToServer: async () => {
      const { isConnecting, isConnected } = get();
      if (isConnecting || isConnected) return;

      set({ isConnecting: true, connectionError: null });
      try {
        await socketService.connect();
        set({ isConnected: true, isConnecting: false });
      } catch (error) {
        set({
          isConnected: false,
          isConnecting: false,
          connectionError: (error as Error).message,
        });
      }
    },

    disconnectFromServer: () => {
      socketService.disconnect();
      set({
        isConnected: false,
        currentLobby: null,
        gameState: null,
      });
    },

    // BLE actions
    connectBle: async () => {
      set({ isBleConnecting: true });
      try {
        await bleService.connect();
        set({ isBleConnecting: false });
      } catch (error) {
        set({ isBleConnecting: false, error: (error as Error).message });
      }
    },

    disconnectBle: async () => {
      await bleService.disconnect();
    },

    // Lobby actions
    createLobby: (gameType, options) => {
      socketService.createLobby(gameType, options);
    },

    joinLobby: (lobbyId) => {
      socketService.joinLobby(lobbyId);
    },

    leaveLobby: () => {
      socketService.leaveLobby();
      set({ currentLobby: null, gameState: null });
    },

    refreshLobbies: () => {
      socketService.getLobbies();
    },

    addGuest: (name) => {
      socketService.addGuestPlayer(name);
    },

    removeGuest: (guestId) => {
      socketService.removeGuestPlayer(guestId);
    },

    setReady: (ready) => {
      socketService.setReady(ready);
    },

    updateOptions: (options, gameType) => {
      socketService.updateLobbyOptions(options, gameType);
    },

    setTeamMode: (teamMode, teamConfig) => {
      socketService.setTeamMode(teamMode, teamConfig);
    },

    assignTeam: (playerId, teamId) => {
      socketService.assignTeam(playerId, teamId);
    },

    setDisplayName: (displayName) => {
      socketService.setDisplayName(displayName);
    },

    startGame: () => {
      socketService.startGame();
    },

    // Game actions
    sendThrow: (multiplier, value, points) => {
      socketService.sendThrow(multiplier, value, points);
    },

    endTurn: () => {
      socketService.endTurn();
    },

    undoThrow: () => {
      socketService.undoThrow();
    },

    undoRound: () => {
      socketService.undoRound();
    },

    requestRematch: () => {
      socketService.requestRematch();
    },

    // Active game actions
    fetchActiveGame: () => {
      socketService.getActiveGame();
    },

    reconnectToGame: (gameId, lobbyId) => {
      socketService.reconnectGame(gameId, lobbyId);
    },

    leaveGame: () => {
      socketService.leaveGame();
      set({ currentLobby: null, gameState: null, activeGame: null, disconnectedPlayers: [] });
    },

    clearError: () => {
      set({ error: null });
    },
  };
});
