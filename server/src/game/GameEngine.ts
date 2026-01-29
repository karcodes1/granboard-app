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
  TeamMode,
  TeamId,
  TeamGameState,
} from '../types/index.js';

// Team info passed from lobby
export interface GameTeamInfo {
  teamMode: TeamMode;
  teams?: {
    teamId: string;
    name: string;
    colorId: string;
    playerIds: PlayerId[];
  }[];
}

// Default game options
const DEFAULT_OPTIONS: Record<GameType, GameOptions> = {
  '501': { startingScore: 501, doubleIn: false, doubleOut: true, legs: 1, sets: 1 },
  '301': { startingScore: 301, doubleIn: false, doubleOut: true, legs: 1, sets: 1 },
  'gotcha': { startingScore: 301, doubleIn: false, doubleOut: true, legs: 1, sets: 1 },
  'cricket': { pointsToClose: 3 },
  'tictactoe': { marksToWin: 4 },
};

// Cricket segments
const CRICKET_SEGMENTS = [20, 19, 18, 17, 16, 15, 25];

export class GameEngine {
  private state: GameState;
  private events: GameEvent[] = [];

  constructor(
    gameType: GameType,
    players: Player[],
    options: Partial<GameOptions> = {},
    teamInfo: GameTeamInfo = { teamMode: 'ffa' }
  ) {
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

    // Initialize team states if in team mode
    let teams: TeamGameState[] | undefined;
    let teamOrder: TeamId[] | undefined;
    let currentTeamIndex: number | undefined;
    let firstPlayerId: PlayerId;

    if (teamInfo.teamMode === 'teams' && teamInfo.teams) {
      // Gotcha starts at 0 and goes up; 501/301 start at target and go down
      const getTeamStartingScore = () => {
        if (gameType === 'gotcha') return 0;
        if (gameType === '501' || gameType === '301') return mergedOptions.startingScore || 501;
        return 0;
      };
      teams = teamInfo.teams.map(t => ({
        teamId: t.teamId,
        name: t.name,
        colorId: t.colorId,
        playerIds: t.playerIds,
        score: getTeamStartingScore(),
        legsWon: 0,
        setsWon: 0,
        hasDoubledIn: !mergedOptions.doubleIn,
        currentPlayerIndex: 0,
      }));
      teamOrder = teams.map(t => t.teamId);
      currentTeamIndex = 0;
      // First player is the first player of the first team
      firstPlayerId = teams[0].playerIds[0];
    } else {
      firstPlayerId = playerOrder[0];
    }

    // Initialize turn state
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
      currentPlayerIndex: teamInfo.teamMode === 'ffa' ? 0 : playerOrder.indexOf(firstPlayerId),
      turn,
      players: playerStates,
      playerOrder,
      teamMode: teamInfo.teamMode,
      teams,
      teamOrder,
      currentTeamIndex,
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
    // 501/301 start at target and count down; gotcha starts at 0 and counts up
    const startingScore = gameType === '501' || gameType === '301' 
      ? (options.startingScore || 501) 
      : 0; // gotcha, cricket, tictactoe start at 0

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
      teamId: player.teamId,
      colorIndex: player.colorIndex,
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

    // For 01 games and gotcha, single bull scores 50 (same as double bull)
    let adjustedDart = { ...dart };
    if ((this.state.gameType === '501' || this.state.gameType === '301' || this.state.gameType === 'gotcha') 
        && dart.multiplier === 'SB') {
      adjustedDart.points = 50;
    }

    // Create the dart throw with ID and timestamp
    const dartThrow: DartThrow = {
      id: uuidv4(),
      ...adjustedDart,
      timestamp: Date.now(),
    };

    // Process based on game type
    switch (this.state.gameType) {
      case '501':
      case '301':
        return this.process501Throw(playerId, dartThrow);
      case 'gotcha':
        return this.processGotchaThrow(playerId, dartThrow);
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
    const isTeamMode = this.state.teamMode === 'teams' && this.state.teams;
    const team = isTeamMode ? this.getPlayerTeam(playerId) : null;

    // Get current score (team score in team mode, player score in FFA)
    const currentScore = team ? team.score : playerState.score;
    const hasDoubledIn = team ? team.hasDoubledIn : playerState.hasDoubledIn;

    // Check double-in requirement
    if (options.doubleIn && !hasDoubledIn) {
      if (dart.multiplier === 'D' || dart.multiplier === 'DB') {
        if (team) {
          team.hasDoubledIn = true;
        } else {
          playerState.hasDoubledIn = true;
        }
      } else {
        // Non-scoring throw until doubled in
        this.addThrowToState(playerId, { ...dart, points: 0 });
        return { success: true, bust: false, checkout: false, message: 'Must double in' };
      }
    }

    const newScore = currentScore - dart.points;

    // Check for bust
    if (newScore < 0 || (newScore === 1 && options.doubleOut) || 
        (newScore === 0 && options.doubleOut && dart.multiplier !== 'D' && dart.multiplier !== 'DB')) {
      this.handleBust(playerId);
      this.addThrowToState(playerId, dart);
      return { success: true, bust: true, checkout: false };
    }

    // Update score (team or player)
    if (team) {
      team.score = newScore;
    } else {
      playerState.score = newScore;
    }
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

  // Helper to get the team for a player
  private getPlayerTeam(playerId: PlayerId): TeamGameState | null {
    if (!this.state.teams) return null;
    return this.state.teams.find(t => t.playerIds.includes(playerId)) || null;
  }

  // Gotcha: 301 variant where scores go UP. Hit opponent's exact score = they go to 0. Bust = go to 201.
  private processGotchaThrow(playerId: PlayerId, dart: DartThrow): {
    success: boolean;
    bust: boolean;
    checkout: boolean;
    message?: string;
  } {
    const playerState = this.state.players[playerId];
    const options = this.state.options;
    const isTeamMode = this.state.teamMode === 'teams' && this.state.teams;
    const team = isTeamMode ? this.getPlayerTeam(playerId) : null;
    const targetScore = options.startingScore || 301;
    const bustResetScore = targetScore - 100; // 201 for 301

    // Get current score (team score in team mode, player score in FFA)
    const currentScore = team ? team.score : playerState.score;
    const hasDoubledIn = team ? team.hasDoubledIn : playerState.hasDoubledIn;

    // Check double-in requirement
    if (options.doubleIn && !hasDoubledIn) {
      if (dart.multiplier === 'D' || dart.multiplier === 'DB') {
        if (team) {
          team.hasDoubledIn = true;
        } else {
          playerState.hasDoubledIn = true;
        }
      } else {
        // Non-scoring throw until doubled in
        this.addThrowToState(playerId, { ...dart, points: 0 });
        return { success: true, bust: false, checkout: false, message: 'Must double in' };
      }
    }

    const newScore = currentScore + dart.points; // Gotcha scores go UP

    // Check for bust (went over target score)
    if (newScore > targetScore) {
      // Bust in Gotcha: go back to 201 (or 2/3 of target)
      if (team) {
        team.score = bustResetScore;
      } else {
        playerState.score = bustResetScore;
      }
      playerState.stats.busts++;
      this.state.turn.isBust = true;
      this.addThrowToState(playerId, dart);

      this.addEvent({
        type: 'BUST',
        playerId,
        data: { resetScore: bustResetScore },
      });

      // End turn after bust
      this.endTurn(playerId);
      return { success: true, bust: true, checkout: false, message: `Bust! Back to ${bustResetScore}` };
    }

    // Check for "gotcha" - hitting exact score of opponent
    let gotchaVictim: string | null = null;
    if (isTeamMode && this.state.teams) {
      // Check if we hit another team's exact score
      for (const otherTeam of this.state.teams) {
        if (otherTeam.teamId !== team?.teamId && otherTeam.score === newScore && newScore !== bustResetScore) {
          // Gotcha! Reset opponent team to 0 (but keep hasDoubledIn - they already doubled in)
          otherTeam.score = 0;
          gotchaVictim = otherTeam.name;
          this.addEvent({
            type: 'GOTCHA',
            playerId,
            data: { victimTeamId: otherTeam.teamId, victimName: otherTeam.name },
          });
        }
      }
    } else {
      // FFA mode - check all other players
      for (const otherId of this.state.playerOrder) {
        if (otherId !== playerId) {
          const otherPlayer = this.state.players[otherId];
          if (otherPlayer.score === newScore && newScore !== bustResetScore) {
            // Gotcha! Reset opponent to 0 (but keep hasDoubledIn - they already doubled in)
            otherPlayer.score = 0;
            gotchaVictim = otherPlayer.displayName;
            this.addEvent({
              type: 'GOTCHA',
              playerId,
              data: { victimPlayerId: otherId, victimName: otherPlayer.displayName },
            });
          }
        }
      }
    }

    // Update score (team or player)
    if (team) {
      team.score = newScore;
    } else {
      playerState.score = newScore;
    }
    this.addThrowToState(playerId, dart);

    // Check for checkout (reached exactly target score)
    if (newScore === targetScore) {
      // Check double-out requirement
      if (options.doubleOut && dart.multiplier !== 'D' && dart.multiplier !== 'DB') {
        // Must checkout on a double - treat as bust
        if (team) {
          team.score = bustResetScore;
        } else {
          playerState.score = bustResetScore;
        }
        playerState.stats.busts++;
        this.state.turn.isBust = true;
        this.addEvent({
          type: 'BUST',
          playerId,
          data: { resetScore: bustResetScore, reason: 'Must checkout on double' },
        });
        this.endTurn(playerId);
        return { success: true, bust: true, checkout: false, message: 'Must checkout on double!' };
      }
      return this.handleCheckout(playerId);
    }

    // Auto end turn if 3 darts thrown
    if (playerState.roundThrows.length >= 3) {
      this.endTurn(playerId);
    }

    if (gotchaVictim) {
      return { success: true, bust: false, checkout: false, message: `GOTCHA! ${gotchaVictim} reset to 0!` };
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
    const team = this.getPlayerTeam(playerId);
    
    // Restore score (undo round throws) - to team or player
    const roundPoints = playerState.roundThrows.reduce((sum, d) => sum + d.points, 0);
    if (team) {
      team.score += roundPoints;
    } else {
      playerState.score += roundPoints;
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
    const team = this.getPlayerTeam(playerId);
    playerState.stats.checkouts++;

    // Track legs/sets on team or player
    if (team) {
      team.legsWon++;
    } else {
      playerState.legsWon++;
    }

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
    const legsWon = team ? team.legsWon : playerState.legsWon;

    // Check if set is won
    if (legsWon >= legsToWin) {
      if (team) {
        team.setsWon++;
      } else {
        playerState.setsWon++;
      }
      
      this.addEvent({
        type: 'SET_WON',
        playerId,
      });

      const setsWon = team ? team.setsWon : playerState.setsWon;

      // Check if match is won
      if (setsWon >= setsToWin) {
        this.state.winnerId = playerId;
        if (team) {
          this.state.winnerTeamId = team.teamId;
        }
        this.state.state = 'finished';

        this.addEvent({
          type: 'GAME_OVER',
          playerId,
          data: { winnerId: playerId, winnerTeamId: team?.teamId },
        });

        return { success: true, bust: false, checkout: true, message: 'Game over!' };
      }

      // Reset legs for new set
      if (this.state.teams) {
        for (const t of this.state.teams) {
          t.legsWon = 0;
        }
      } else {
        for (const pid of this.state.playerOrder) {
          this.state.players[pid].legsWon = 0;
        }
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
    
    if (this.state.teams) {
      // Reset team scores and state
      for (const team of this.state.teams) {
        team.score = startingScore;
        team.hasDoubledIn = !this.state.options.doubleIn;
        team.currentPlayerIndex = 0;
      }
    }
    
    // Reset player state
    for (const playerId of this.state.playerOrder) {
      const playerState = this.state.players[playerId];
      playerState.score = startingScore; // Keep for FFA mode
      playerState.hasDoubledIn = !this.state.options.doubleIn;
      playerState.roundThrows = [];
    }

    // Reset turn - in team mode, start with first player of first team
    if (this.state.teams && this.state.teamOrder) {
      this.state.currentTeamIndex = 0;
      const firstTeam = this.state.teams[0];
      this.state.currentPlayerId = firstTeam.playerIds[0];
      this.state.currentPlayerIndex = this.state.playerOrder.indexOf(this.state.currentPlayerId);
    } else {
      this.state.currentPlayerIndex = 0;
      this.state.currentPlayerId = this.state.playerOrder[0];
    }
    
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

    // Move to next player/team
    if (this.state.teams && this.state.teamOrder && this.state.currentTeamIndex !== undefined) {
      // Team mode: move to next team, rotate players within teams
      const currentTeam = this.state.teams[this.state.currentTeamIndex];
      
      // Move to next team
      this.state.currentTeamIndex = (this.state.currentTeamIndex + 1) % this.state.teams.length;
      const nextTeam = this.state.teams[this.state.currentTeamIndex];
      
      // Get next player from next team (rotate through team members)
      this.state.currentPlayerId = nextTeam.playerIds[nextTeam.currentPlayerIndex];
      this.state.currentPlayerIndex = this.state.playerOrder.indexOf(this.state.currentPlayerId);
      
      // If we've gone through all teams, increment round and rotate players within teams
      if (this.state.currentTeamIndex === 0) {
        this.state.currentRound++;
        // Rotate to next player in each team
        for (const team of this.state.teams) {
          team.currentPlayerIndex = (team.currentPlayerIndex + 1) % team.playerIds.length;
        }
        // Update current player to the rotated player
        this.state.currentPlayerId = nextTeam.playerIds[nextTeam.currentPlayerIndex];
        this.state.currentPlayerIndex = this.state.playerOrder.indexOf(this.state.currentPlayerId);
      }
    } else {
      // FFA mode: simple rotation through all players
      this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.playerOrder.length;
      this.state.currentPlayerId = this.state.playerOrder[this.state.currentPlayerIndex];

      // If we've gone through all players, increment round
      if (this.state.currentPlayerIndex === 0) {
        this.state.currentRound++;
      }
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

    // Restore score for 501/301 (team or player)
    if (this.state.gameType === '501' || this.state.gameType === '301') {
      const team = this.getPlayerTeam(playerId);
      if (team) {
        team.score += dart.points;
      } else {
        playerState.score += dart.points;
      }
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
