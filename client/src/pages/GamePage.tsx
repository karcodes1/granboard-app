import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Target, Undo2, SkipForward, Trophy, ArrowLeft, RotateCcw, Home, Video } from 'lucide-react';
import { VideoChat } from '../components/VideoChat';
import { getCheckoutSuggestion } from '../utils/checkoutSuggestions';

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
  const checkoutSuggestion = getCheckoutSuggestion(currentPlayer.score, dartsRemaining);

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

  const formatDart = (dart: { multiplier: string; value: number }) => {
    if (dart.multiplier === 'OUT') return 'X';
    if (dart.multiplier === 'SB') return 'SB';
    if (dart.multiplier === 'DB') return 'DB';
    return `${dart.multiplier}${dart.value}`;
  };

  const getDartClass = (multiplier: string) => {
    if (multiplier === 'T') return 'bg-purple-600';
    if (multiplier === 'D' || multiplier === 'DB') return 'bg-emerald-600';
    if (multiplier === 'SB') return 'bg-amber-600';
    if (multiplier === 'OUT') return 'bg-gray-600';
    return 'bg-gray-700';
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
      {/* HEADER */}
      <div className="flex items-center justify-between py-1 flex-shrink-0 border-b border-gray-700">
        <button onClick={handleLeaveGame} className="text-gray-400 hover:text-white p-1">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-emerald-500 font-bold uppercase">{gameState.gameType}</span>
          <span className="text-gray-400">R{gameState.currentRound}</span>
          <span className="text-gray-400">L{gameState.currentLeg}/S{gameState.currentSet}</span>
        </div>
        <button
          onClick={() => setShowVideo(!showVideo)}
          aria-label="Toggle video chat"
          className={`p-1.5 rounded ${showVideo ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400'}`}
        >
          <Video className="w-4 h-4" />
        </button>
      </div>

      {/* CURRENT ROUND INFO: player name + darts thrown */}
      <div className="flex items-center justify-between py-2 flex-shrink-0 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-emerald-400">{currentPlayer.displayName}</span>
          <span className="text-xs text-gray-400">+{gameState.turn.roundScore}</span>
        </div>
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => {
            const dart = currentPlayer.roundThrows[i];
            return (
              <div
                key={i}
                className={`w-10 h-7 rounded text-xs font-mono flex items-center justify-center ${
                  dart ? getDartClass(dart.multiplier) : 'bg-gray-700/50 text-gray-500'
                }`}
              >
                {dart ? formatDart(dart) : '–'}
              </div>
            );
          })}
        </div>
      </div>

      {/* CHECKOUT SUGGESTION (if applicable) */}
      {checkoutSuggestion && !gameState.turn.isBust && (
        <div className="flex items-center justify-center gap-2 py-1 bg-amber-900/30 flex-shrink-0">
          <span className="text-xs text-amber-400">Checkout:</span>
          {checkoutSuggestion.map((dart, i) => (
            <span key={i} className="text-xs font-mono bg-amber-600/50 px-2 py-0.5 rounded">
              {dart}
            </span>
          ))}
        </div>
      )}

      {gameState.turn.isBust && (
        <div className="py-1 bg-red-900/50 text-center flex-shrink-0">
          <span className="text-xs text-red-300 font-bold">BUST!</span>
        </div>
      )}

      {/* SCORES + VIDEO GRID */}
      <div className="flex-1 min-h-0 py-1 overflow-hidden">
        {!showVideo ? (
          // Normal layout: scores side by side
          <div className="h-full grid grid-cols-2 gap-2">
            {gameState.playerOrder.map((playerId) => {
              const player = gameState.players[playerId];
              return (
                <PlayerScoreCard key={playerId} player={player} isCurrentPlayer={playerId === gameState.currentPlayerId} />
              );
            })}
          </div>
        ) : (
          // Video layout: scores on left, video on right
          <div className="h-full grid grid-cols-2 gap-1 min-h-0 overflow-hidden">
            <div className="flex flex-col gap-1 min-h-0 overflow-hidden">
              {gameState.playerOrder.map((playerId) => {
                const player = gameState.players[playerId];
                return (
                  <PlayerScoreCard key={playerId} player={player} isCurrentPlayer={playerId === gameState.currentPlayerId} compact />
                );
              })}
            </div>
            <div className="min-h-0 overflow-hidden rounded-lg">
              <VideoChat channelName={gameState.gameId} inline />
            </div>
          </div>
        )}
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

interface PlayerScoreCardProps {
  player: {
    displayName: string;
    score: number;
    legsWon: number;
    setsWon: number;
  };
  isCurrentPlayer: boolean;
  compact?: boolean;
}

function PlayerScoreCard({ player, isCurrentPlayer, compact }: PlayerScoreCardProps) {
  return (
    <div
      className={`rounded-lg p-2 flex flex-col items-center justify-center ${
        compact ? 'flex-1' : 'h-full'
      } ${isCurrentPlayer ? 'bg-emerald-900/30 ring-1 ring-emerald-500' : 'bg-gray-800'}`}
    >
      <span className={`font-medium ${compact ? 'text-xs' : 'text-sm'} ${isCurrentPlayer ? 'text-emerald-400' : 'text-gray-300'}`}>
        {player.displayName}
      </span>
      <span className={`font-bold text-white ${compact ? 'text-3xl' : 'text-5xl'}`}>
        {player.score}
      </span>
      <span className="text-[10px] text-gray-500">
        L{player.legsWon} / S{player.setsWon}
      </span>
    </div>
  );
}
