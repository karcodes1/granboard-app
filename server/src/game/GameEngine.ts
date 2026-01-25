import { v4 as uuidv4 } from 'uuid';
import {
  GameState,
  GameType,
  GameOptions,
  Player,
  PlayerId,
  DartThrow,
  PlayerGameState,
  TurnState,
  GameEvent,
  CricketState,
  TicTacToeState,
} from '../types/index.js';

// Default game options
const DEFAULT_OPTIONS: Record<GameType, GameOptions> = {
  '501': { startingScore: 501, doubleIn: false, doubleOut: true, legs: 1, sets: 1 },
  '301': { startingScore: 301, doubleIn: false, doubleOut: true, legs: 1, sets: 1 },
  'cricket': { pointsToClose: 3 },
  'tictactoe': { marksToWin: 4 },
};

// Cricket segments
const CRICKET_SEGMENTS = [20, 19, 18, 17, 16, 15, 25];

export class GameEngine {
  private state: GameState;
  private events: GameEvent[] = [];

  constructor(gameType: GameType, players: Player[], options: Partial<GameOptions> = {}) {
    const mergedOptions = { ...DEFAULT_OPTIONS[gameType], ...options };
    const gameId = uuidv4();
    const now = Date.now();

    // Initialize player states
    const playerStates: Record<PlayerId, PlayerGameState> = {};
    const playerOrder: PlayerId[] = [];

    for (const player of players) {
      playerOrder.push(player.id);
      playerStates[player.id] = this.createPlayerState(player, gameType, mergedOptions);
    }

    // Initialize turn state
    const firstPlayerId = playerOrder[0];
    const turn: TurnState = {
      playerId: firstPlayerId,
      darts: [null, null, null],
      isBust: false,
      roundScore: 0,
    };

    // Initialize game-specific state
    const gameSpecific = this.initializeGameSpecificState(gameType, playerOrder, mergedOptions);

    this.state = {
      version: 1,
      gameId,
      gameType,
      options: mergedOptions,
      currentPlayerId: firstPlayerId,
      currentPlayerIndex: 0,
      turn,
      players: playerStates,
      playerOrder,
      currentRound: 1,
      currentLeg: 1,
      currentSet: 1,
      state: 'waiting',
      gameSpecific,
      createdAt: now,
      updatedAt: now,
    };
  }

  private createPlayerState(
    player: Player,
    gameType: GameType,
    options: GameOptions
  ): PlayerGameState {
    const startingScore = gameType === '501' || gameType === '301' 
      ? (options.startingScore || 501) 
      : 0;

    return {
      playerId: player.id,
      displayName: player.displayName,
      score: startingScore,
      legsWon: 0,
      setsWon: 0,
      hasDoubledIn: !options.doubleIn, // If doubleIn is false, consider already doubled in
      roundThrows: [],
      allThrows: [],
      stats: {
        dartsThrown: 0,
        totalPoints: 0,
        highestRound: 0,
        checkouts: 0,
        busts: 0,
      },
    };
  }

  private initializeGameSpecificState(
    gameType: GameType,
    playerOrder: PlayerId[],
    _options: GameOptions
  ): CricketState | TicTacToeState | Record<string, unknown> {
    if (gameType === 'cricket') {
      const marks: Record<number, Record<PlayerId, number>> = {};
      const closedBy: Record<number, PlayerId | null> = {};
      const scores: Record<PlayerId, number> = {};

      for (const segment of CRICKET_SEGMENTS) {
        marks[segment] = {};
        closedBy[segment] = null;
        for (const playerId of playerOrder) {
          marks[segment][playerId] = 0;
        }
      }

      for (const playerId of playerOrder) {
        scores[playerId] = 0;
      }

      return { marks, closedBy, scores } as CricketState;
    }

    if (gameType === 'tictactoe') {
      // Generate random segments for the 3x3 board
      const allSegments = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];
      const shuffled = allSegments.sort(() => Math.random() - 0.5);
      const segments = shuffled.slice(0, 9);

      const board: TicTacToeState['board'] = [];
      for (let row = 0; row < 3; row++) {
        const boardRow: { owner: PlayerId | null; hits: Record<PlayerId, number> }[] = [];
        for (let col = 0; col < 3; col++) {
          const hits: Record<PlayerId, number> = {};
          for (const playerId of playerOrder) {
            hits[playerId] = 0;
          }
          boardRow.push({ owner: null, hits });
        }
        board.push(boardRow);
      }

      return { board, segments, winner: null } as TicTacToeState;
    }

    return {};
  }

  // Start the game
  startGame(): void {
    if (this.state.state !== 'waiting') {
      throw new Error('Game has already started');
    }
    this.state.state = 'playing';
    this.state.updatedAt = Date.now();
    this.incrementVersion();
  }

  // Process a dart throw
  processThrow(playerId: PlayerId, dart: Omit<DartThrow, 'id' | 'timestamp'>): {
    success: boolean;
    bust: boolean;
    checkout: boolean;
    message?: string;
  } {
    if (this.state.state !== 'playing') {
      return { success: false, bust: false, checkout: false, message: 'Game is not in playing state' };
    }

    if (playerId !== this.state.currentPlayerId) {
      return { success: false, bust: false, checkout: false, message: 'Not your turn' };
    }

    const playerState = this.state.players[playerId];
    if (playerState.roundThrows.length >= 3) {
      return { success: false, bust: false, checkout: false, message: 'Turn already complete' };
    }

    // Create the dart throw with ID and timestamp
    const dartThrow: DartThrow = {
      id: uuidv4(),
      ...dart,
      timestamp: Date.now(),
    };

    // Process based on game type
    switch (this.state.gameType) {
      case '501':
      case '301':
        return this.process501Throw(playerId, dartThrow);
      case 'cricket':
        return this.processCricketThrow(playerId, dartThrow);
      case 'tictactoe':
        return this.processTicTacToeThrow(playerId, dartThrow);
      default:
        return { success: false, bust: false, checkout: false, message: 'Unknown game type' };
    }
  }

  private process501Throw(playerId: PlayerId, dart: DartThrow): {
    success: boolean;
    bust: boolean;
    checkout: boolean;
    message?: string;
  } {
    const playerState = this.state.players[playerId];
    const options = this.state.options;

    // Check double-in requirement
    if (options.doubleIn && !playerState.hasDoubledIn) {
      if (dart.multiplier === 'D' || dart.multiplier === 'DB') {
        playerState.hasDoubledIn = true;
      } else {
        // Non-scoring throw until doubled in
        this.addThrowToState(playerId, { ...dart, points: 0 });
        return { success: true, bust: false, checkout: false, message: 'Must double in' };
      }
    }

    const newScore = playerState.score - dart.points;

    // Check for bust
    if (newScore < 0 || (newScore === 1 && options.doubleOut) || 
        (newScore === 0 && options.doubleOut && dart.multiplier !== 'D' && dart.multiplier !== 'DB')) {
      this.handleBust(playerId);
      this.addThrowToState(playerId, dart);
      return { success: true, bust: true, checkout: false };
    }

    // Update score
    playerState.score = newScore;
    this.addThrowToState(playerId, dart);

    // Check for checkout
    if (newScore === 0) {
      return this.handleCheckout(playerId);
    }

    // Auto end turn if 3 darts thrown
    if (playerState.roundThrows.length >= 3) {
      this.endTurn(playerId);
    }

    return { success: true, bust: false, checkout: false };
  }

  private processCricketThrow(playerId: PlayerId, dart: DartThrow): {
    success: boolean;
    bust: boolean;
    checkout: boolean;
    message?: string;
  } {
    const cricketState = this.state.gameSpecific as CricketState;
    const segment = dart.value;

    this.addThrowToState(playerId, dart);

    // Only cricket segments count
    if (!CRICKET_SEGMENTS.includes(segment)) {
      if (this.state.players[playerId].roundThrows.length >= 3) {
        this.endTurn(playerId);
      }
      return { success: true, bust: false, checkout: false };
    }

    // Calculate marks based on multiplier
    let marks = 1;
    if (dart.multiplier === 'D' || dart.multiplier === 'DB') marks = 2;
    if (dart.multiplier === 'T') marks = 3;

    const currentMarks = cricketState.marks[segment][playerId];
    const newMarks = Math.min(currentMarks + marks, 3);
    const overMarks = (currentMarks + marks) - 3;

    cricketState.marks[segment][playerId] = newMarks;

    // If closed by this player, check if can score points
    if (newMarks >= 3 && overMarks > 0) {
      // Check if segment is closed by all other players
      const allOthersClosed = this.state.playerOrder
        .filter(pid => pid !== playerId)
        .every(pid => cricketState.marks[segment][pid] >= 3);

      if (!allOthersClosed) {
        // Score points for overmarks
        const pointValue = segment === 25 ? 25 : segment;
        cricketState.scores[playerId] += overMarks * pointValue;
      }
    }

    // Check if this player closed the segment first
    if (newMarks >= 3 && cricketState.closedBy[segment] === null) {
      cricketState.closedBy[segment] = playerId;
    }

    // Check for cricket win
    if (this.checkCricketWin(playerId)) {
      return this.handleCheckout(playerId);
    }

    if (this.state.players[playerId].roundThrows.length >= 3) {
      this.endTurn(playerId);
    }

    return { success: true, bust: false, checkout: false };
  }

  private checkCricketWin(playerId: PlayerId): boolean {
    const cricketState = this.state.gameSpecific as CricketState;

    // Player must have all segments closed
    const allClosed = CRICKET_SEGMENTS.every(seg => cricketState.marks[seg][playerId] >= 3);
    if (!allClosed) return false;

    // Player must have highest or tied highest score
    const playerScore = cricketState.scores[playerId];
    const highestOtherScore = Math.max(
      ...this.state.playerOrder
        .filter(pid => pid !== playerId)
        .map(pid => cricketState.scores[pid])
    );

    return playerScore >= highestOtherScore;
  }

  private processTicTacToeThrow(playerId: PlayerId, dart: DartThrow): {
    success: boolean;
    bust: boolean;
    checkout: boolean;
    message?: string;
  } {
    const tttState = this.state.gameSpecific as TicTacToeState;
    const segment = dart.value;
    const marksToWin = this.state.options.marksToWin || 4;

    this.addThrowToState(playerId, dart);

    // Find which square this segment corresponds to
    const squareIndex = tttState.segments.indexOf(segment);
    if (squareIndex === -1) {
      if (this.state.players[playerId].roundThrows.length >= 3) {
        this.endTurn(playerId);
      }
      return { success: true, bust: false, checkout: false };
    }

    const row = Math.floor(squareIndex / 3);
    const col = squareIndex % 3;
    const square = tttState.board[row][col];

    // Skip if square is already owned
    if (square.owner !== null) {
      if (this.state.players[playerId].roundThrows.length >= 3) {
        this.endTurn(playerId);
      }
      return { success: true, bust: false, checkout: false };
    }

    // Add hits based on multiplier
    let hits = 1;
    if (dart.multiplier === 'D') hits = 2;
    if (dart.multiplier === 'T') hits = 3;

    square.hits[playerId] = (square.hits[playerId] || 0) + hits;

    // Check if player claims the square
    if (square.hits[playerId] >= marksToWin) {
      square.owner = playerId;

      // Check for tic-tac-toe win
      if (this.checkTicTacToeWin(playerId)) {
        tttState.winner = playerId;
        return this.handleCheckout(playerId);
      }
    }

    if (this.state.players[playerId].roundThrows.length >= 3) {
      this.endTurn(playerId);
    }

    return { success: true, bust: false, checkout: false };
  }

  private checkTicTacToeWin(playerId: PlayerId): boolean {
    const tttState = this.state.gameSpecific as TicTacToeState;
    const board = tttState.board;

    // Check rows
    for (let row = 0; row < 3; row++) {
      if (board[row].every(cell => cell.owner === playerId)) return true;
    }

    // Check columns
    for (let col = 0; col < 3; col++) {
      if (board.every(row => row[col].owner === playerId)) return true;
    }

    // Check diagonals
    if (board[0][0].owner === playerId && board[1][1].owner === playerId && board[2][2].owner === playerId) {
      return true;
    }
    if (board[0][2].owner === playerId && board[1][1].owner === playerId && board[2][0].owner === playerId) {
      return true;
    }

    return false;
  }

  private addThrowToState(playerId: PlayerId, dart: DartThrow): void {
    const playerState = this.state.players[playerId];
    playerState.roundThrows.push(dart);
    playerState.allThrows.push(dart);
    playerState.stats.dartsThrown++;
    playerState.stats.totalPoints += dart.points;

    // Update turn state
    const dartIndex = playerState.roundThrows.length - 1;
    if (dartIndex < 3) {
      this.state.turn.darts[dartIndex] = dart;
      this.state.turn.roundScore += dart.points;
    }

    this.addEvent({
      type: 'THROW',
      playerId,
      data: { dart },
    });

    this.state.updatedAt = Date.now();
    this.incrementVersion();
  }

  private handleBust(playerId: PlayerId): void {
    const playerState = this.state.players[playerId];
    
    // Restore score (undo round throws)
    for (const dart of playerState.roundThrows) {
      playerState.score += dart.points;
    }
    
    playerState.stats.busts++;
    this.state.turn.isBust = true;

    this.addEvent({
      type: 'BUST',
      playerId,
    });

    // End turn after bust
    this.endTurn(playerId);
  }

  private handleCheckout(playerId: PlayerId): {
    success: boolean;
    bust: boolean;
    checkout: boolean;
    message?: string;
  } {
    const playerState = this.state.players[playerId];
    playerState.stats.checkouts++;
    playerState.legsWon++;

    this.addEvent({
      type: 'CHECKOUT',
      playerId,
      data: { leg: this.state.currentLeg },
    });

    this.addEvent({
      type: 'LEG_WON',
      playerId,
    });

    const options = this.state.options;
    const legsToWin = options.legs || 1;
    const setsToWin = options.sets || 1;

    // Check if set is won
    if (playerState.legsWon >= legsToWin) {
      playerState.setsWon++;
      
      this.addEvent({
        type: 'SET_WON',
        playerId,
      });

      // Check if match is won
      if (playerState.setsWon >= setsToWin) {
        this.state.winnerId = playerId;
        this.state.state = 'finished';

        this.addEvent({
          type: 'GAME_OVER',
          playerId,
          data: { winnerId: playerId },
        });

        return { success: true, bust: false, checkout: true, message: 'Game over!' };
      }

      // Reset legs for new set
      for (const pid of this.state.playerOrder) {
        this.state.players[pid].legsWon = 0;
      }
      this.state.currentSet++;
    }

    // Start new leg
    this.startNewLeg();

    return { success: true, bust: false, checkout: true };
  }

  private startNewLeg(): void {
    this.state.currentLeg++;
    
    // Reset scores
    const startingScore = this.state.options.startingScore || 501;
    for (const playerId of this.state.playerOrder) {
      const playerState = this.state.players[playerId];
      playerState.score = startingScore;
      playerState.hasDoubledIn = !this.state.options.doubleIn;
      playerState.roundThrows = [];
    }

    // Reset turn
    this.state.currentPlayerIndex = 0;
    this.state.currentPlayerId = this.state.playerOrder[0];
    this.state.turn = {
      playerId: this.state.currentPlayerId,
      darts: [null, null, null],
      isBust: false,
      roundScore: 0,
    };
    this.state.currentRound = 1;

    // Reset game-specific state if needed
    if (this.state.gameType === 'cricket') {
      this.state.gameSpecific = this.initializeGameSpecificState(
        'cricket',
        this.state.playerOrder,
        this.state.options
      );
    }
  }

  // End current turn
  endTurn(playerId: PlayerId): void {
    if (playerId !== this.state.currentPlayerId) {
      return;
    }

    const playerState = this.state.players[playerId];
    
    // Update highest round stat
    const roundScore = playerState.roundThrows.reduce((sum, d) => sum + d.points, 0);
    if (roundScore > playerState.stats.highestRound) {
      playerState.stats.highestRound = roundScore;
    }

    // Clear round throws
    playerState.roundThrows = [];

    // Move to next player
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.playerOrder.length;
    this.state.currentPlayerId = this.state.playerOrder[this.state.currentPlayerIndex];

    // If we've gone through all players, increment round
    if (this.state.currentPlayerIndex === 0) {
      this.state.currentRound++;
    }

    // Reset turn state
    this.state.turn = {
      playerId: this.state.currentPlayerId,
      darts: [null, null, null],
      isBust: false,
      roundScore: 0,
    };

    this.addEvent({
      type: 'END_TURN',
      playerId,
    });

    this.state.updatedAt = Date.now();
    this.incrementVersion();
  }

  // Undo last throw
  undoThrow(playerId: PlayerId): boolean {
    const playerState = this.state.players[playerId];
    
    if (playerState.roundThrows.length === 0) {
      return false;
    }

    const dart = playerState.roundThrows.pop()!;
    playerState.allThrows.pop();
    playerState.stats.dartsThrown--;
    playerState.stats.totalPoints -= dart.points;

    // Restore score for 501/301
    if (this.state.gameType === '501' || this.state.gameType === '301') {
      playerState.score += dart.points;
    }

    // Update turn state
    const dartIndex = playerState.roundThrows.length;
    this.state.turn.darts[dartIndex] = null;
    this.state.turn.roundScore -= dart.points;
    this.state.turn.isBust = false;

    this.addEvent({
      type: 'UNDO_THROW',
      playerId,
    });

    this.state.updatedAt = Date.now();
    this.incrementVersion();

    return true;
  }

  // Undo entire round
  undoRound(playerId: PlayerId): boolean {
    while (this.state.players[playerId].roundThrows.length > 0) {
      this.undoThrow(playerId);
    }

    this.addEvent({
      type: 'UNDO_ROUND',
      playerId,
    });

    return true;
  }

  private addEvent(event: Omit<GameEvent, 'timestamp' | 'version'>): void {
    this.events.push({
      ...event,
      timestamp: Date.now(),
      version: this.state.version,
    });
  }

  private incrementVersion(): void {
    this.state.version++;
  }

  // Getters
  getState(): GameState {
    return { ...this.state };
  }

  getEvents(): GameEvent[] {
    return [...this.events];
  }

  getGameId(): string {
    return this.state.gameId;
  }

  isFinished(): boolean {
    return this.state.state === 'finished';
  }
}
