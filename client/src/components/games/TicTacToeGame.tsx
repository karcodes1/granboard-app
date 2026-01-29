import type { GameState, TicTacToeState, PlayerId, PlayerGameState } from '../../types';

interface TicTacToeGameProps {
  gameState: GameState;
  currentPlayer: PlayerGameState;
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

export function TicTacToeGame({ gameState, currentPlayer }: TicTacToeGameProps) {
  const ticTacToeState = gameState.gameSpecific as TicTacToeState;
  const board = ticTacToeState?.board;
  const segments = ticTacToeState?.segments || [20, 19, 18, 17, 16, 15, 14, 13, 12];
  const isTeamMode = gameState.teamMode === 'teams' && gameState.teams;

  // Get team index for a player (0 = X team, 1 = O team)
  const getTeamIndex = (playerId: PlayerId): number => {
    if (isTeamMode && gameState.teams) {
      const teamIdx = gameState.teams.findIndex(t => t.playerIds.includes(playerId));
      return teamIdx >= 0 ? teamIdx : 0;
    }
    return gameState.playerOrder.indexOf(playerId);
  };

  const getPlayerColor = (playerId: PlayerId | null) => {
    if (!playerId) return '';
    const teamIndex = getTeamIndex(playerId);
    return teamIndex === 0 ? 'bg-emerald-600' : 'bg-purple-600';
  };

  const getPlayerSymbol = (playerId: PlayerId | null) => {
    if (!playerId) return '';
    const teamIndex = getTeamIndex(playerId);
    return teamIndex === 0 ? 'X' : 'O';
  };

  // Get aggregated hits for a team in a cell
  const getTeamHits = (cell: { hits: Record<PlayerId, number> }, teamIndex: number): number => {
    if (isTeamMode && gameState.teams && gameState.teams[teamIndex]) {
      return gameState.teams[teamIndex].playerIds.reduce((sum, pid) => sum + (cell.hits[pid] || 0), 0);
    }
    const playerId = gameState.playerOrder[teamIndex];
    return cell.hits[playerId] || 0;
  };

  const getCellHitsDisplay = (cell: { owner: PlayerId | null; hits: Record<PlayerId, number> }) => {
    if (cell.owner) return null;
    
    // Show X's and O's for partial hits instead of dots
    const team0Hits = getTeamHits(cell, 0);
    const team1Hits = getTeamHits(cell, 1);
    
    return (
      <div className="flex flex-col items-center gap-0">
        {team0Hits > 0 && (
          <span className="text-[10px] font-bold text-emerald-400">
            {'X'.repeat(Math.min(team0Hits, 3))}
          </span>
        )}
        {team1Hits > 0 && (
          <span className="text-[10px] font-bold text-purple-400">
            {'O'.repeat(Math.min(team1Hits, 3))}
          </span>
        )}
      </div>
    );
  };

  // Get current player's team index for color
  const currentTeamIndex = getTeamIndex(gameState.currentPlayerId);
  const currentSymbol = currentTeamIndex === 0 ? 'X' : 'O';
  const currentColor = currentTeamIndex === 0 ? 'text-emerald-400' : 'text-purple-400';

  return (
    <div className="h-full flex flex-col p-2 overflow-hidden">
      {/* Team or Player legend */}
      <div className="flex gap-1 flex-shrink-0 mb-1">
        {isTeamMode && gameState.teams ? (
          // Team mode: show teams with X/O symbols
          gameState.teams.map((team, idx) => {
            const isCurrentTeam = team.playerIds.includes(gameState.currentPlayerId);
            const symbol = idx === 0 ? 'X' : 'O';
            const ringColor = idx === 0 ? 'ring-emerald-500' : 'ring-purple-500';
            const textColor = idx === 0 ? 'text-emerald-400' : 'text-purple-400';
            return (
              <div
                key={team.teamId}
                className={`flex-1 rounded p-1 text-center ${
                  isCurrentTeam ? `bg-gray-800 ring-1 ${ringColor}` : 'bg-gray-700/50'
                }`}
              >
                <div className={`text-[10px] truncate ${isCurrentTeam ? textColor : 'text-gray-400'}`}>
                  <span className="font-bold">{symbol}</span> {team.name}
                </div>
              </div>
            );
          })
        ) : (
          // FFA mode: show individual players with X/O
          gameState.playerOrder.map((playerId, idx) => {
            const player = gameState.players[playerId];
            const isCurrent = playerId === gameState.currentPlayerId;
            const symbol = idx === 0 ? 'X' : 'O';
            const ringColor = idx === 0 ? 'ring-emerald-500' : 'ring-purple-500';
            const textColor = idx === 0 ? 'text-emerald-400' : 'text-purple-400';
            return (
              <div
                key={playerId}
                className={`flex-1 rounded p-1 text-center ${
                  isCurrent ? `bg-gray-800 ring-1 ${ringColor}` : 'bg-gray-700/50'
                }`}
              >
                <div className={`text-[10px] truncate ${isCurrent ? textColor : 'text-gray-400'}`}>
                  <span className="font-bold">{symbol}</span> {player.displayName}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Current turn info + darts */}
      <div className="flex items-center justify-between py-1 px-1 bg-gray-700/30 rounded flex-shrink-0 mb-1">
        <span className={`text-xs font-medium ${currentColor}`}>
          <span className="font-bold">{currentSymbol}</span> {currentPlayer.displayName}
        </span>
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

      {/* 3x3 Grid */}
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
        {!board ? (
          <div className="text-gray-500 text-sm">Waiting for game...</div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 w-full max-w-[180px] aspect-square">
            {board.flat().map((cell, index) => {
              const row = Math.floor(index / 3);
              const col = index % 3;
              const segment = segments[index];
              
              return (
                <div
                  key={`${row}-${col}`}
                  className={`
                    relative flex flex-col items-center justify-center rounded
                    ${cell.owner ? getPlayerColor(cell.owner) : 'bg-gray-700'}
                    border border-gray-600
                  `}
                >
                  <span className="text-[8px] text-gray-400 absolute top-0 left-0.5">
                    {segment}
                  </span>
                  
                  {cell.owner ? (
                    <span className="text-xl font-bold text-white">
                      {getPlayerSymbol(cell.owner)}
                    </span>
                  ) : (
                    <div className="flex flex-col items-center">
                      {getCellHitsDisplay(cell)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
