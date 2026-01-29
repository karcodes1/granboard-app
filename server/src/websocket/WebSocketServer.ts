import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyIdToken, getUserProfile, saveUserProfile } from '../auth/FirebaseAuth.js';
import { lobbyManager } from '../lobby/LobbyManager.js';
import { agoraTokenService } from '../services/AgoraTokenService.js';
import {
  ClientSession,
  ClientMessage,
  GameType,
  GameOptions,
  DartThrow,
  TeamMode,
  TeamConfig,
} from '../types/index.js';

export class WebSocketServer {
  private io: SocketIOServer;
  private sessions: Map<string, ClientSession> = new Map();

  constructor(httpServer: HttpServer, corsOrigin: string | string[]) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    console.log('[WebSocket] Server initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`[WebSocket] Client connected: ${socket.id}`);

      // Authentication
      socket.on('AUTH', async (data: { idToken: string }) => {
        await this.handleAuth(socket, data.idToken);
      });

      // Set display name
      socket.on('SET_DISPLAY_NAME', (data: { displayName: string }) => {
        this.handleSetDisplayName(socket, data.displayName);
      });

      // Lobby events
      socket.on('CREATE_LOBBY', (data: { gameType: GameType; options?: GameOptions; maxPlayers?: number }) => {
        this.handleCreateLobby(socket, data);
      });

      socket.on('JOIN_LOBBY', (data: { lobbyId: string }) => {
        this.handleJoinLobby(socket, data.lobbyId);
      });

      socket.on('LEAVE_LOBBY', () => {
        this.handleLeaveLobby(socket);
      });

      socket.on('GET_LOBBIES', () => {
        this.handleGetLobbies(socket);
      });

      socket.on('ADD_GUEST_PLAYER', (data: { displayName: string }) => {
        this.handleAddGuestPlayer(socket, data.displayName);
      });

      socket.on('REMOVE_GUEST_PLAYER', (data: { guestId: string }) => {
        this.handleRemoveGuestPlayer(socket, data.guestId);
      });

      socket.on('SET_GUEST_PLAYER_NICKNAME', (data: { guestId: string; displayName: string }) => {
        this.handleSetGuestNickname(socket, data.guestId, data.displayName);
      });

      socket.on('SET_READY', (data: { isReady: boolean }) => {
        this.handleSetReady(socket, data.isReady);
      });

      socket.on('UPDATE_LOBBY_OPTIONS', (data: { options: Partial<GameOptions>; gameType?: GameType }) => {
        this.handleUpdateLobbyOptions(socket, data.options, data.gameType);
      });

      socket.on('SET_TEAM_MODE', (data: { teamMode: string; teamConfig?: string }) => {
        this.handleSetTeamMode(socket, data.teamMode, data.teamConfig);
      });

      socket.on('ASSIGN_TEAM', (data: { playerId: string; teamId: string }) => {
        this.handleAssignTeam(socket, data.playerId, data.teamId);
      });

      socket.on('START_GAME', () => {
        this.handleStartGame(socket);
      });

      // Game events
      socket.on('THROW', (data: { multiplier: string; value: number; points: number }) => {
        this.handleThrow(socket, data);
      });

      socket.on('END_TURN', () => {
        this.handleEndTurn(socket);
      });

      socket.on('UNDO_THROW', () => {
        this.handleUndoThrow(socket);
      });

      socket.on('UNDO_ROUND', () => {
        this.handleUndoRound(socket);
      });

      // Agora token request
      socket.on('REQUEST_AGORA_TOKEN', (data: { channelName: string; uid?: number }) => {
        this.handleAgoraTokenRequest(socket, data.channelName, data.uid);
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private async handleAuth(socket: Socket, idToken: string): Promise<void> {
    try {
      const user = await verifyIdToken(idToken);
      if (!user) {
        socket.emit('AUTH_ERROR', { message: 'Invalid token' });
        return;
      }

      // Try to get displayName from Firestore first, fall back to token name, then email
      let displayName = user.name;
      const profile = await getUserProfile(user.uid);
      if (profile?.displayName) {
        displayName = profile.displayName;
      } else if (user.name) {
        // Save the name from token to Firestore for future use
        await saveUserProfile(user.uid, user.name, user.email);
      }

      // Final fallback
      if (!displayName) {
        displayName = user.email || `User-${user.uid.substring(0, 6)}`;
      }

      const session: ClientSession = {
        socketId: socket.id,
        userId: user.uid,
        displayName,
        guestPlayers: [],
      };

      this.sessions.set(socket.id, session);
      socket.emit('AUTH_SUCCESS', {
        userId: user.uid,
        displayName: session.displayName,
      });

      console.log(`[WebSocket] User authenticated: ${user.uid} as ${displayName}`);
    } catch (error) {
      console.error('[WebSocket] Auth error:', error);
      socket.emit('AUTH_ERROR', { message: 'Authentication failed' });
    }
  }

  private getSession(socket: Socket): ClientSession | null {
    const session = this.sessions.get(socket.id);
    if (!session) {
      socket.emit('ERROR', { message: 'Not authenticated' });
      return null;
    }
    return session;
  }

  private handleCreateLobby(
    socket: Socket,
    data: { gameType: GameType; options?: GameOptions; maxPlayers?: number }
  ): void {
    const session = this.getSession(socket);
    if (!session) return;

    try {
      const lobby = lobbyManager.createLobby(
        session.userId,
        session.displayName,
        data.gameType,
        data.options || {},
        data.maxPlayers || 8
      );

      session.currentLobbyId = lobby.lobbyId;
      socket.join(`lobby:${lobby.lobbyId}`);

      socket.emit('LOBBY_STATE', { lobby });
      console.log(`[WebSocket] Lobby created: ${lobby.lobbyId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create lobby';
      socket.emit('LOBBY_ERROR', { message });
    }
  }

  private handleJoinLobby(socket: Socket, lobbyId: string): void {
    const session = this.getSession(socket);
    if (!session) return;

    try {
      const lobby = lobbyManager.joinLobby(lobbyId, session.userId, session.displayName);
      if (!lobby) {
        socket.emit('LOBBY_ERROR', { message: 'Lobby not found' });
        return;
      }

      session.currentLobbyId = lobbyId;
      socket.join(`lobby:${lobbyId}`);

      // Notify all in lobby
      this.io.to(`lobby:${lobbyId}`).emit('LOBBY_STATE', { lobby });
      this.io.to(`lobby:${lobbyId}`).emit('PLAYER_JOINED', {
        playerId: session.userId,
        displayName: session.displayName,
      });

      console.log(`[WebSocket] User ${session.userId} joined lobby ${lobbyId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to join lobby';
      socket.emit('LOBBY_ERROR', { message });
    }
  }

  private handleLeaveLobby(socket: Socket): void {
    const session = this.getSession(socket);
    if (!session || !session.currentLobbyId) return;

    const lobbyId = session.currentLobbyId;
    const lobby = lobbyManager.leaveLobby(lobbyId, session.userId);

    socket.leave(`lobby:${lobbyId}`);
    session.currentLobbyId = undefined;

    if (lobby) {
      this.io.to(`lobby:${lobbyId}`).emit('LOBBY_STATE', { lobby });
      this.io.to(`lobby:${lobbyId}`).emit('PLAYER_LEFT', {
        playerId: session.userId,
        displayName: session.displayName,
      });
    }

    socket.emit('LOBBY_STATE', { lobby: null });
    console.log(`[WebSocket] User ${session.userId} left lobby ${lobbyId}`);
  }

  private handleGetLobbies(socket: Socket): void {
    const session = this.getSession(socket);
    if (!session) return;

    const lobbies = lobbyManager.getAllLobbies();
    socket.emit('LOBBY_LIST', { lobbies });
  }

  private handleAddGuestPlayer(socket: Socket, displayName: string): void {
    const session = this.getSession(socket);
    if (!session || !session.currentLobbyId) {
      socket.emit('LOBBY_ERROR', { message: 'Not in a lobby' });
      return;
    }

    try {
      const result = lobbyManager.addGuestPlayer(session.currentLobbyId, session.userId, displayName);
      if (!result) {
        socket.emit('LOBBY_ERROR', { message: 'Failed to add guest' });
        return;
      }

      session.guestPlayers.push({
        id: result.guestId,
        type: 'guest',
        ownerUserId: session.userId,
        displayName,
      });

      this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby: result.lobby });
      console.log(`[WebSocket] Guest added: ${result.guestId}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add guest';
      socket.emit('LOBBY_ERROR', { message });
    }
  }

  private handleRemoveGuestPlayer(socket: Socket, guestId: string): void {
    const session = this.getSession(socket);
    if (!session || !session.currentLobbyId) return;

    try {
      const lobby = lobbyManager.removeGuestPlayer(session.currentLobbyId, session.userId, guestId);
      if (lobby) {
        session.guestPlayers = session.guestPlayers.filter(g => g.id !== guestId);
        this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove guest';
      socket.emit('LOBBY_ERROR', { message });
    }
  }

  private handleSetGuestNickname(socket: Socket, guestId: string, displayName: string): void {
    const session = this.getSession(socket);
    if (!session || !session.currentLobbyId) return;

    try {
      const lobby = lobbyManager.setGuestPlayerNickname(
        session.currentLobbyId,
        session.userId,
        guestId,
        displayName
      );
      if (lobby) {
        const guest = session.guestPlayers.find(g => g.id === guestId);
        if (guest) guest.displayName = displayName;
        this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to set nickname';
      socket.emit('LOBBY_ERROR', { message });
    }
  }

  private handleSetReady(socket: Socket, isReady: boolean): void {
    const session = this.getSession(socket);
    if (!session || !session.currentLobbyId) return;

    const lobby = lobbyManager.setReady(session.currentLobbyId, session.userId, isReady);
    if (lobby) {
      this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby });
    }
  }

  private async handleSetDisplayName(socket: Socket, displayName: string): Promise<void> {
    const session = this.getSession(socket);
    if (!session) return;

    try {
      // Save to Firestore
      await saveUserProfile(session.userId, displayName);
      
      // Update session
      session.displayName = displayName;

      // Update in current lobby if in one
      if (session.currentLobbyId) {
        const lobby = lobbyManager.getLobby(session.currentLobbyId);
        if (lobby) {
          const player = lobby.players.find(p => p.id === session.userId);
          if (player) {
            player.displayName = displayName;
            lobby.updatedAt = Date.now();
            // If this is the owner, also update ownerDisplayName
            if (lobby.ownerUserId === session.userId) {
              lobby.ownerDisplayName = displayName;
            }
            this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby });
          }
        }
      }

      socket.emit('AUTH_SUCCESS', {
        userId: session.userId,
        displayName: session.displayName,
      });

      console.log(`[WebSocket] User ${session.userId} changed display name to ${displayName}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update display name';
      socket.emit('ERROR', { message });
    }
  }

  private handleAssignTeam(socket: Socket, playerId: string, teamId: string): void {
    const session = this.getSession(socket);
    if (!session || !session.currentLobbyId) return;

    try {
      // Only lobby owner can assign teams
      const lobby = lobbyManager.getLobby(session.currentLobbyId);
      if (!lobby) {
        socket.emit('LOBBY_ERROR', { message: 'Lobby not found' });
        return;
      }

      if (lobby.ownerUserId !== session.userId) {
        socket.emit('LOBBY_ERROR', { message: 'Only the host can assign teams' });
        return;
      }

      const updatedLobby = lobbyManager.assignToTeam(session.currentLobbyId, playerId, teamId);
      if (updatedLobby) {
        this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby: updatedLobby });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to assign team';
      socket.emit('LOBBY_ERROR', { message });
    }
  }

  private handleSetTeamMode(socket: Socket, teamMode: string, teamConfig?: string): void {
    const session = this.getSession(socket);
    if (!session || !session.currentLobbyId) return;

    try {
      const updatedLobby = lobbyManager.setTeamMode(
        session.currentLobbyId,
        session.userId,
        teamMode as TeamMode,
        teamConfig as TeamConfig | undefined
      );
      if (updatedLobby) {
        this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby: updatedLobby });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to set team mode';
      socket.emit('LOBBY_ERROR', { message });
    }
  }

  private handleUpdateLobbyOptions(socket: Socket, options: Partial<GameOptions>, gameType?: GameType): void {
    const session = this.getSession(socket);
    if (!session || !session.currentLobbyId) return;

    try {
      let lobby = lobbyManager.updateOptions(session.currentLobbyId, session.userId, options);
      if (gameType) {
        lobby = lobbyManager.updateGameType(session.currentLobbyId, session.userId, gameType);
      }
      if (lobby) {
        this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update options';
      socket.emit('LOBBY_ERROR', { message });
    }
  }

  private handleStartGame(socket: Socket): void {
    const session = this.getSession(socket);
    if (!session || !session.currentLobbyId) return;

    try {
      const result = lobbyManager.startGame(session.currentLobbyId, session.userId);
      if (!result) {
        socket.emit('GAME_ERROR', { message: 'Failed to start game' });
        return;
      }

      const { lobby, game } = result;
      session.currentGameId = game.getGameId();

      // Move all sockets to game room
      const gameRoom = `game:${game.getGameId()}`;
      this.io.to(`lobby:${session.currentLobbyId}`).socketsJoin(gameRoom);

      // Broadcast game state
      this.io.to(gameRoom).emit('GAME_STATE', { state: game.getState() });
      this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby });

      console.log(`[WebSocket] Game started: ${game.getGameId()}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start game';
      socket.emit('GAME_ERROR', { message });
    }
  }

  private handleThrow(socket: Socket, data: { multiplier: string; value: number; points: number }): void {
    const session = this.getSession(socket);
    if (!session || !session.currentGameId) return;

    const game = lobbyManager.getGame(session.currentGameId);
    if (!game) {
      socket.emit('GAME_ERROR', { message: 'Game not found' });
      return;
    }

    // Determine which player is throwing (could be user or their guest)
    const gameState = game.getState();
    const currentPlayerId = gameState.currentPlayerId;

    // Check if current player belongs to this session
    const isSessionPlayer =
      currentPlayerId === session.userId ||
      session.guestPlayers.some(g => g.id === currentPlayerId);

    if (!isSessionPlayer) {
      socket.emit('GAME_ERROR', { message: 'Not your turn' });
      return;
    }

    const dart: Omit<DartThrow, 'id' | 'timestamp'> = {
      multiplier: data.multiplier as DartThrow['multiplier'],
      value: data.value,
      points: data.points,
    };

    const result = game.processThrow(currentPlayerId, dart);
    if (!result.success) {
      socket.emit('GAME_ERROR', { message: result.message || 'Invalid throw' });
      return;
    }

    // Broadcast updated state
    const gameRoom = `game:${session.currentGameId}`;
    this.io.to(gameRoom).emit('GAME_STATE', { state: game.getState() });

    // Check if game is finished
    if (game.isFinished()) {
      const lobby = lobbyManager.endGame(session.currentGameId);
      if (lobby) {
        this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby });
      }
    }
  }

  private handleEndTurn(socket: Socket): void {
    const session = this.getSession(socket);
    if (!session || !session.currentGameId) return;

    const game = lobbyManager.getGame(session.currentGameId);
    if (!game) return;

    const gameState = game.getState();
    const currentPlayerId = gameState.currentPlayerId;

    const isSessionPlayer =
      currentPlayerId === session.userId ||
      session.guestPlayers.some(g => g.id === currentPlayerId);

    if (!isSessionPlayer) return;

    game.endTurn(currentPlayerId);

    const gameRoom = `game:${session.currentGameId}`;
    this.io.to(gameRoom).emit('GAME_STATE', { state: game.getState() });
  }

  private handleUndoThrow(socket: Socket): void {
    const session = this.getSession(socket);
    if (!session || !session.currentGameId) return;

    const game = lobbyManager.getGame(session.currentGameId);
    if (!game) return;

    const gameState = game.getState();
    const currentPlayerId = gameState.currentPlayerId;

    const isSessionPlayer =
      currentPlayerId === session.userId ||
      session.guestPlayers.some(g => g.id === currentPlayerId);

    if (!isSessionPlayer) return;

    game.undoThrow(currentPlayerId);

    const gameRoom = `game:${session.currentGameId}`;
    this.io.to(gameRoom).emit('GAME_STATE', { state: game.getState() });
  }

  private handleUndoRound(socket: Socket): void {
    const session = this.getSession(socket);
    if (!session || !session.currentGameId) return;

    const game = lobbyManager.getGame(session.currentGameId);
    if (!game) return;

    const gameState = game.getState();
    const currentPlayerId = gameState.currentPlayerId;

    const isSessionPlayer =
      currentPlayerId === session.userId ||
      session.guestPlayers.some(g => g.id === currentPlayerId);

    if (!isSessionPlayer) return;

    game.undoRound(currentPlayerId);

    const gameRoom = `game:${session.currentGameId}`;
    this.io.to(gameRoom).emit('GAME_STATE', { state: game.getState() });
  }

  private handleAgoraTokenRequest(socket: Socket, channelName: string, uid?: number): void {
    const session = this.getSession(socket);
    if (!session) return;

    try {
      if (!agoraTokenService.isConfigured()) {
        socket.emit('ERROR', { message: 'Video chat not configured' });
        return;
      }

      const tokenResponse = agoraTokenService.generateToken(channelName, uid || 0);
      socket.emit('AGORA_TOKEN', tokenResponse);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to generate token';
      socket.emit('ERROR', { message });
    }
  }

  private handleDisconnect(socket: Socket): void {
    const session = this.sessions.get(socket.id);
    if (session) {
      // Leave lobby if in one
      if (session.currentLobbyId) {
        const lobby = lobbyManager.leaveLobby(session.currentLobbyId, session.userId);
        if (lobby) {
          this.io.to(`lobby:${session.currentLobbyId}`).emit('LOBBY_STATE', { lobby });
          this.io.to(`lobby:${session.currentLobbyId}`).emit('PLAYER_LEFT', {
            playerId: session.userId,
            displayName: session.displayName,
          });
        }
      }

      this.sessions.delete(socket.id);
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    }
  }
}
