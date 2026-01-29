import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Target, Undo2, SkipForward, Trophy, ArrowLeft, RotateCcw, Home, Video, Maximize } from 'lucide-react';
import { VideoChat } from '../components/VideoChat';
import { ZeroOneGame, TicTacToeGame, CricketGame } from '../components/games';
import type { GameState, PlayerGameState } from '../types';

export function GamePage() {
  const navigate = useNavigate();
  const [showVideo, setShowVideo] = useState(false);
  const {
    gameState,
    currentLobby,
    serverUserId,
    leaveLobby,
    sendThrow,
    endTurn,
    undoThrow,
    requestRematch,
    isBleConnected,
  } = useGameStore();

  const isHost = currentLobby?.ownerUserId === serverUserId;

  useEffect(() => {
    if (!gameState) {
      navigate('/');
    }
  }, [gameState, navigate]);

  if (!gameState) {
    return null;
  }

  const currentPlayer = gameState.players[gameState.currentPlayerId];
  const isFinished = gameState.state === 'finished';
  const winner = gameState.winnerId ? gameState.players[gameState.winnerId] : null;
  const dartsThrown = currentPlayer.roundThrows.length;
  const dartsRemaining = 3 - dartsThrown;
  const isZeroOneGame = gameState.gameType === '501' || gameState.gameType === '301';

  const handleManualThrow = () => {
    const input = prompt('Enter throw (e.g., S20, D16, T19, SB, DB):');
    if (!input) return;

    const upperInput = input.toUpperCase().trim();
    let multiplier = 'S';
    let value = 0;
    let points = 0;

    if (upperInput === 'SB') {
      multiplier = 'SB';
      value = 25;
      points = 25;
    } else if (upperInput === 'DB') {
      multiplier = 'DB';
      value = 25;
      points = 50;
    } else if (upperInput === 'OUT' || upperInput === '0') {
      multiplier = 'OUT';
      value = 0;
      points = 0;
    } else {
      multiplier = upperInput.charAt(0);
      value = parseInt(upperInput.substring(1), 10);
      if (isNaN(value) || value < 1 || value > 20) {
        alert('Invalid throw');
        return;
      }
      if (multiplier === 'D') points = value * 2;
      else if (multiplier === 'T') points = value * 3;
      else points = value;
    }

    sendThrow(multiplier, value, points);
  };

  const handleLeaveGame = () => {
    leaveLobby();
    navigate('/');
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen not supported:', err);
    }
  };

  // Winner screen - also optimized for viewport
  if (isFinished && winner) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="card max-w-sm w-full text-center">
          <Trophy className="w-12 h-12 mx-auto text-amber-500 mb-2" />
          <h1 className="text-2xl font-bold mb-1">Game Over!</h1>
          <p className="text-lg text-emerald-400 mb-4">{winner.displayName} wins!</p>
          <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">Darts:</span> {winner.stats.dartsThrown}
            </div>
            <div className="bg-gray-700 rounded p-2">
              <span className="text-gray-400">Best:</span> {winner.stats.highestRound}
            </div>
          </div>
          <div className="flex gap-2">
            {isHost ? (
              <button onClick={requestRematch} className="btn btn-primary flex-1 text-sm py-2">
                <RotateCcw className="w-4 h-4 inline mr-1" /> Again
              </button>
            ) : (
              <div className="flex-1 text-gray-400 text-xs py-2">Waiting for host...</div>
            )}
            <button onClick={handleLeaveGame} className="btn btn-secondary flex-1 text-sm py-2">
              <Home className="w-4 h-4 inline mr-1" /> Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-full flex flex-col overflow-hidden px-2"
      data-testid="game-page-root"
    >
      {/* MINI HEADER - just leave button, game type, and controls */}
      <div className="flex items-center justify-between py-1 px-1 flex-shrink-0 border-b border-gray-700">
        <button onClick={handleLeaveGame} className="text-gray-400 hover:text-white p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-emerald-500 font-bold uppercase text-sm">{gameState.gameType}</span>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded bg-gray-700 text-gray-400 hover:text-white"
            title="Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowVideo(!showVideo)}
            aria-label="Toggle video chat"
            className={`p-1.5 rounded ${showVideo ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400'}`}
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MAIN CONTENT: Game on left, Video on right */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full grid grid-cols-2 gap-1 p-1 min-h-0 overflow-hidden">
          {/* Left side: Game-specific content */}
          <div className="min-h-0 overflow-hidden rounded-lg bg-gray-800">
            <GameContent
              gameState={gameState}
              currentPlayer={currentPlayer}
              dartsRemaining={dartsRemaining}
              isZeroOneGame={isZeroOneGame}
            />
          </div>

          {/* Right side: Video chat */}
          <div className="min-h-0 overflow-hidden rounded-lg bg-gray-800">
            <VideoChat channelName={gameState.gameId} inline />
          </div>
        </div>
      </div>

      {/* BUTTONS */}
      <div className="flex gap-2 py-2 flex-shrink-0 border-t border-gray-700">
        {!isBleConnected && (
          <button onClick={handleManualThrow} className="btn btn-primary flex-1 py-2 text-sm">
            <Target className="w-4 h-4 inline mr-1" /> Throw
          </button>
        )}
        <button
          onClick={undoThrow}
          disabled={dartsThrown === 0}
          className="btn btn-secondary flex-1 py-2 text-sm"
        >
          <Undo2 className="w-4 h-4 inline mr-1" /> Undo
        </button>
        <button
          onClick={endTurn}
          disabled={dartsThrown === 0}
          className="btn btn-secondary flex-1 py-2 text-sm"
        >
          <SkipForward className="w-4 h-4 inline mr-1" /> End
        </button>
      </div>
    </div>
  );
}

interface GameContentProps {
  gameState: GameState;
  currentPlayer: PlayerGameState;
  dartsRemaining: number;
  isZeroOneGame: boolean;
}

function GameContent({ gameState, currentPlayer, dartsRemaining, isZeroOneGame }: GameContentProps) {
  if (isZeroOneGame) {
    return (
      <ZeroOneGame
        gameState={gameState}
        currentPlayer={currentPlayer}
        dartsRemaining={dartsRemaining}
      />
    );
  }

  if (gameState.gameType === 'tictactoe') {
    return <TicTacToeGame gameState={gameState} currentPlayer={currentPlayer} />;
  }

  if (gameState.gameType === 'cricket') {
    return <CricketGame gameState={gameState} currentPlayer={currentPlayer} />;
  }

  return (
    <div className="h-full flex items-center justify-center text-gray-500">
      Unknown game type
    </div>
  );
}
