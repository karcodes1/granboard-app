import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Target, Bluetooth, Wifi, WifiOff, LogOut, User } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const {
    user,
    isConnected,
    isBleConnected,
    bleDeviceName,
    serverDisplayName,
    signOut,
    connectBle,
    disconnectBle,
  } = useGameStore();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-emerald-500">
            <Target className="w-6 h-6" />
            <span>Dart Game</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-3 text-sm">
              {/* Server Status */}
              <div className={`flex items-center gap-1 ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                <span className="hidden sm:inline">{isConnected ? 'Connected' : 'Offline'}</span>
              </div>

              {/* BLE Status */}
              <button
                onClick={isBleConnected ? disconnectBle : connectBle}
                className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                  isBleConnected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Bluetooth className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isBleConnected ? bleDeviceName || 'Board' : 'Connect Board'}
                </span>
              </button>
            </div>

            {/* User Menu */}
            {user && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-sm text-gray-300">
                  <User className="w-4 h-4" />
                  <span className="hidden sm:inline">{serverDisplayName || user.email || 'Guest'}</span>
                </div>
                <button
                  onClick={signOut}
                  className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
