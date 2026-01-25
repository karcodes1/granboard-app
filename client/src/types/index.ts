// Shared types between client and server

export type PlayerId = string;
export type LobbyId = string;
export type GameId = string;
export type TeamId = string;

export type PlayerType = 'authenticated' | 'guest';
export type GameType = '501' | '301' | 'cricket' | 'tictactoe';
export type DartMultiplier = 'S' | 'D' | 'T' | 'SB' | 'DB' | 'OUT';

export interface Player {
  id: PlayerId;
  type: PlayerType;
  ownerUserId: string;
  displayName: string;
  teamId?: TeamId;
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
