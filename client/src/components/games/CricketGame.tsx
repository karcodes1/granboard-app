import type { GameState, CricketState, PlayerId, PlayerGameState } from '../../types';
import { PLAYER_COLORS } from '../../types';

interface CricketGameProps {
  gameState: GameState;
  currentPlayer: PlayerGameState;
}

const CRICKET_NUMBERS = [20, 19, 18, 17, 16, 15, 25]; // 25 = Bull

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

export function CricketGame({ gameState, currentPlayer }: CricketGameProps) {
  const cricketState = gameState.gameSpecific as CricketState;
  const marks = cricketState?.marks || {};
  const closedBy = cricketState?.closedBy || {};
  const scores = cricketState?.scores || {};
  const isTeamMode = gameState.teamMode === 'teams' && gameState.teams;

  // Get team marks (sum of all team member marks)
  const getTeamMarks = (teamPlayerIds: PlayerId[], number: number): number => {
    return teamPlayerIds.reduce((sum, pid) => sum + (marks[number]?.[pid] || 0), 0);
  };

  // Get team score (sum of all team member scores)
  const getTeamScore = (teamPlayerIds: PlayerId[]): number => {
    return teamPlayerIds.reduce((sum, pid) => sum + (scores[pid] || 0), 0);
  };

  const getMarksDisplayValue = (markCount: number, isClosed: boolean) => {
    if (markCount === 0) return <span className="text-gray-600">–</span>;
    if (markCount === 1) return <span className="text-white">/</span>;
    if (markCount === 2) return <span className="text-white">X</span>;
    if (markCount >= 3) {
      return (
        <span className={`font-bold ${isClosed ? 'text-gray-500' : 'text-emerald-400'}`}>
          ⊗
        </span>
      );
    }
    return null;
  };

  const getMarksDisplay = (playerId: PlayerId, number: number) => {
    const playerMarks = marks[number]?.[playerId] || 0;
    const isClosed = closedBy[number] !== null && closedBy[number] !== undefined;
    return getMarksDisplayValue(playerMarks, isClosed);
  };

  const isNumberClosed = (number: number) => {
    return closedBy[number] !== null && closedBy[number] !== undefined;
  };

  const getClosedByTeamIndex = (number: number) => {
    const closerId = closedBy[number];
    if (!closerId || !gameState.teams) return null;
    return gameState.teams.findIndex(t => t.playerIds.includes(closerId));
  };

  const getClosedByPlayer = (number: number) => {
    const closerId = closedBy[number];
    if (!closerId) return null;
    return gameState.playerOrder.indexOf(closerId);
  };

  return (
    <div className="h-full flex flex-col p-2 overflow-hidden">
      {/* Team or Player scores header */}
      <div className="flex gap-1 flex-shrink-0 mb-1">
        {isTeamMode && gameState.teams ? (
          // Team mode: show team scores
          gameState.teams.map((team) => {
            const isCurrentTeam = team.playerIds.includes(gameState.currentPlayerId);
            const teamScore = getTeamScore(team.playerIds);
            const colorClass = getTeamColorClass(team.colorId);
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
                <div className={`text-lg font-bold ${isCurrentTeam ? 'text-white' : 'text-gray-300'}`}>
                  {teamScore}
                </div>
              </div>
            );
          })
        ) : (
          // FFA mode: show individual player scores
          gameState.playerOrder.map((playerId) => {
            const player = gameState.players[playerId];
            const isCurrent = playerId === gameState.currentPlayerId;
            const score = scores[playerId] || 0;
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
                <div className={`text-lg font-bold ${isCurrent ? 'text-white' : 'text-gray-300'}`}>
                  {score}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Current turn info + darts */}
      <div className="flex items-center justify-between py-1 px-1 bg-gray-700/30 rounded flex-shrink-0 mb-1">
        <span className={`text-xs font-medium ${getPlayerColorClass(currentPlayer.colorIndex).text}`}>{currentPlayer.displayName}</span>
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

      {/* Cricket numbers grid */}
      <div className="flex-1 flex flex-col gap-0.5 min-h-0 overflow-hidden">
        {CRICKET_NUMBERS.map((number) => {
          const closed = isNumberClosed(number);
          const closedByIdx = isTeamMode ? getClosedByTeamIndex(number) : getClosedByPlayer(number);
          
          return (
            <div
              key={number}
              className={`grid grid-cols-[1fr_2fr_1fr] gap-1 items-center flex-1 min-h-0 ${
                closed ? 'opacity-50' : ''
              }`}
            >
              {/* Team 1 / Player 1 marks */}
              <div className={`text-center text-base ${closedByIdx === 0 ? 'text-emerald-400' : ''}`}>
                {isTeamMode && gameState.teams ? (
                  getMarksDisplayValue(getTeamMarks(gameState.teams[0].playerIds, number), closed)
                ) : (
                  getMarksDisplay(gameState.playerOrder[0], number)
                )}
              </div>

              {/* Number */}
              <div
                className={`text-center font-bold text-xs rounded py-0.5 ${
                  closed
                    ? 'bg-gray-800 text-gray-500'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {number === 25 ? 'BULL' : number}
              </div>

              {/* Team 2 / Player 2 marks */}
              <div className={`text-center text-base ${closedByIdx === 1 ? 'text-purple-400' : ''}`}>
                {isTeamMode && gameState.teams ? (
                  getMarksDisplayValue(getTeamMarks(gameState.teams[1].playerIds, number), closed)
                ) : (
                  getMarksDisplay(gameState.playerOrder[1], number)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
