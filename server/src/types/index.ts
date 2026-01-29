// Core type definitions for the dart game server

export type PlayerId = string;
export type LobbyId = string;
export type GameId = string;
export type TeamId = string;

// Team mode types
export type TeamMode = 'ffa' | 'teams';
export type TeamConfig = '2v2' | '2v2v2' | '2v2v2v2' | '3v3' | '4v4';

// Player colors for visual identification
export const PLAYER_COLORS = [
  { id: 'red', name: 'Red', bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500' },
  { id: 'blue', name: 'Blue', bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500' },
  { id: 'green', name: 'Green', bg: 'bg-green-600', text: 'text-green-400', border: 'border-green-500' },
  { id: 'yellow', name: 'Yellow', bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500' },
  { id: 'orange', name: 'Orange', bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500' },
  { id: 'pink', name: 'Pink', bg: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-500' },
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500' },
] as const;

export type PlayerColorId = typeof PLAYER_COLORS[number]['id'];

// Team definitions with colors
export interface Team {
  id: TeamId;
  name: string;
  colorId: PlayerColorId;
  playerIds: PlayerId[];
}

// Player types
export type PlayerType = 'authenticated' | 'guest';

export interface Player {
  id: PlayerId;
  type: PlayerType;
  ownerUserId: string; // Firebase UID of client owner
  displayName: string;
  teamId?: TeamId;
  colorIndex?: number; // Index into PLAYER_COLORS for FFA mode
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
export type GameType = '501' | '301' | 'gotcha' | 'cricket' | 'tictactoe';

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
  teamId?: TeamId;
  colorIndex?: number;
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

// Team game state (for team mode)
export interface TeamGameState {
  teamId: TeamId;
  name: string;
  colorId: string;
  playerIds: PlayerId[];
  score: number;
  legsWon: number;
  setsWon: number;
  hasDoubledIn: boolean;
  currentPlayerIndex: number; // Which player in the team is currently throwing
}

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
  
  // Team mode fields
  teamMode: TeamMode;
  teams?: TeamGameState[];
  teamOrder?: TeamId[];
  currentTeamIndex?: number;
  
  currentRound: number;
  currentLeg: number;
  currentSet: number;
  
  state: 'waiting' | 'playing' | 'paused' | 'finished';
  winnerId?: PlayerId;
  winnerTeamId?: TeamId;
  
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
  teamMode: TeamMode;
  teamConfig?: TeamConfig;
  teams: Team[];
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
  | 'GOTCHA'
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

// Active game session for persistence (stored in Firestore)
export interface ActiveGameSession {
  gameId: GameId;
  lobbyId: LobbyId;
  gameType: GameType;
  connectedUserIds: string[]; // Firebase UIDs of connected clients
  disconnectedUserIds: string[]; // Users who have disconnected but can reconnect
  playerDisplayNames: Record<string, string>; // userId -> displayName
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'paused' | 'finished';
}

// User's active game reference (stored in users collection)
export interface UserActiveGame {
  gameId: GameId;
  lobbyId: LobbyId;
  gameType: GameType;
  joinedAt: number;
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
