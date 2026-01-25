// Core type definitions for the dart game server

export type PlayerId = string;
export type LobbyId = string;
export type GameId = string;
export type TeamId = string;

// Player types
export type PlayerType = 'authenticated' | 'guest';

export interface Player {
  id: PlayerId;
  type: PlayerType;
  ownerUserId: string; // Firebase UID of client owner
  displayName: string;
  teamId?: TeamId;
}

// Dart throw types
export type DartMultiplier = 'S' | 'D' | 'T' | 'SB' | 'DB' | 'OUT';

export interface DartThrow {
  id: string;
  multiplier: DartMultiplier;
  value: number;
  points: number;
  timestamp: number;
}

// Game types
export type GameType = '501' | '301' | 'cricket' | 'tictactoe';

export interface GameOptions {
  startingScore?: number;
  doubleIn?: boolean;
  doubleOut?: boolean;
  legs?: number;
  sets?: number;
  // Cricket options
  pointsToClose?: number;
  // Tic-tac-toe options
  marksToWin?: number;
}

// Player state within a game
export interface PlayerGameState {
  playerId: PlayerId;
  displayName: string;
  score: number;
  legsWon: number;
  setsWon: number;
  hasDoubledIn: boolean;
  roundThrows: DartThrow[];
  allThrows: DartThrow[];
  stats: PlayerStats;
}

export interface PlayerStats {
  dartsThrown: number;
  totalPoints: number;
  highestRound: number;
  checkouts: number;
  busts: number;
}

// Turn state
export interface TurnState {
  playerId: PlayerId;
  darts: (DartThrow | null)[];
  isBust: boolean;
  roundScore: number;
}

// Game-specific state
export interface CricketState {
  marks: Record<number, Record<PlayerId, number>>; // segment -> player -> marks (0-3)
  closedBy: Record<number, PlayerId | null>; // segment -> who closed it first
  scores: Record<PlayerId, number>; // cricket points
}

export interface TicTacToeState {
  board: {
    owner: PlayerId | null;
    hits: Record<PlayerId, number>;
  }[][];
  segments: number[]; // which segments map to which squares
  winner: PlayerId | null;
}

export type GameSpecificState = CricketState | TicTacToeState | Record<string, unknown>;

// Main game state
export interface GameState {
  version: number;
  gameId: GameId;
  gameType: GameType;
  options: GameOptions;
  
  currentPlayerId: PlayerId;
  currentPlayerIndex: number;
  
  turn: TurnState;
  
  players: Record<PlayerId, PlayerGameState>;
  playerOrder: PlayerId[];
  
  currentRound: number;
  currentLeg: number;
  currentSet: number;
  
  state: 'waiting' | 'playing' | 'paused' | 'finished';
  winnerId?: PlayerId;
  
  gameSpecific: GameSpecificState;
  
  createdAt: number;
  updatedAt: number;
}

// Lobby types
export type LobbyStatus = 'waiting' | 'started' | 'finished';

export interface LobbyPlayer extends Player {
  isReady: boolean;
  joinedAt: number;
}

export interface Lobby {
  lobbyId: LobbyId;
  ownerUserId: string;
  ownerDisplayName: string;
  players: LobbyPlayer[];
  teams: Record<TeamId, PlayerId[]>;
  gameType: GameType;
  gameOptions: GameOptions;
  status: LobbyStatus;
  maxPlayers: number;
  createdAt: number;
  updatedAt: number;
  gameId?: GameId;
}

// Event types for game state changes
export type GameEventType =
  | 'THROW'
  | 'UNDO_THROW'
  | 'UNDO_ROUND'
  | 'END_TURN'
  | 'BUST'
  | 'CHECKOUT'
  | 'LEG_WON'
  | 'SET_WON'
  | 'GAME_OVER';

export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  version: number;
  playerId: PlayerId;
  data?: Record<string, unknown>;
}

// WebSocket message types
export type ClientMessageType =
  | 'AUTH'
  | 'SET_NICKNAME'
  | 'CREATE_LOBBY'
  | 'JOIN_LOBBY'
  | 'LEAVE_LOBBY'
  | 'ADD_GUEST_PLAYER'
  | 'REMOVE_GUEST_PLAYER'
  | 'SET_GUEST_PLAYER_NICKNAME'
  | 'SET_READY'
  | 'UPDATE_LOBBY_OPTIONS'
  | 'START_GAME'
  | 'THROW'
  | 'UNDO_REQUEST'
  | 'END_TURN'
  | 'LEAVE_GAME';

export type ServerMessageType =
  | 'AUTH_SUCCESS'
  | 'AUTH_ERROR'
  | 'LOBBY_STATE'
  | 'LOBBY_LIST'
  | 'LOBBY_ERROR'
  | 'GAME_STATE'
  | 'GAME_ERROR'
  | 'AGORA_TOKEN'
  | 'ERROR'
  | 'PLAYER_JOINED'
  | 'PLAYER_LEFT';

export interface ClientMessage {
  type: ClientMessageType;
  payload?: Record<string, unknown>;
}

export interface ServerMessage {
  type: ServerMessageType;
  payload?: Record<string, unknown>;
}

// Client session
export interface ClientSession {
  socketId: string;
  userId: string;
  displayName: string;
  currentLobbyId?: LobbyId;
  currentGameId?: GameId;
  guestPlayers: Player[];
}

// Agora
export interface AgoraTokenRequest {
  channelName: string;
  uid?: number;
  role?: 'publisher' | 'subscriber';
}

export interface AgoraTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  expireTime: number;
}
