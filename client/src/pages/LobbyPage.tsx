import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Users, UserPlus, X, Play, ArrowLeft, Check, Settings, RefreshCcw, Target } from 'lucide-react';
import type { GameType, GameOptions } from '../types';

const GAME_TYPES: { id: GameType; name: string; desc: string; color: string }[] = [
  { id: '501', name: '501', desc: 'Classic', color: 'bg-emerald-600' },
  { id: '301', name: '301', desc: 'Quick', color: 'bg-blue-600' },
  { id: 'cricket', name: 'Cricket', desc: 'Close out', color: 'bg-red-600' },
  { id: 'tictactoe', name: 'TicTacToe', desc: 'Claim squares', color: 'bg-purple-600' },
];

export function LobbyPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isCreating = searchParams.get('create') === 'true';

  const {
    currentLobby,
    availableLobbies,
    gameState,
    serverUserId,
    isConnected,
    createLobby,
    leaveLobby,
    addGuest,
    removeGuest,
    setReady,
    startGame,
    joinLobby,
    refreshLobbies,
    error,
    clearError,
  } = useGameStore();

  const [selectedGameType, setSelectedGameType] = useState<GameType>('501');
  const [gameOptions, setGameOptions] = useState<GameOptions>({
    startingScore: 501,
    doubleOut: true,
    legs: 1,
    sets: 1,
  });

  useEffect(() => {
    if (gameState?.state === 'playing') {
      navigate('/game');
    }
  }, [gameState, navigate]);

  useEffect(() => {
    if (!currentLobby && !isCreating) {
      refreshLobbies();
    }
  }, [currentLobby, isCreating, refreshLobbies]);

  useEffect(() => {
    if (selectedGameType === '501') {
      setGameOptions(prev => ({ ...prev, startingScore: 501 }));
    } else if (selectedGameType === '301') {
      setGameOptions(prev => ({ ...prev, startingScore: 301 }));
    }
  }, [selectedGameType]);

  const handleCreateLobby = () => createLobby(selectedGameType, gameOptions);
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

  // Game Creation View - viewport fit
  if (!currentLobby && isCreating) {
    return (
      <div className="h-full flex flex-col overflow-hidden p-2">
        {/* Header */}
        <div className="flex items-center justify-between py-2 flex-shrink-0 border-b border-gray-700">
          <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white p-1">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-bold">Create Lobby</h1>
          <div className="w-6" />
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-300 px-3 py-1 rounded mt-2 text-sm flex-shrink-0">
            {error}
            <button onClick={clearError} className="ml-2">×</button>
          </div>
        )}

        {/* Content - two column on landscape */}
        <div className="flex-1 min-h-0 overflow-hidden py-2">
          <div className="h-full flex flex-col lg:flex-row gap-3">
            {/* Game Types */}
            <div className="flex-1 min-h-0 overflow-auto lg:overflow-hidden">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <Target className="w-3 h-3" /> Game Type
              </p>
              <div className="grid grid-cols-2 gap-2">
                {GAME_TYPES.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGameType(game.id)}
                    className={`p-2 rounded-lg border-2 text-left ${
                      selectedGameType === game.id
                        ? 'border-emerald-500 bg-emerald-900/20'
                        : 'border-gray-700'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${game.color} flex items-center justify-center text-xs font-bold mb-1`}>
                      {game.id === 'cricket' ? '🎯' : game.id === 'tictactoe' ? '#' : game.name}
                    </div>
                    <p className="text-sm font-medium">{game.name}</p>
                    <p className="text-xs text-gray-400">{game.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            {(selectedGameType === '501' || selectedGameType === '301') && (
              <div className="flex-1 min-h-0">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <Settings className="w-3 h-3" /> Options
                </p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Double Out</span>
                    <button
                      onClick={() => setGameOptions(prev => ({ ...prev, doubleOut: !prev.doubleOut }))}
                      className={`w-10 h-5 rounded-full ${gameOptions.doubleOut ? 'bg-emerald-600' : 'bg-gray-600'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transform transition-transform ${gameOptions.doubleOut ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Legs</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setGameOptions(prev => ({ ...prev, legs: Math.max(1, (prev.legs || 1) - 1) }))} className="btn btn-secondary px-2 py-0.5 text-xs">-</button>
                      <span className="w-6 text-center text-sm">{gameOptions.legs || 1}</span>
                      <button onClick={() => setGameOptions(prev => ({ ...prev, legs: Math.min(7, (prev.legs || 1) + 1) }))} className="btn btn-secondary px-2 py-0.5 text-xs">+</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sets</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setGameOptions(prev => ({ ...prev, sets: Math.max(1, (prev.sets || 1) - 1) }))} className="btn btn-secondary px-2 py-0.5 text-xs">-</button>
                      <span className="w-6 text-center text-sm">{gameOptions.sets || 1}</span>
                      <button onClick={() => setGameOptions(prev => ({ ...prev, sets: Math.min(7, (prev.sets || 1) + 1) }))} className="btn btn-secondary px-2 py-0.5 text-xs">+</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={handleCreateLobby}
          disabled={!isConnected}
          className="btn btn-primary w-full py-3 flex-shrink-0 flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" /> Create Lobby
        </button>
      </div>
    );
  }

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
            <div className="space-y-1">
              {currentLobby.players.map((player) => {
                const isCurrentUser = player.id === serverUserId;
                const isMyGuest = player.ownerUserId === serverUserId && player.type === 'guest';
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-2 rounded ${
                      isCurrentUser ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-gray-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${player.type === 'guest' ? 'bg-gray-600' : 'bg-emerald-600'}`}>
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
          </div>

          {/* Options (show for owner) */}
          {isOwner && (
            <div className="flex-shrink-0 lg:w-48">
              <p className="text-xs text-gray-400 mb-2">Options</p>
              <div className="bg-gray-800 rounded p-2 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Score:</span>
                  <span>{currentLobby.gameOptions.startingScore || 501}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Double Out:</span>
                  <span>{currentLobby.gameOptions.doubleOut ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Legs/Sets:</span>
                  <span>{currentLobby.gameOptions.legs || 1}/{currentLobby.gameOptions.sets || 1}</span>
                </div>
              </div>
            </div>
          )}
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
