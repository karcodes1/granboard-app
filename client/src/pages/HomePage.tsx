import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Target, Users, LogIn, UserPlus, LogOut, Plus, Bluetooth, BluetoothOff, User, Settings, RefreshCw, X } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const {
    user,
    isConnected,
    registerWithEmail,
    signInWithEmail,
    signInAnonymously,
    signOut,
    isAuthLoading,
    error,
    clearError,
    isBleConnected,
    isBleConnecting,
    bleDeviceName,
    connectBle,
    disconnectBle,
    createLobby,
    serverDisplayName,
    activeGame,
    fetchActiveGame,
    reconnectToGame,
    leaveGame,
  } = useGameStore();

  // Fetch active game when connected
  useEffect(() => {
    if (isConnected && user) {
      fetchActiveGame();
    }
  }, [isConnected, user, fetchActiveGame]);

  const [formMode, setFormMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateLobby = () => {
    if (activeGame) {
      // User is already in a game, show error
      return;
    }
    // Immediately create lobby with default 501 settings
    createLobby('501', { startingScore: 501, doubleOut: true, doubleIn: false, legs: 1, sets: 1 });
    navigate('/lobby');
  };

  const handleBrowseLobbies = () => {
    navigate('/lobby');
  };

  const handleReconnect = () => {
    if (activeGame) {
      reconnectToGame(activeGame.gameId, activeGame.lobbyId);
      navigate('/game');
    }
  };

  const handleLeaveActiveGame = () => {
    leaveGame();
  };

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();

    if (!email || !password || (formMode === 'register' && !displayName)) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (formMode === 'register') {
        await registerWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Auth screen - optimized for viewport fit
  if (!user) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="w-full max-w-md lg:max-w-2xl">
          <div className="flex flex-col lg:flex-row lg:gap-8 items-center">
            {/* Branding - hidden on small landscape */}
            <div className="text-center lg:flex-1 mb-4 lg:mb-0">
              <Target className="w-12 h-12 lg:w-16 lg:h-16 mx-auto text-emerald-500 mb-2" />
              <h1 className="text-2xl lg:text-3xl font-bold">Dart Game</h1>
              <p className="text-sm text-gray-400 hidden sm:block">
                Multiplayer darts with GranBoard
              </p>
            </div>

            {/* Auth Form */}
            <div className="card w-full lg:flex-1 p-4">
              {error && (
                <div className="bg-red-900/50 text-red-300 px-3 py-2 rounded mb-3 text-sm">
                  {error}
                  <button onClick={clearError} className="ml-2 underline">×</button>
                </div>
              )}

              <div className="flex justify-center gap-3 text-xs text-gray-400 mb-3">
                <button
                  className={`uppercase tracking-wide font-semibold ${formMode === 'signin' ? 'text-emerald-400' : 'hover:text-gray-200'}`}
                  onClick={() => setFormMode('signin')}
                  type="button"
                >
                  Sign In
                </button>
                <span>|</span>
                <button
                  className={`uppercase tracking-wide font-semibold ${formMode === 'register' ? 'text-emerald-400' : 'hover:text-gray-200'}`}
                  onClick={() => setFormMode('register')}
                  type="button"
                >
                  Register
                </button>
              </div>

              <form className="space-y-2" onSubmit={handleAuthSubmit}>
                {formMode === 'register' && (
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input text-sm py-2"
                    placeholder="Display Name"
                    required
                  />
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input text-sm py-2"
                  placeholder="Email"
                  required
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input text-sm py-2"
                  placeholder="Password"
                  required
                  minLength={6}
                />
                <button
                  type="submit"
                  className="btn btn-primary w-full py-2 text-sm flex items-center justify-center gap-2"
                  disabled={isSubmitting || isAuthLoading}
                >
                  {formMode === 'register' ? (
                    <><UserPlus className="w-4 h-4" /> Register</>
                  ) : (
                    <><LogIn className="w-4 h-4" /> Sign In</>
                  )}
                </button>
              </form>

              <button
                onClick={signInAnonymously}
                className="btn btn-secondary w-full py-2 text-sm mt-2"
              >
                Play as Guest
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Logged in - optimized for viewport fit
  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="w-full max-w-lg lg:max-w-3xl">
        <div className="flex flex-col lg:flex-row lg:gap-6">
          {/* Left: Profile & Settings */}
          <div className="lg:flex-1 space-y-3 mb-4 lg:mb-0">
            {/* Compact Header */}
            <div className="flex items-center gap-3">
              <Target className="w-8 h-8 text-emerald-500 flex-shrink-0" />
              <div>
                <h1 className="text-xl font-bold">Dart Game</h1>
                <p className="text-xs text-gray-400">
                  {isConnected ? 'Ready to play' : 'Connecting...'}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 text-red-300 px-3 py-2 rounded text-sm">
                {error}
                <button onClick={clearError} className="ml-2 underline">×</button>
              </div>
            )}

            {/* Profile Card */}
            <div className="card p-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0 hover:bg-emerald-500 transition-colors"
                >
                  <User className="w-5 h-5" />
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                >
                  <p className="font-medium text-sm truncate">
                    {serverDisplayName || user?.displayName || 'Set Display Name'}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user?.isAnonymous ? 'Guest' : user?.email}
                  </p>
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="btn btn-secondary p-2 flex-shrink-0"
                  title="Profile Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={signOut}
                  className="btn btn-secondary p-2 flex-shrink-0"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* GranBoard */}
            <div className="card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isBleConnected ? (
                    <Bluetooth className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <BluetoothOff className="w-4 h-4 text-gray-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium">GranBoard</p>
                    <p className="text-xs text-gray-400">
                      {isBleConnected ? bleDeviceName : 'Not connected'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={isBleConnected ? disconnectBle : connectBle}
                  disabled={isBleConnecting}
                  className={`btn text-xs px-3 py-1.5 ${isBleConnected ? 'btn-secondary' : 'btn-primary'}`}
                >
                  {isBleConnecting ? '...' : isBleConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="lg:flex-1 flex flex-col gap-3">
            {/* Active Game Alert */}
            {activeGame && (
              <div className="card p-3 border border-amber-500 bg-amber-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <RefreshCw className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">Active Game</span>
                </div>
                <p className="text-xs text-gray-300 mb-3">
                  You have an active {activeGame.gameType} game. Rejoin or leave to start a new game.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReconnect}
                    className="btn btn-primary flex-1 py-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4 inline mr-1" /> Rejoin
                  </button>
                  <button
                    onClick={handleLeaveActiveGame}
                    className="btn btn-secondary p-2"
                    title="Leave game"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleCreateLobby}
              disabled={!isConnected || !!activeGame}
              className="btn btn-primary flex-1 min-h-[60px] text-lg flex items-center justify-center gap-3"
            >
              <Plus className="w-6 h-6" />
              Create Lobby
            </button>

            <button
              onClick={handleBrowseLobbies}
              disabled={!isConnected || !!activeGame}
              className="btn btn-secondary flex-1 min-h-[50px] flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5" />
              Browse Lobbies
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
