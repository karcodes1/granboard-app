import { io, Socket } from 'socket.io-client';
import { firebaseService } from './firebase';
import type { Lobby, GameState, GameType, GameOptions, AgoraTokenResponse } from '../types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

type EventCallback<T> = (data: T) => void;

class SocketService {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, Set<EventCallback<unknown>>> = new Map();

  // Connect to server
  async connect(): Promise<void> {
    if (this.socket?.connected) return;

    this.socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    // Set up event listeners
    this.socket.on('connect', () => {
      console.log('[Socket] Connected');
      this.authenticate();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error);
    });

    // Server event handlers
    const serverEvents = [
      'AUTH_SUCCESS',
      'AUTH_ERROR',
      'LOBBY_STATE',
      'LOBBY_LIST',
      'LOBBY_ERROR',
      'GAME_STATE',
      'GAME_ERROR',
      'AGORA_TOKEN',
      'ERROR',
      'PLAYER_JOINED',
      'PLAYER_LEFT',
    ];

    for (const event of serverEvents) {
      this.socket.on(event, (data: unknown) => {
        this.emit(event, data);
      });
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.socket!.once('connect', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.socket!.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  // Authenticate with Firebase token
  private async authenticate(): Promise<void> {
    const idToken = await firebaseService.getIdToken();
    if (idToken && this.socket) {
      this.socket.emit('AUTH', { idToken });
    }
  }

  // Disconnect
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Event subscription
  on<T>(event: string, callback: EventCallback<T>): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(callback as EventCallback<unknown>);

    return () => {
      this.eventHandlers.get(event)?.delete(callback as EventCallback<unknown>);
    };
  }

  private emit(event: string, data: unknown): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(data));
    }
  }

  // Lobby actions
  createLobby(gameType: GameType, options?: GameOptions, maxPlayers?: number): void {
    this.socket?.emit('CREATE_LOBBY', { gameType, options, maxPlayers });
  }

  joinLobby(lobbyId: string): void {
    this.socket?.emit('JOIN_LOBBY', { lobbyId });
  }

  leaveLobby(): void {
    this.socket?.emit('LEAVE_LOBBY');
  }

  getLobbies(): void {
    this.socket?.emit('GET_LOBBIES');
  }

  addGuestPlayer(displayName: string): void {
    this.socket?.emit('ADD_GUEST_PLAYER', { displayName });
  }

  removeGuestPlayer(guestId: string): void {
    this.socket?.emit('REMOVE_GUEST_PLAYER', { guestId });
  }

  setGuestNickname(guestId: string, displayName: string): void {
    this.socket?.emit('SET_GUEST_PLAYER_NICKNAME', { guestId, displayName });
  }

  setReady(isReady: boolean): void {
    this.socket?.emit('SET_READY', { isReady });
  }

  updateLobbyOptions(options: Partial<GameOptions>, gameType?: GameType): void {
    this.socket?.emit('UPDATE_LOBBY_OPTIONS', { options, gameType });
  }

  startGame(): void {
    this.socket?.emit('START_GAME');
  }

  // Game actions
  sendThrow(multiplier: string, value: number, points: number): void {
    this.socket?.emit('THROW', { multiplier, value, points });
  }

  endTurn(): void {
    this.socket?.emit('END_TURN');
  }

  undoThrow(): void {
    this.socket?.emit('UNDO_THROW');
  }

  undoRound(): void {
    this.socket?.emit('UNDO_ROUND');
  }

  requestRematch(): void {
    this.socket?.emit('REQUEST_REMATCH');
  }

  // Agora
  requestAgoraToken(channelName: string, uid?: number): void {
    this.socket?.emit('REQUEST_AGORA_TOKEN', { channelName, uid });
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();

// Type-safe event subscriptions
export function onLobbyState(callback: (data: { lobby: Lobby | null }) => void): () => void {
  return socketService.on('LOBBY_STATE', callback);
}

export function onLobbyList(callback: (data: { lobbies: Lobby[] }) => void): () => void {
  return socketService.on('LOBBY_LIST', callback);
}

export function onGameState(callback: (data: { state: GameState }) => void): () => void {
  return socketService.on('GAME_STATE', callback);
}

export function onAgoraToken(callback: (data: AgoraTokenResponse) => void): () => void {
  return socketService.on('AGORA_TOKEN', callback);
}

export function onAuthSuccess(callback: (data: { userId: string; displayName: string }) => void): () => void {
  return socketService.on('AUTH_SUCCESS', callback);
}

export function onError(callback: (data: { message: string }) => void): () => void {
  return socketService.on('ERROR', callback);
}
