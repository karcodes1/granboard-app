import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Target, Users, Play, LogIn, UserPlus } from 'lucide-react';

export function HomePage() {
  const navigate = useNavigate();
  const {
    user,
    isConnected,
    registerWithEmail,
    signInWithEmail,
    signInAnonymously,
    createLobby,
    isAuthLoading,
    error,
    clearError,
  } = useGameStore();

  const [formMode, setFormMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateGame = (gameType: '501' | '301' | 'cricket' | 'tictactoe') => {
    createLobby(gameType);
    navigate('/lobby');
  };

  const handleJoinGame = () => {
    navigate('/lobby');
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

  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="card text-center">
          <Target className="w-16 h-16 mx-auto text-emerald-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2">Dart Game</h1>
          <p className="text-gray-400 mb-8">
            Real-time multiplayer darts with GranBoard support
          </p>

          {error && (
            <div className="bg-red-900/50 text-red-300 px-4 py-2 rounded mb-4">
              {error}
              <button onClick={clearError} className="ml-2 underline">
                Dismiss
              </button>
            </div>
          )}

          <div className="space-y-3 text-left">
            <div className="flex justify-center gap-3 text-sm text-gray-400">
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

            <form className="space-y-3" onSubmit={handleAuthSubmit}>
              {formMode === 'register' && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1" htmlFor="displayName">
                    Display Name
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="input"
                    placeholder="Nickname"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="input"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full flex items-center justify-center gap-2"
                disabled={isSubmitting || isAuthLoading}
              >
                {formMode === 'register' ? (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Create Account
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Sign In
                  </>
                )}
              </button>
            </form>

            <button
              onClick={signInAnonymously}
              className="btn btn-secondary w-full"
            >
              Play as Guest
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Welcome!</h1>
        <p className="text-gray-400">
          {isConnected
            ? 'Connected to server. Choose a game mode to start.'
            : 'Connecting to server...'}
        </p>
      </div>

      {error && (
        <div className="bg-red-900/50 text-red-300 px-4 py-3 rounded mb-6 text-center">
          {error}
          <button onClick={clearError} className="ml-2 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Game Modes */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card hover:border-emerald-500 border border-transparent transition-colors cursor-pointer"
             onClick={() => handleCreateGame('501')}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-emerald-600 flex items-center justify-center text-2xl font-bold">
              501
            </div>
            <div>
              <h2 className="text-xl font-bold">501</h2>
              <p className="text-gray-400">Classic countdown game</p>
            </div>
          </div>
        </div>

        <div className="card hover:border-emerald-500 border border-transparent transition-colors cursor-pointer"
             onClick={() => handleCreateGame('301')}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold">
              301
            </div>
            <div>
              <h2 className="text-xl font-bold">301</h2>
              <p className="text-gray-400">Quick countdown game</p>
            </div>
          </div>
        </div>

        <div className="card hover:border-emerald-500 border border-transparent transition-colors cursor-pointer"
             onClick={() => handleCreateGame('cricket')}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
              <Target className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Cricket</h2>
              <p className="text-gray-400">Close out segments to win</p>
            </div>
          </div>
        </div>

        <div className="card hover:border-emerald-500 border border-transparent transition-colors cursor-pointer"
             onClick={() => handleCreateGame('tictactoe')}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center text-2xl font-bold">
              #
            </div>
            <div>
              <h2 className="text-xl font-bold">Tic-Tac-Toe</h2>
              <p className="text-gray-400">Claim squares on the board</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={handleJoinGame}
          className="btn btn-secondary flex items-center justify-center gap-2"
          disabled={!isConnected}
        >
          <Users className="w-5 h-5" />
          Browse Lobbies
        </button>
      </div>
    </div>
  );
}
