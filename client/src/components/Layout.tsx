import { ReactNode, useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Target, Bluetooth, Wifi, WifiOff, LogOut, User } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isGamePage = location.pathname === '/game';
  const headerRef = useRef<HTMLElement>(null);
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null);

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

  // Wake Lock API - prevent device from sleeping during game
  useEffect(() => {
    if (!isGamePage) {
      // Release wake lock when leaving game page
      wakeLock?.release();
      setWakeLock(null);
      return;
    }

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          const lock = await navigator.wakeLock.request('screen');
          setWakeLock(lock);
          lock.addEventListener('release', () => setWakeLock(null));
        } catch (err) {
          console.warn('Wake Lock not available:', err);
        }
      }
    };

    requestWakeLock();

    // Re-acquire wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isGamePage) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      wakeLock?.release();
    };
  }, [isGamePage]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-900 text-white flex flex-col">
      {/* Header - hidden on game page */}
      {!isGamePage && (
      <header ref={headerRef} className="bg-gray-800 border-b border-gray-700 safe-top flex-shrink-0">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 text-lg sm:text-xl font-bold text-emerald-500">
            <Target className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="hidden xs:inline">Dart Game</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Connection Status */}
            <div className="flex items-center gap-2 sm:gap-3 text-sm">
              {/* Server Status */}
              <div className={`flex items-center gap-1 ${isConnected ? 'text-green-400' : 'text-gray-400'}`}>
                {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </div>

              {/* BLE Status */}
              <button
                onClick={isBleConnected ? disconnectBle : connectBle}
                className={`flex items-center gap-1 px-2 py-1.5 rounded transition-colors min-h-[36px] ${
                  isBleConnected
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Bluetooth className="w-4 h-4" />
                <span className="hidden sm:inline text-xs sm:text-sm">
                  {isBleConnected ? bleDeviceName || 'Board' : 'Board'}
                </span>
              </button>

            </div>

            {/* User Menu */}
            {user && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="hidden sm:flex items-center gap-1 text-sm text-gray-300">
                  <User className="w-4 h-4" />
                  <span className="hidden md:inline">{serverDisplayName || user.email || 'Guest'}</span>
                </div>
                <button
                  onClick={signOut}
                  className="p-2 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      )}

      {/* Main Content - fills remaining space */}
      <main
        className={`flex-1 w-full mx-auto safe-bottom ${
          isGamePage ? 'overflow-hidden h-[100dvh]' : 'max-w-7xl px-2 sm:px-4 py-4 sm:py-6 overflow-y-auto'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
