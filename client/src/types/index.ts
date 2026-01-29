// Shared types between client and server

export type PlayerId = string;
export type LobbyId = string;
export type GameId = string;
export type TeamId = string;

// Team mode types
export type TeamMode = 'ffa' | 'teams';
export type TeamConfig = '2v2' | '2v2v2' | '2v2v2v2' | '3v3' | '4v4';

// Player colors for visual identification
export const PLAYER_COLORS = [
  { id: 'red', name: 'Red', bg: 'bg-red-600', text: 'text-red-400', border: 'border-red-500', hex: '#dc2626' },
  { id: 'blue', name: 'Blue', bg: 'bg-blue-600', text: 'text-blue-400', border: 'border-blue-500', hex: '#2563eb' },
  { id: 'green', name: 'Green', bg: 'bg-green-600', text: 'text-green-400', border: 'border-green-500', hex: '#16a34a' },
  { id: 'yellow', name: 'Yellow', bg: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500', hex: '#eab308' },
  { id: 'purple', name: 'Purple', bg: 'bg-purple-600', text: 'text-purple-400', border: 'border-purple-500', hex: '#9333ea' },
  { id: 'orange', name: 'Orange', bg: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500', hex: '#f97316' },
  { id: 'pink', name: 'Pink', bg: 'bg-pink-500', text: 'text-pink-400', border: 'border-pink-500', hex: '#ec4899' },
  { id: 'cyan', name: 'Cyan', bg: 'bg-cyan-500', text: 'text-cyan-400', border: 'border-cyan-500', hex: '#06b6d4' },
] as const;

export type PlayerColorId = typeof PLAYER_COLORS[number]['id'];

// Team definitions with colors
export interface Team {
  id: TeamId;
  name: string;
  colorId: PlayerColorId;
  playerIds: PlayerId[];
}

export type PlayerType = 'authenticated' | 'guest';
export type GameType = '501' | '301' | 'cricket' | 'tictactoe';
export type DartMultiplier = 'S' | 'D' | 'T' | 'SB' | 'DB' | 'OUT';

export interface Player {
  id: PlayerId;
  type: PlayerType;
  ownerUserId: string;
  displayName: string;
  teamId?: TeamId;
  colorIndex?: number; // Index into PLAYER_COLORS for FFA mode
}

export interface DartThrow {
  id: string;
  multiplier: DartMultiplier;
  value: number;
  points: number;
  timestamp: number;
}

export interface GameOptions {
  startingScore?: number;
  doubleIn?: boolean;
  doubleOut?: boolean;
  legs?: number;
  sets?: number;
  pointsToClose?: number;
  marksToWin?: number;
}

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

export interface TurnState {
  playerId: PlayerId;
  darts: (DartThrow | null)[];
  isBust: boolean;
  roundScore: number;
}

export interface CricketState {
  marks: Record<number, Record<PlayerId, number>>;
  closedBy: Record<number, PlayerId | null>;
  scores: Record<PlayerId, number>;
}

export interface TicTacToeState {
  board: {
    owner: PlayerId | null;
    hits: Record<PlayerId, number>;
  }[][];
  segments: number[];
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
  status: 'waiting' | 'started' | 'finished';
  maxPlayers: number;
  createdAt: number;
  updatedAt: number;
  gameId?: GameId;
}

export interface AgoraTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  expireTime: number;
}

// BLE types
export interface DartHit {
  multiplier: string;
  value: number;
  points: number;
  timestamp: number;
}
