import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { Target, Undo2, SkipForward, Trophy, ArrowLeft } from 'lucide-react';
import { VideoChat } from '../components/VideoChat';

export function GamePage() {
  const navigate = useNavigate();
  const {
    gameState,
    lastDartHit,
    leaveLobby,
    sendThrow,
    endTurn,
    undoThrow,
    undoRound,
    isBleConnected,
  } = useGameStore();

  // Navigate away if no game
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

  // Manual throw for testing without BLE
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

  // Render player scores
  const renderPlayerScores = () => {
    return gameState.playerOrder.map((playerId) => {
      const player = gameState.players[playerId];
      const isCurrentPlayer = playerId === gameState.currentPlayerId;

      return (
        <div
          key={playerId}
          className={`card ${
            isCurrentPlayer
              ? 'ring-2 ring-emerald-500 bg-emerald-900/20'
              : 'bg-gray-800'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">{player.displayName}</span>
            {isCurrentPlayer && (
              <span className="text-xs bg-emerald-600 px-2 py-1 rounded">
                Throwing
              </span>
            )}
          </div>
          <div className="dart-score text-center">{player.score}</div>
          <div className="text-center text-sm text-gray-400 mt-2">
            Legs: {player.legsWon} | Sets: {player.setsWon}
          </div>

          {/* Round throws */}
          {isCurrentPlayer && player.roundThrows.length > 0 && (
            <div className="mt-3 flex justify-center gap-2">
              {player.roundThrows.map((dart, i) => (
                <span
                  key={i}
                  className={`dart-hit ${
                    dart.multiplier === 'T'
                      ? 'dart-hit-triple'
                      : dart.multiplier === 'D' || dart.multiplier === 'DB'
                      ? 'dart-hit-double'
                      : dart.multiplier === 'SB'
                      ? 'dart-hit-bull'
                      : 'dart-hit-single'
                  }`}
                >
                  {dart.multiplier === 'OUT'
                    ? 'OUT'
                    : `${dart.multiplier}${dart.value}`}
                </span>
              ))}
            </div>
          )}
        </div>
      );
    });
  };

  // Winner screen
  if (isFinished && winner) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="card">
          <Trophy className="w-16 h-16 mx-auto text-amber-500 mb-4" />
          <h1 className="text-3xl font-bold mb-2">Game Over!</h1>
          <p className="text-xl text-emerald-400 mb-6">
            {winner.displayName} wins!
          </p>

          {/* Final stats */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <span className="text-gray-400">Darts Thrown:</span>
              <span className="ml-2">{winner.stats.dartsThrown}</span>
            </div>
            <div>
              <span className="text-gray-400">Highest Round:</span>
              <span className="ml-2">{winner.stats.highestRound}</span>
            </div>
            <div>
              <span className="text-gray-400">Checkouts:</span>
              <span className="ml-2">{winner.stats.checkouts}</span>
            </div>
            <div>
              <span className="text-gray-400">Busts:</span>
              <span className="ml-2">{winner.stats.busts}</span>
            </div>
          </div>

          <button onClick={handleLeaveGame} className="btn btn-primary w-full">
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleLeaveGame}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Leave Game
        </button>
        <div className="text-center">
          <span className="text-sm text-gray-400">Round {gameState.currentRound}</span>
          <p className="text-xl font-bold text-emerald-500 uppercase">
            {gameState.gameType}
          </p>
        </div>
        <div className="text-right text-sm text-gray-400">
          Leg {gameState.currentLeg} / Set {gameState.currentSet}
        </div>
      </div>

      {/* Last hit indicator */}
      {lastDartHit && (
        <div className="text-center mb-4">
          <span className="text-sm text-gray-400">Last Hit: </span>
          <span
            className={`dart-hit ${
              lastDartHit.multiplier === 'T'
                ? 'dart-hit-triple'
                : lastDartHit.multiplier === 'D' || lastDartHit.multiplier === 'DB'
                ? 'dart-hit-double'
                : lastDartHit.multiplier === 'SB'
                ? 'dart-hit-bull'
                : 'dart-hit-single'
            }`}
          >
            {lastDartHit.multiplier === 'OUT'
              ? 'MISS'
              : `${lastDartHit.multiplier}${lastDartHit.value} (${lastDartHit.points})`}
          </span>
        </div>
      )}

      {/* Player scores */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        {renderPlayerScores()}
      </div>

      {/* Current turn info */}
      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gray-400">Current Turn:</span>
            <span className="ml-2 font-bold text-lg">
              {currentPlayer.displayName}
            </span>
          </div>
          <div className="text-right">
            <span className="text-gray-400">Round Score:</span>
            <span className="ml-2 font-bold text-lg text-emerald-400">
              {gameState.turn.roundScore}
            </span>
          </div>
        </div>

        {gameState.turn.isBust && (
          <div className="mt-2 text-center py-2 bg-red-900/50 rounded text-red-300">
            BUST! Turn ended.
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 justify-center">
        {!isBleConnected && (
          <button onClick={handleManualThrow} className="btn btn-primary flex items-center gap-2">
            <Target className="w-5 h-5" />
            Manual Throw
          </button>
        )}

        <button
          onClick={undoThrow}
          disabled={currentPlayer.roundThrows.length === 0}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Undo2 className="w-5 h-5" />
          Undo Throw
        </button>

        <button
          onClick={undoRound}
          disabled={currentPlayer.roundThrows.length === 0}
          className="btn btn-secondary flex items-center gap-2"
        >
          <Undo2 className="w-5 h-5" />
          Undo Round
        </button>

        <button
          onClick={endTurn}
          disabled={currentPlayer.roundThrows.length === 0}
          className="btn btn-secondary flex items-center gap-2"
        >
          <SkipForward className="w-5 h-5" />
          End Turn
        </button>
      </div>

      <div className="mt-6">
        <VideoChat channelName={gameState.gameId} />
      </div>
    </div>
  );
}
