import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Users, UserPlus, X, Play, ArrowLeft, Check, RefreshCcw, Target } from 'lucide-react';
import type { GameType, GameOptions, TeamMode, TeamConfig, LobbyPlayer } from '../types';
import { PLAYER_COLORS } from '../types';

const GAME_TYPES: { id: GameType; name: string; desc: string; color: string }[] = [
  { id: '501', name: '501', desc: 'Classic', color: 'bg-emerald-600' },
  { id: '301', name: '301', desc: 'Quick', color: 'bg-blue-600' },
  { id: 'gotcha', name: 'Gotcha', desc: 'Kill mode', color: 'bg-amber-600' },
  { id: 'cricket', name: 'Cricket', desc: 'Close out', color: 'bg-red-600' },
  { id: 'tictactoe', name: 'TicTacToe', desc: 'Claim squares', color: 'bg-purple-600' },
];

// Team configurations with required player counts
const TEAM_CONFIGS: { id: TeamConfig; name: string; minPlayers: number; teamCount: number }[] = [
  { id: '2v2', name: '2v2', minPlayers: 4, teamCount: 2 },
  { id: '3v3', name: '3v3', minPlayers: 6, teamCount: 2 },
  { id: '4v4', name: '4v4', minPlayers: 8, teamCount: 2 },
  { id: '2v2v2', name: '2v2v2', minPlayers: 6, teamCount: 3 },
  { id: '2v2v2v2', name: '2v2v2v2', minPlayers: 8, teamCount: 4 },
];

// Get available team configs based on game type and player count
function getAvailableTeamConfigs(gameType: GameType, playerCount: number): typeof TEAM_CONFIGS {
  const isTwoTeamOnly = gameType === 'cricket' || gameType === 'tictactoe';
  return TEAM_CONFIGS.filter(config => {
    if (config.minPlayers > playerCount) return false;
    if (isTwoTeamOnly && config.teamCount !== 2) return false;
    // 01 games support all team configurations
    return true;
  });
}

// Check if team mode is supported for game type
function supportsTeamMode(_gameType: GameType): boolean {
  return true; // All games support some form of team mode
}

// Get player color based on team or FFA mode
function getPlayerColor(player: LobbyPlayer, teamMode: TeamMode, teams: { id: string; colorId: string }[]): { bg: string; border: string } {
  if (teamMode === 'teams' && player.teamId) {
    const team = teams.find(t => t.id === player.teamId);
    if (team) {
      const color = PLAYER_COLORS.find(c => c.id === team.colorId);
      if (color) return { bg: color.bg, border: color.border };
    }
  }
  // FFA mode - use colorIndex
  if (player.colorIndex !== undefined) {
    const color = PLAYER_COLORS[player.colorIndex];
    if (color) return { bg: color.bg, border: color.border };
  }
  return { bg: 'bg-gray-600', border: 'border-gray-500' };
}

export function LobbyPage() {
  const navigate = useNavigate();

  const {
    currentLobby,
    availableLobbies,
    gameState,
    serverUserId,
    isConnected,
    leaveLobby,
    addGuest,
    removeGuest,
    setReady,
    startGame,
    joinLobby,
    refreshLobbies,
    updateOptions,
    setTeamMode,
    assignTeam,
    error,
    clearError,
  } = useGameStore();

  useEffect(() => {
    if (gameState?.state === 'playing') {
      navigate('/game');
    }
  }, [gameState, navigate]);

  useEffect(() => {
    if (!currentLobby) {
      refreshLobbies();
    }
  }, [currentLobby, refreshLobbies]);
  const handleAddGuest = () => {
    const name = prompt('Enter guest name:');
    if (name?.trim()) addGuest(name.trim());
  };
  const handleLeaveLobby = () => {
    leaveLobby();
    navigate('/');
  };

  const isOwner = currentLobby?.ownerUserId === serverUserId;
  const currentPlayer = currentLobby?.players.find(p => p.id === serverUserId);
  const isReady = currentPlayer?.isReady ?? false;
  const allReady = currentLobby?.players.every(p => p.isReady) ?? false;
  const canStart = isOwner && allReady && (currentLobby?.players.length ?? 0) >= 2;

  const handleGameTypeChange = (gameType: GameType) => {
    let options: GameOptions = {};
    if (gameType === '501' || gameType === '301') {
      options = { startingScore: gameType === '501' ? 501 : 301, doubleOut: true, doubleIn: false, legs: 1, sets: 1 };
    } else if (gameType === 'gotcha') {
      options = { startingScore: 301, doubleOut: true, doubleIn: false, legs: 1, sets: 1 };
    }
    updateOptions(options, gameType);
  };

  const handleOptionChange = (key: keyof GameOptions, value: boolean | number) => {
    const newOptions = { ...currentLobby?.gameOptions, [key]: value };
    if (key === 'doubleIn' && value === true) {
      // If enabling double-in, also enable double-out typically
    }
    updateOptions(newOptions);
  };

  const isZeroOneGame = currentLobby?.gameType === '501' || currentLobby?.gameType === '301' || currentLobby?.gameType === 'gotcha';

  // Browse Lobbies View - viewport fit
  if (!currentLobby) {
    return (
      <div className="h-full flex flex-col overflow-hidden p-2">
        {/* Header */}
        <div className="flex items-center justify-between py-2 flex-shrink-0 border-b border-gray-700">
          <div>
            <h1 className="text-lg font-bold">Lobbies</h1>
            <p className="text-xs text-gray-400">Join or create</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/lobby?create=true')} disabled={!isConnected} className="btn btn-primary text-sm px-3 py-1.5">
              Create
            </button>
            <button onClick={refreshLobbies} disabled={!isConnected} className="btn btn-secondary p-1.5">
              <RefreshCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-300 px-3 py-1 rounded mt-2 text-sm flex-shrink-0">
            {error}
            <button onClick={clearError} className="ml-2">×</button>
          </div>
        )}

        {/* Lobby List */}
        <div className="flex-1 min-h-0 overflow-auto py-2">
          {availableLobbies.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <Target className="w-10 h-10 text-emerald-500 mb-2" />
              <p className="text-sm text-gray-300">No lobbies available</p>
              <button onClick={() => navigate('/lobby?create=true')} disabled={!isConnected} className="btn btn-primary mt-3 text-sm">
                Create One
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {availableLobbies.map((lobby) => (
                <div key={lobby.lobbyId} className="card p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{lobby.ownerDisplayName}</p>
                    <p className="text-xs text-gray-400">
                      <Users className="w-3 h-3 inline mr-1" />
                      {lobby.players.length}/{lobby.maxPlayers} · {lobby.gameType.toUpperCase()}
                    </p>
                  </div>
                  <button onClick={() => joinLobby(lobby.lobbyId)} disabled={!isConnected} className="btn btn-primary text-sm px-3 py-1.5">
                    Join
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Back */}
        <button onClick={() => navigate('/')} className="btn btn-secondary w-full py-2 flex-shrink-0 text-sm">
          Back to Home
        </button>
      </div>
    );
  }

  // In Lobby View - viewport fit
  return (
    <div className="h-full flex flex-col overflow-hidden p-2">
      {/* Header */}
      <div className="flex items-center justify-between py-2 flex-shrink-0 border-b border-gray-700">
        <button onClick={handleLeaveLobby} className="text-gray-400 hover:text-white p-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-lg font-bold text-emerald-500 uppercase">{currentLobby.gameType}</p>
          <p className="text-xs text-gray-400">{currentLobby.players.length}/{currentLobby.maxPlayers} players</p>
        </div>
        <button onClick={handleAddGuest} className="btn btn-secondary p-1.5" title="Add Guest">
          <UserPlus className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 px-3 py-1 rounded mt-2 text-sm flex-shrink-0">
          {error}
          <button onClick={clearError} className="ml-2">×</button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden py-2">
        <div className="h-full flex flex-col lg:flex-row gap-3">
          {/* Player List */}
          <div className="flex-1 min-h-0 overflow-auto">
            <p className="text-xs text-gray-400 mb-2">Players</p>
            {currentLobby.teamMode === 'teams' && currentLobby.teams.length > 0 ? (
              // Team view
              <div className="space-y-2">
                {currentLobby.teams.map((team) => {
                  const teamColor = PLAYER_COLORS.find(c => c.id === team.colorId);
                  const teamPlayers = currentLobby.players.filter(p => p.teamId === team.id);
                  const unassignedPlayers = currentLobby.players.filter(p => !p.teamId);
                  return (
                    <div key={team.id} className={`rounded border ${teamColor?.border || 'border-gray-600'} p-2`}>
                      <p className={`text-xs font-bold ${teamColor?.text || 'text-gray-400'} mb-1`}>{team.name}</p>
                      <div className="space-y-1">
                        {teamPlayers.map((player) => {
                          const isCurrentUser = player.id === serverUserId;
                          const isMyGuest = player.ownerUserId === serverUserId && player.type === 'guest';
                          return (
                            <div key={player.id} className={`flex items-center justify-between p-1.5 rounded ${isCurrentUser ? 'bg-gray-700' : 'bg-gray-800'}`}>
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${teamColor?.bg || 'bg-gray-600'}`}>
                                  {player.displayName.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs">{player.displayName}</span>
                                {player.id === currentLobby.ownerUserId && <span className="text-[10px] bg-amber-600 px-1 rounded">Host</span>}
                              </div>
                              <div className="flex items-center gap-1">
                                {player.isReady && <Check className="w-3 h-3 text-green-400" />}
                                {isMyGuest && (
                                  <button onClick={() => removeGuest(player.id)} className="p-0.5 text-gray-400 hover:text-red-400">
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {teamPlayers.length === 0 && (
                          <p className="text-xs text-gray-500 italic">No players assigned</p>
                        )}
                      </div>
                      {/* Drop zone for host to assign players */}
                      {isOwner && unassignedPlayers.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-gray-700">
                          <select
                            className="w-full bg-gray-700 text-xs rounded p-1"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) assignTeam(e.target.value, team.id);
                            }}
                          >
                            <option value="">+ Add player...</option>
                            {unassignedPlayers.map(p => (
                              <option key={p.id} value={p.id}>{p.displayName}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
                {/* Unassigned players */}
                {currentLobby.players.filter(p => !p.teamId).length > 0 && (
                  <div className="rounded border border-gray-600 p-2">
                    <p className="text-xs font-bold text-gray-400 mb-1">Unassigned</p>
                    <div className="space-y-1">
                      {currentLobby.players.filter(p => !p.teamId).map((player) => {
                        const isCurrentUser = player.id === serverUserId;
                        return (
                          <div key={player.id} className={`flex items-center justify-between p-1.5 rounded ${isCurrentUser ? 'bg-gray-700' : 'bg-gray-800'}`}>
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-600">
                                {player.displayName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs">{player.displayName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // FFA view
              <div className="space-y-1">
                {currentLobby.players.map((player) => {
                  const isCurrentUser = player.id === serverUserId;
                  const isMyGuest = player.ownerUserId === serverUserId && player.type === 'guest';
                  const playerColor = getPlayerColor(player, currentLobby.teamMode, currentLobby.teams);
                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between p-2 rounded border ${
                        isCurrentUser ? `${playerColor.border} bg-gray-800` : 'border-transparent bg-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${playerColor.bg}`}>
                          {player.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {player.displayName}
                            {player.id === currentLobby.ownerUserId && <span className="ml-1 text-[10px] bg-amber-600 px-1 rounded">Host</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {player.isReady && <Check className="w-4 h-4 text-green-400" />}
                        {isMyGuest && (
                          <button onClick={() => removeGuest(player.id)} className="p-1 text-gray-400 hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Game Type & Options */}
          <div className="flex-shrink-0 lg:w-56">
            {/* Game Type Selection (owner only) */}
            {isOwner ? (
              <>
                <p className="text-xs text-gray-400 mb-1">Game Type</p>
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {GAME_TYPES.map((game) => (
                    <button
                      key={game.id}
                      onClick={() => handleGameTypeChange(game.id)}
                      className={`p-1.5 rounded text-xs text-center ${
                        currentLobby.gameType === game.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {game.name}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="mb-2">
                <p className="text-xs text-gray-400">Game</p>
                <p className="text-sm font-bold text-emerald-400">{currentLobby.gameType.toUpperCase()}</p>
              </div>
            )}

            {/* Options */}
            {isZeroOneGame && (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">Options</p>
                
                {/* Double In */}
                <div className="flex items-center justify-between">
                  <span className="text-xs">Double In</span>
                  {isOwner ? (
                    <button
                      onClick={() => handleOptionChange('doubleIn', !currentLobby.gameOptions.doubleIn)}
                      className={`w-8 h-4 rounded-full ${currentLobby.gameOptions.doubleIn ? 'bg-emerald-600' : 'bg-gray-600'}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transform transition-transform ${currentLobby.gameOptions.doubleIn ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  ) : (
                    <span className="text-xs">{currentLobby.gameOptions.doubleIn ? 'Yes' : 'No'}</span>
                  )}
                </div>

                {/* Double Out */}
                <div className="flex items-center justify-between">
                  <span className="text-xs">Double Out</span>
                  {isOwner ? (
                    <button
                      onClick={() => handleOptionChange('doubleOut', !currentLobby.gameOptions.doubleOut)}
                      className={`w-8 h-4 rounded-full ${currentLobby.gameOptions.doubleOut ? 'bg-emerald-600' : 'bg-gray-600'}`}
                    >
                      <div className={`w-3 h-3 rounded-full bg-white transform transition-transform ${currentLobby.gameOptions.doubleOut ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  ) : (
                    <span className="text-xs">{currentLobby.gameOptions.doubleOut ? 'Yes' : 'No'}</span>
                  )}
                </div>

                {/* Legs */}
                <div className="flex items-center justify-between">
                  <span className="text-xs">Legs</span>
                  {isOwner ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOptionChange('legs', Math.max(1, (currentLobby.gameOptions.legs || 1) - 1))} className="btn btn-secondary px-1.5 py-0 text-xs">-</button>
                      <span className="w-4 text-center text-xs">{currentLobby.gameOptions.legs || 1}</span>
                      <button onClick={() => handleOptionChange('legs', Math.min(7, (currentLobby.gameOptions.legs || 1) + 1))} className="btn btn-secondary px-1.5 py-0 text-xs">+</button>
                    </div>
                  ) : (
                    <span className="text-xs">{currentLobby.gameOptions.legs || 1}</span>
                  )}
                </div>

                {/* Sets */}
                <div className="flex items-center justify-between">
                  <span className="text-xs">Sets</span>
                  {isOwner ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOptionChange('sets', Math.max(1, (currentLobby.gameOptions.sets || 1) - 1))} className="btn btn-secondary px-1.5 py-0 text-xs">-</button>
                      <span className="w-4 text-center text-xs">{currentLobby.gameOptions.sets || 1}</span>
                      <button onClick={() => handleOptionChange('sets', Math.min(7, (currentLobby.gameOptions.sets || 1) + 1))} className="btn btn-secondary px-1.5 py-0 text-xs">+</button>
                    </div>
                  ) : (
                    <span className="text-xs">{currentLobby.gameOptions.sets || 1}</span>
                  )}
                </div>
              </div>
            )}

            {/* Team Mode Selection */}
            {supportsTeamMode(currentLobby.gameType) && (
              <div className="space-y-2 mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-400">Team Mode</p>
                {isOwner ? (
                  <>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => setTeamMode('ffa')}
                        className={`p-1.5 rounded text-xs ${currentLobby.teamMode === 'ffa' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                      >
                        Free For All
                      </button>
                      <button
                        onClick={() => {
                          const configs = getAvailableTeamConfigs(currentLobby.gameType, currentLobby.players.length);
                          if (configs.length > 0) {
                            setTeamMode('teams', configs[0].id);
                          }
                        }}
                        disabled={getAvailableTeamConfigs(currentLobby.gameType, currentLobby.players.length).length === 0}
                        className={`p-1.5 rounded text-xs ${currentLobby.teamMode === 'teams' ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} disabled:opacity-50`}
                      >
                        Teams
                      </button>
                    </div>
                    {currentLobby.teamMode === 'teams' && (
                      <div className="space-y-1">
                        <p className="text-xs text-gray-500">Configuration</p>
                        <div className="flex flex-wrap gap-1">
                          {getAvailableTeamConfigs(currentLobby.gameType, currentLobby.players.length).map(config => (
                            <button
                              key={config.id}
                              onClick={() => setTeamMode('teams', config.id)}
                              className={`px-2 py-1 rounded text-xs ${currentLobby.teamConfig === config.id ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                            >
                              {config.name}
                            </button>
                          ))}
                        </div>
                        {currentLobby.players.filter(p => !p.teamId).length > 0 && (
                          <p className="text-xs text-amber-400 mt-1">
                            Assign all players to teams before starting
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm">
                    {currentLobby.teamMode === 'ffa' ? 'Free For All' : `Teams (${currentLobby.teamConfig})`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 flex-shrink-0 pt-2 border-t border-gray-700">
        {!isOwner && (
          <button
            onClick={() => setReady(!isReady)}
            className={`btn flex-1 py-2 flex items-center justify-center gap-2 ${isReady ? 'btn-secondary' : 'btn-primary'}`}
          >
            {isReady ? <><X className="w-4 h-4" /> Not Ready</> : <><Check className="w-4 h-4" /> Ready</>}
          </button>
        )}
        {isOwner && (
          <button
            onClick={startGame}
            disabled={!canStart}
            className="btn btn-primary flex-1 py-2 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" /> Start {!allReady && <span className="text-xs">(waiting)</span>}
          </button>
        )}
      </div>
    </div>
  );
}
