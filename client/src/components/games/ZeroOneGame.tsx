import type { GameState, PlayerGameState } from '../../types';
import { PLAYER_COLORS } from '../../types';
import { getCheckoutSuggestion } from '../../utils/checkoutSuggestions';

// Get color class based on colorId
function getTeamColorClass(colorId: string): { bg: string; ring: string; text: string } {
  const color = PLAYER_COLORS.find(c => c.id === colorId);
  if (color) {
    return { bg: color.bg, ring: `ring-1 ring-${color.id}-500`, text: color.text };
  }
  return { bg: 'bg-emerald-600', ring: 'ring-1 ring-emerald-500', text: 'text-emerald-400' };
}

// Get player color class based on colorIndex
function getPlayerColorClass(colorIndex?: number): { bg: string; ring: string; text: string } {
  if (colorIndex !== undefined && colorIndex < PLAYER_COLORS.length) {
    const color = PLAYER_COLORS[colorIndex];
    return { bg: color.bg, ring: `ring-1 ring-${color.id}-500`, text: color.text };
  }
  return { bg: 'bg-emerald-600', ring: 'ring-1 ring-emerald-500', text: 'text-emerald-400' };
}

interface ZeroOneGameProps {
  gameState: GameState;
  currentPlayer: PlayerGameState;
  dartsRemaining: number;
}

function formatDart(dart: { multiplier: string; value: number }) {
  if (dart.multiplier === 'OUT') return 'X';
  if (dart.multiplier === 'SB') return 'SB';
  if (dart.multiplier === 'DB') return 'DB';
  return `${dart.multiplier}${dart.value}`;
}

function getDartClass(multiplier: string) {
  if (multiplier === 'T') return 'bg-purple-600';
  if (multiplier === 'D' || multiplier === 'DB') return 'bg-emerald-600';
  if (multiplier === 'SB') return 'bg-amber-600';
  if (multiplier === 'OUT') return 'bg-gray-600';
  return 'bg-gray-700';
}

export function ZeroOneGame({ gameState, currentPlayer, dartsRemaining }: ZeroOneGameProps) {
  const isTeamMode = gameState.teamMode === 'teams' && gameState.teams;
  const currentTeam = isTeamMode 
    ? gameState.teams?.find(t => t.playerIds.includes(gameState.currentPlayerId))
    : null;
  
  // Get score for checkout suggestion (team score in team mode)
  const currentScore = currentTeam ? currentTeam.score : currentPlayer.score;
  const checkoutSuggestion = getCheckoutSuggestion(currentScore, dartsRemaining);
  const hasDoubledIn = currentTeam ? currentTeam.hasDoubledIn : currentPlayer.hasDoubledIn;

  return (
    <div className="h-full flex flex-col p-2">
      {/* Team or Player scores */}
      <div className="flex gap-1 flex-shrink-0 mb-1">
        {isTeamMode && gameState.teams ? (
          // Team mode: show team scores
          gameState.teams.map((team) => {
            const isCurrentTeam = team.playerIds.includes(gameState.currentPlayerId);
            const colorClass = getTeamColorClass(team.colorId);
            const teamPlayers = team.playerIds.map(pid => gameState.players[pid]?.displayName || pid).join(', ');
            return (
              <div
                key={team.teamId}
                className={`flex-1 rounded p-1 text-center ${
                  isCurrentTeam ? `bg-gray-800 ${colorClass.ring}` : 'bg-gray-700/50'
                }`}
              >
                <div className={`text-[10px] truncate ${isCurrentTeam ? colorClass.text : 'text-gray-400'}`}>
                  {team.name}
                </div>
                <div className={`text-xl font-bold ${isCurrentTeam ? 'text-white' : 'text-gray-300'}`}>
                  {team.score}
                </div>
                <div className="text-[8px] text-gray-500 truncate" title={teamPlayers}>
                  L{team.legsWon}/S{team.setsWon}
                </div>
              </div>
            );
          })
        ) : (
          // FFA mode: show individual player scores
          gameState.playerOrder.map((playerId) => {
            const player = gameState.players[playerId];
            const isCurrent = playerId === gameState.currentPlayerId;
            const colorClass = getPlayerColorClass(player.colorIndex);
            return (
              <div
                key={playerId}
                className={`flex-1 rounded p-1 text-center ${
                  isCurrent ? `bg-gray-800 ${colorClass.ring}` : 'bg-gray-700/50'
                }`}
              >
                <div className={`text-[10px] truncate ${isCurrent ? colorClass.text : 'text-gray-400'}`}>
                  {player.displayName}
                </div>
                <div className={`text-xl font-bold ${isCurrent ? 'text-white' : 'text-gray-300'}`}>
                  {player.score}
                </div>
                <div className="text-[8px] text-gray-500">
                  L{player.legsWon}/S{player.setsWon}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Current turn info + darts */}
      <div className="flex items-center justify-between py-1 px-1 bg-gray-700/30 rounded flex-shrink-0 mb-1">
        <div className="flex items-center gap-1">
          <span className={`text-xs font-medium ${getPlayerColorClass(currentPlayer.colorIndex).text}`}>{currentPlayer.displayName}</span>
          <span className="text-[10px] text-gray-400">+{gameState.turn.roundScore}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {[0, 1, 2].map((i) => {
            const dart = currentPlayer.roundThrows[i];
            return (
              <div
                key={i}
                className={`w-8 h-5 rounded text-[10px] font-mono flex items-center justify-center ${
                  dart ? getDartClass(dart.multiplier) : 'bg-gray-700/50 text-gray-500'
                }`}
              >
                {dart ? formatDart(dart) : '–'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout suggestion */}
      {checkoutSuggestion && !gameState.turn.isBust && (
        <div className="flex items-center justify-center gap-1 py-1 bg-amber-900/30 flex-shrink-0 rounded mb-1">
          <span className="text-[10px] text-amber-400">Out:</span>
          {checkoutSuggestion.map((dart, i) => (
            <span key={i} className="text-[10px] font-mono bg-amber-600/50 px-1.5 py-0.5 rounded">
              {dart}
            </span>
          ))}
        </div>
      )}

      {gameState.turn.isBust && (
        <div className="py-1 bg-red-900/50 text-center flex-shrink-0 rounded mb-1">
          <span className="text-xs text-red-300 font-bold">BUST!</span>
        </div>
      )}

      {/* Double-in required indicator */}
      {gameState.options.doubleIn && !hasDoubledIn && (
        <div className="py-1 bg-blue-900/50 text-center flex-shrink-0 rounded mb-1">
          <span className="text-xs text-blue-300">Double required to start</span>
        </div>
      )}

      {/* Large score display for current team/player */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <div className="text-center">
          <div className="text-5xl font-bold text-white">{currentScore}</div>
          <div className="text-xs text-gray-400">
            {gameState.options.doubleIn && !hasDoubledIn ? 'hit double to start' : 'to go'}
          </div>
          {currentTeam && (
            <div className="text-[10px] text-gray-500 mt-1">
              {currentTeam.name} • {currentPlayer.displayName}'s turn
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
