import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useGameStore } from './store/gameStore';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { ProfilePage } from './pages/ProfilePage';
import { Layout } from './components/Layout';

function App() {
  const { initialize, user, isAuthLoading } = useGameStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/lobby"
          element={user ? <LobbyPage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/game"
          element={user ? <GamePage /> : <Navigate to="/" replace />}
        />
        <Route
          path="/profile"
          element={user ? <ProfilePage /> : <Navigate to="/" replace />}
        />
      </Routes>
    </Layout>
  );
}

export default App;
