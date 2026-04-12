'use client';

import { useState } from 'react';
import { Match, Participant } from '@/types';

interface MatchCardProps {
  match: Match;
  participants: Participant[];
  onScoreUpdate: (matchId: string, scoreA: number, scoreB: number) => void;
  onDelete: (matchId: string) => void;
}

export default function MatchCard({
  match,
  participants,
  onScoreUpdate,
  onDelete,
}: MatchCardProps) {
  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState(match.scoreA?.toString() ?? '');
  const [scoreB, setScoreB] = useState(match.scoreB?.toString() ?? '');

  const getNames = (ids: string[]) =>
    ids.map((id) => participants.find((p) => p.id === id)?.name ?? '?').join(' & ');

  const handleSave = () => {
    const a = parseInt(scoreA);
    const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return;
    onScoreUpdate(match.id, a, b);
    setEditing(false);
  };

  const statusColor =
    match.status === 'completed'
      ? 'bg-green-100 text-green-800'
      : match.status === 'ongoing'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-gray-100 text-gray-600';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-gray-400">Round {match.round}</span>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
            {match.status}
          </span>
          <button
            onClick={() => onDelete(match.id)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            🗑
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 text-center">
          <div className="font-semibold text-gray-800 text-sm">{getNames(match.teamA)}</div>
          <div className="text-xs text-gray-500">Team A</div>
        </div>

        <div className="text-center min-w-[80px]">
          {match.status === 'completed' && match.scoreA !== null && match.scoreB !== null ? (
            <div className="text-2xl font-bold text-gray-900">
              {match.scoreA} – {match.scoreB}
            </div>
          ) : (
            <div className="text-lg font-bold text-gray-400">vs</div>
          )}
        </div>

        <div className="flex-1 text-center">
          <div className="font-semibold text-gray-800 text-sm">{getNames(match.teamB)}</div>
          <div className="text-xs text-gray-500">Team B</div>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 flex items-center gap-3 justify-center">
          <input
            type="number"
            min={0}
            className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            value={scoreA}
            onChange={(e) => setScoreA(e.target.value)}
            placeholder="A"
          />
          <span className="text-gray-500 font-bold">–</span>
          <input
            type="number"
            min={0}
            className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-center font-bold text-lg focus:outline-none focus:ring-2 focus:ring-green-400"
            value={scoreB}
            onChange={(e) => setScoreB(e.target.value)}
            placeholder="B"
          />
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
          >
            ✓ Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            ✕
          </button>
        </div>
      ) : (
        <div className="mt-3 flex justify-center">
          <button
            onClick={() => {
              setScoreA(match.scoreA?.toString() ?? '');
              setScoreB(match.scoreB?.toString() ?? '');
              setEditing(true);
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {match.status === 'completed' ? '✏️ Edit Score' : '📝 Enter Score'}
          </button>
        </div>
      )}
    </div>
  );
}
