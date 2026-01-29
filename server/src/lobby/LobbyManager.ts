import { v4 as uuidv4 } from 'uuid';
import {
  Lobby,
  LobbyId,
  LobbyPlayer,
  Player,
  PlayerId,
  GameType,
  GameOptions,
  TeamId,
  TeamMode,
  TeamConfig,
  Team,
  PLAYER_COLORS,
} from '../types/index.js';
import { GameEngine } from '../game/GameEngine.js';

export class LobbyManager {
  private lobbies: Map<LobbyId, Lobby> = new Map();
  private games: Map<string, GameEngine> = new Map();
  private userToLobby: Map<string, LobbyId> = new Map();

  // Create a new lobby
  createLobby(
    ownerUserId: string,
    ownerDisplayName: string,
    gameType: GameType,
    options: GameOptions = {},
    maxPlayers: number = 8
  ): Lobby {
    const lobbyId = uuidv4();
    const now = Date.now();

    // Create owner as first player
    const ownerPlayer: LobbyPlayer = {
      id: ownerUserId,
      type: 'authenticated',
      ownerUserId,
      displayName: ownerDisplayName,
      isReady: true,
      joinedAt: now,
    };

    const lobby: Lobby = {
      lobbyId,
      ownerUserId,
      ownerDisplayName,
      players: [ownerPlayer],
      teamMode: 'ffa',
      teams: [],
      gameType,
      gameOptions: options,
      status: 'waiting',
      maxPlayers,
      createdAt: now,
      updatedAt: now,
    };

    this.lobbies.set(lobbyId, lobby);
    this.userToLobby.set(ownerUserId, lobbyId);

    return lobby;
  }

  // Get lobby by ID
  getLobby(lobbyId: LobbyId): Lobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  // Get all lobbies
  getAllLobbies(): Lobby[] {
    return Array.from(this.lobbies.values()).filter(l => l.status === 'waiting');
  }

  // Get lobby for a user
  getLobbyForUser(userId: string): Lobby | undefined {
    const lobbyId = this.userToLobby.get(userId);
    return lobbyId ? this.lobbies.get(lobbyId) : undefined;
  }

  // Join a lobby
  joinLobby(lobbyId: LobbyId, userId: string, displayName: string): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    if (lobby.status !== 'waiting') {
      throw new Error('Lobby is not accepting players');
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      throw new Error('Lobby is full');
    }

    // Check if already in lobby
    if (lobby.players.some(p => p.id === userId)) {
      return lobby;
    }

    const player: LobbyPlayer = {
      id: userId,
      type: 'authenticated',
      ownerUserId: userId,
      displayName,
      isReady: false,
      joinedAt: Date.now(),
    };

    lobby.players.push(player);
    lobby.updatedAt = Date.now();
    this.userToLobby.set(userId, lobbyId);

    return lobby;
  }

  // Leave a lobby
  leaveLobby(lobbyId: LobbyId, userId: string): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    // Remove user and their guests
    lobby.players = lobby.players.filter(
      p => p.id !== userId && p.ownerUserId !== userId
    );
    lobby.updatedAt = Date.now();
    this.userToLobby.delete(userId);

    // If lobby is empty or owner left, delete lobby
    if (lobby.players.length === 0 || lobby.ownerUserId === userId) {
      this.lobbies.delete(lobbyId);
      return null;
    }

    return lobby;
  }

  // Add guest player
  addGuestPlayer(lobbyId: LobbyId, ownerUserId: string, guestName: string): { lobby: Lobby; guestId: PlayerId } | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    if (lobby.status !== 'waiting') {
      throw new Error('Lobby is not accepting players');
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      throw new Error('Lobby is full');
    }

    // Verify owner is in lobby
    if (!lobby.players.some(p => p.id === ownerUserId)) {
      throw new Error('You must be in the lobby to add guests');
    }

    const guestId = `guest-${uuidv4().substring(0, 8)}`;
    const guestPlayer: LobbyPlayer = {
      id: guestId,
      type: 'guest',
      ownerUserId,
      displayName: guestName,
      isReady: true, // Guests are always ready
      joinedAt: Date.now(),
    };

    lobby.players.push(guestPlayer);
    lobby.updatedAt = Date.now();

    return { lobby, guestId };
  }

  // Remove guest player
  removeGuestPlayer(lobbyId: LobbyId, ownerUserId: string, guestId: PlayerId): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    const guest = lobby.players.find(p => p.id === guestId);
    if (!guest) return lobby;

    // Only owner or lobby owner can remove guests
    if (guest.ownerUserId !== ownerUserId && lobby.ownerUserId !== ownerUserId) {
      throw new Error('You can only remove your own guests');
    }

    lobby.players = lobby.players.filter(p => p.id !== guestId);
    lobby.updatedAt = Date.now();

    return lobby;
  }

  // Set guest player nickname
  setGuestPlayerNickname(lobbyId: LobbyId, ownerUserId: string, guestId: PlayerId, newName: string): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    const guest = lobby.players.find(p => p.id === guestId);
    if (!guest || guest.type !== 'guest') return lobby;

    if (guest.ownerUserId !== ownerUserId) {
      throw new Error('You can only rename your own guests');
    }

    guest.displayName = newName;
    lobby.updatedAt = Date.now();

    return lobby;
  }

  // Set player ready status
  setReady(lobbyId: LobbyId, playerId: PlayerId, isReady: boolean): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    const player = lobby.players.find(p => p.id === playerId);
    if (!player) return lobby;

    player.isReady = isReady;
    lobby.updatedAt = Date.now();

    return lobby;
  }

  // Update lobby options
  updateOptions(lobbyId: LobbyId, userId: string, options: Partial<GameOptions>): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    if (lobby.ownerUserId !== userId) {
      throw new Error('Only the lobby owner can change options');
    }

    lobby.gameOptions = { ...lobby.gameOptions, ...options };
    lobby.updatedAt = Date.now();

    return lobby;
  }

  // Update game type
  updateGameType(lobbyId: LobbyId, userId: string, gameType: GameType): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    if (lobby.ownerUserId !== userId) {
      throw new Error('Only the lobby owner can change game type');
    }

    lobby.gameType = gameType;
    lobby.updatedAt = Date.now();

    return lobby;
  }

  // Set team mode (FFA or teams)
  setTeamMode(lobbyId: LobbyId, userId: string, teamMode: TeamMode, teamConfig?: TeamConfig): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    if (lobby.ownerUserId !== userId) {
      throw new Error('Only the lobby owner can change team mode');
    }

    lobby.teamMode = teamMode;
    lobby.teamConfig = teamConfig;

    // Set up teams based on configuration
    if (teamMode === 'teams' && teamConfig) {
      lobby.teams = this.createTeamsForConfig(teamConfig);
    } else {
      lobby.teams = [];
    }

    // Clear player team assignments
    for (const player of lobby.players) {
      player.teamId = undefined;
    }

    // In FFA mode, assign colors to players
    if (teamMode === 'ffa') {
      lobby.players.forEach((player, index) => {
        player.colorIndex = index % PLAYER_COLORS.length;
      });
    }

    lobby.updatedAt = Date.now();
    return lobby;
  }

  // Create teams based on configuration
  private createTeamsForConfig(config: TeamConfig): Team[] {
    const teamColors: Array<{ name: string; colorId: typeof PLAYER_COLORS[number]['id'] }> = [
      { name: 'Team Red', colorId: 'red' },
      { name: 'Team Blue', colorId: 'blue' },
      { name: 'Team Green', colorId: 'green' },
      { name: 'Team Yellow', colorId: 'yellow' },
    ];

    let numTeams = 2;
    if (config === '2v2v2') numTeams = 3;
    if (config === '2v2v2v2') numTeams = 4;

    return teamColors.slice(0, numTeams).map((tc, index) => ({
      id: `team-${index + 1}`,
      name: tc.name,
      colorId: tc.colorId,
      playerIds: [],
    }));
  }

  // Validate team mode configuration before starting game
  private validateTeamMode(lobby: Lobby): void {
    const { gameType, teamMode, teamConfig, teams, players } = lobby;

    // FFA mode - no restrictions
    if (teamMode === 'ffa') {
      return;
    }

    // Team mode validations
    if (teamMode === 'teams') {
      if (!teamConfig) {
        throw new Error('Team configuration required for team mode');
      }

      // Check all players are assigned to teams
      const unassigned = players.filter(p => !p.teamId);
      if (unassigned.length > 0) {
        throw new Error(`All players must be assigned to teams: ${unassigned.map(p => p.displayName).join(', ')}`);
      }

      // Validate game type supports the team config
      const isTwoTeamOnly = gameType === 'cricket' || gameType === 'tictactoe';
      const numTeams = teams.length;

      if (isTwoTeamOnly && numTeams !== 2) {
        throw new Error(`${gameType} only supports 2 teams`);
      }
      // 01 games support all team configurations

      // Validate team sizes are balanced
      const teamSizes = teams.map(t => t.playerIds.length);
      const allSameSize = teamSizes.every(size => size === teamSizes[0]);
      if (!allSameSize) {
        throw new Error('Teams must have equal numbers of players');
      }

      if (teamSizes[0] === 0) {
        throw new Error('Each team must have at least one player');
      }
    }
  }

  // Assign player to team
  assignToTeam(lobbyId: LobbyId, playerId: PlayerId, teamId: TeamId): Lobby | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    // Remove from current team
    for (const team of lobby.teams) {
      team.playerIds = team.playerIds.filter(pid => pid !== playerId);
    }

    // Add to new team
    const targetTeam = lobby.teams.find(t => t.id === teamId);
    if (targetTeam) {
      targetTeam.playerIds.push(playerId);
    }

    // Update player's teamId
    const player = lobby.players.find(p => p.id === playerId);
    if (player) {
      player.teamId = teamId;
      // Clear FFA color index when in team mode
      player.colorIndex = undefined;
    }

    lobby.updatedAt = Date.now();

    return lobby;
  }

  // Start game
  startGame(lobbyId: LobbyId, userId: string): { lobby: Lobby; game: GameEngine } | null {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return null;

    if (lobby.ownerUserId !== userId) {
      throw new Error('Only the lobby owner can start the game');
    }

    if (lobby.status !== 'waiting') {
      throw new Error('Lobby is not in waiting state');
    }

    if (lobby.players.length < 2) {
      throw new Error('Need at least 2 players to start');
    }

    // Check all players are ready
    const notReady = lobby.players.filter(p => !p.isReady);
    if (notReady.length > 0) {
      throw new Error(`Players not ready: ${notReady.map(p => p.displayName).join(', ')}`);
    }

    // Validate team mode restrictions
    this.validateTeamMode(lobby);

    // Convert lobby players to game players
    const players: Player[] = lobby.players.map((lp, index) => ({
      id: lp.id,
      type: lp.type,
      ownerUserId: lp.ownerUserId,
      displayName: lp.displayName,
      teamId: lp.teamId,
      colorIndex: lp.colorIndex ?? index % PLAYER_COLORS.length,
    }));

    // Create game engine with team info
    const teamInfo = lobby.teamMode === 'teams' ? {
      teamMode: lobby.teamMode,
      teams: lobby.teams.map(t => ({
        teamId: t.id,
        name: t.name,
        colorId: t.colorId,
        playerIds: t.playerIds,
      })),
    } : { teamMode: 'ffa' as const };
    
    const game = new GameEngine(lobby.gameType, players, lobby.gameOptions, teamInfo);
    game.startGame();

    // Update lobby status
    lobby.status = 'started';
    lobby.gameId = game.getGameId();
    lobby.updatedAt = Date.now();

    // Store game
    this.games.set(game.getGameId(), game);

    return { lobby, game };
  }

  // Get game by ID
  getGame(gameId: string): GameEngine | undefined {
    return this.games.get(gameId);
  }

  // End game and return to lobby
  endGame(gameId: string): Lobby | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    // Find lobby for this game
    for (const lobby of this.lobbies.values()) {
      if (lobby.gameId === gameId) {
        lobby.status = 'finished';
        lobby.updatedAt = Date.now();
        this.games.delete(gameId);
        return lobby;
      }
    }

    return null;
  }

  // Delete lobby
  deleteLobby(lobbyId: LobbyId): void {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      // Clean up user mappings
      for (const player of lobby.players) {
        this.userToLobby.delete(player.ownerUserId);
      }
      // Clean up game if exists
      if (lobby.gameId) {
        this.games.delete(lobby.gameId);
      }
      this.lobbies.delete(lobbyId);
    }
  }
}

// Singleton instance
export const lobbyManager = new LobbyManager();
