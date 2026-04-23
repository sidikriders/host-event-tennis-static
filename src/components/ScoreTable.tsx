'use client';

import { forwardRef } from 'react';
import { PlayerStats } from '@/types';

interface ScoreTableProps {
  stats: PlayerStats[];
  eventName?: string;
}

const MEDAL = ['🥇', '🥈', '🥉'];

const ScoreTable = forwardRef<HTMLDivElement, ScoreTableProps>(
  ({ stats, eventName }, ref) => {
    if (stats.length === 0) {
      return (
        <p className="text-gray-500 text-center py-8">
          No data yet. Complete some matches to see rankings.
        </p>
      );
    }

    return (
      <div
        ref={ref}
        data-export-root
        className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-200"
      >
        {eventName && (
          <div className="bg-gradient-to-r from-green-700 to-green-500 px-5 py-4">
            <h2 className="text-white font-bold text-xl text-center">🎾 {eventName}</h2>
            <p className="text-green-100 text-sm text-center">Score Table</p>
          </div>
        )}
        <div data-export-scroll-container className="overflow-x-auto">
          <table data-export-table className="min-w-max w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-center">MP</th>
                <th className="px-4 py-3 text-center">W</th>
                <th className="px-4 py-3 text-center">D</th>
                <th className="px-4 py-3 text-center">L</th>
                <th className="px-4 py-3 text-center">GW</th>
                <th className="px-4 py-3 text-center">GL</th>
                <th className="px-4 py-3 text-center font-bold text-gray-800">Pts</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s, i) => (
                <tr
                  key={s.participantId}
                  className={`border-t border-gray-100 ${
                    i === 0
                      ? 'bg-yellow-50'
                      : i === 1
                      ? 'bg-gray-50'
                      : i === 2
                      ? 'bg-orange-50'
                      : 'bg-white'
                  }`}
                >
                  <td className="px-4 py-3">
                    <span className="font-bold text-gray-700">
                      {i < 3 ? MEDAL[i] : `#${s.rank}`}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-800">{s.participant.name}</div>
                    {s.participant.note && (
                      <div className="text-xs text-gray-400">{s.participant.note}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{s.matchesPlayed}</td>
                  <td className="px-4 py-3 text-center font-semibold text-green-700">{s.wins}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{s.draws}</td>
                  <td className="px-4 py-3 text-center text-red-500">{s.losses}</td>
                  <td className="px-4 py-3 text-center text-blue-600">{s.gamesWon}</td>
                  <td className="px-4 py-3 text-center text-red-400">{s.gamesLost}</td>
                  <td className="px-4 py-3 text-center font-bold text-gray-900">
                    {s.points % 1 === 0 ? s.points : s.points.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 border-t border-gray-100">
          MP=Matches Played · W=Wins · D=Draws · L=Losses · GW=Games Won · GL=Games Lost · Pts=Points
        </div>
      </div>
    );
  }
);

ScoreTable.displayName = 'ScoreTable';

export default ScoreTable;
