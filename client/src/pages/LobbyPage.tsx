import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Users, UserPlus, X, Play, ArrowLeft, Check, Settings, RefreshCcw, Target } from 'lucide-react';

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
    error,
    clearError,
  } = useGameStore();

  // Navigate to game when game starts
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
    if (name?.trim()) {
      addGuest(name.trim());
    }
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

  if (!currentLobby) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-1">Available Lobbies</h1>
            <p className="text-gray-400">Join a lobby below or create one from the home screen.</p>
          </div>
          <button
            onClick={refreshLobbies}
            disabled={!isConnected}
            className="btn btn-secondary flex items-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded mb-4">
            {error}
            <button onClick={clearError} className="ml-2 underline">
              Dismiss
            </button>
          </div>
        )}

        {availableLobbies.length === 0 ? (
          <div className="card text-center py-12">
            <Target className="w-12 h-12 mx-auto text-emerald-500 mb-3" />
            <p className="text-gray-300 mb-2">No public lobbies are open right now.</p>
            <p className="text-sm text-gray-500">Create one from the home page to invite friends.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {availableLobbies.map((lobby) => (
              <div key={lobby.lobbyId} className="card flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm text-gray-400">Host</p>
                  <p className="text-lg font-semibold">{lobby.ownerDisplayName}</p>
                  <div className="text-sm text-gray-400 flex gap-4 mt-2 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" /> {lobby.players.length}/{lobby.maxPlayers}
                    </span>
                    <span className="uppercase">{lobby.gameType}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm text-gray-400">
                    Created {new Date(lobby.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <button
                    onClick={() => joinLobby(lobby.lobbyId)}
                    disabled={!isConnected}
                    className="btn btn-primary"
                  >
                    Join Lobby
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <button onClick={() => navigate('/')} className="btn btn-secondary">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleLeaveLobby}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Leave Lobby
        </button>
        <div className="text-right">
          <span className="text-sm text-gray-400">Game Type</span>
          <p className="text-xl font-bold text-emerald-500 uppercase">
            {currentLobby.gameType}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded mb-4">
          {error}
          <button onClick={clearError} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Lobby Info */}
      <div className="card mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Players ({currentLobby.players.length}/{currentLobby.maxPlayers})
          </h2>
          <button
            onClick={handleAddGuest}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <UserPlus className="w-4 h-4" />
            Add Guest
          </button>
        </div>

        {/* Player List */}
        <div className="space-y-2">
          {currentLobby.players.map((player) => {
            const isCurrentUser = player.id === serverUserId;
            const isMyGuest = player.ownerUserId === serverUserId && player.type === 'guest';

            return (
              <div
                key={player.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isCurrentUser
                    ? 'bg-emerald-900/30 border border-emerald-700'
                    : 'bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      player.type === 'guest' ? 'bg-gray-600' : 'bg-emerald-600'
                    }`}
                  >
                    {player.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">
                      {player.displayName}
                      {player.id === currentLobby.ownerUserId && (
                        <span className="ml-2 text-xs bg-amber-600 px-2 py-0.5 rounded">
                          Host
                        </span>
                      )}
                      {player.type === 'guest' && (
                        <span className="ml-2 text-xs text-gray-400">(Guest)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {player.isReady && (
                    <span className="text-green-400 flex items-center gap-1 text-sm">
                      <Check className="w-4 h-4" /> Ready
                    </span>
                  )}
                  {isMyGuest && (
                    <button
                      onClick={() => removeGuest(player.id)}
                      className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Options (Owner only) */}
      {isOwner && (
        <div className="card mb-6">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Game Options
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Starting Score:</span>
              <span className="ml-2">{currentLobby.gameOptions.startingScore || 501}</span>
            </div>
            <div>
              <span className="text-gray-400">Double Out:</span>
              <span className="ml-2">{currentLobby.gameOptions.doubleOut ? 'Yes' : 'No'}</span>
            </div>
            <div>
              <span className="text-gray-400">Legs:</span>
              <span className="ml-2">{currentLobby.gameOptions.legs || 1}</span>
            </div>
            <div>
              <span className="text-gray-400">Sets:</span>
              <span className="ml-2">{currentLobby.gameOptions.sets || 1}</span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        {!isOwner && (
          <button
            onClick={() => setReady(!isReady)}
            className={`btn flex-1 flex items-center justify-center gap-2 ${
              isReady ? 'btn-secondary' : 'btn-primary'
            }`}
          >
            {isReady ? (
              <>
                <X className="w-5 h-5" /> Not Ready
              </>
            ) : (
              <>
                <Check className="w-5 h-5" /> Ready
              </>
            )}
          </button>
        )}

        {isOwner && (
          <button
            onClick={startGame}
            disabled={!canStart}
            className="btn btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5" />
            Start Game
            {!allReady && <span className="text-xs">(Waiting for players)</span>}
          </button>
        )}
      </div>
    </div>
  );
}
