'use client';

import { useEffect, useRef, useState } from 'react';
import { Match, Participant } from '@/types';

const SCORE_OPTIONS = Array.from({ length: 10 }, (_, index) => index);

type ScorePopoverTarget = 'teamA' | 'teamB' | null;

interface MatchCardProps {
  match: Match;
  participants: Participant[];
  onScoreUpdate: (matchId: string, scoreA: number, scoreB: number) => void;
  onEdit: (match: Match) => void;
  onDelete: (matchId: string) => void;
  readOnly?: boolean;
}

export default function MatchCard({
  match,
  participants,
  onScoreUpdate,
  onEdit,
  onDelete,
  readOnly = false,
}: MatchCardProps) {
  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState(match.scoreA?.toString() ?? '');
  const [scoreB, setScoreB] = useState(match.scoreB?.toString() ?? '');
  const [activePopover, setActivePopover] = useState<ScorePopoverTarget>(null);
  const scoreEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editing) {
      setActivePopover(null);
    }
  }, [editing]);

  useEffect(() => {
    if (!activePopover) {
      return;
    }

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (!scoreEditorRef.current?.contains(event.target as Node)) {
        setActivePopover(null);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [activePopover]);

  const getNames = (ids: string[]) =>
    ids.map((id) => participants.find((p) => p.id === id)?.name ?? '?').join(' & ');

  const handleSave = () => {
    const a = parseInt(scoreA);
    const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return;
    onScoreUpdate(match.id, a, b);
    setEditing(false);
  };

  const handleScoreSelect = (team: Exclude<ScorePopoverTarget, null>, value: number) => {
    if (team === 'teamA') {
      setScoreA(value.toString());
    } else {
      setScoreB(value.toString());
    }

    setActivePopover(null);
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
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
          <span>Round {match.round}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-500">{match.court}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}`}>
            {match.status}
          </span>
            {!readOnly && (
              <button
                onClick={() => onDelete(match.id)}
                className="text-xs text-red-400 hover:text-red-600"
              >
                🗑
              </button>
            )}
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

      {!readOnly && editing ? (
        <div ref={scoreEditorRef} className="mt-4 flex items-center gap-3 justify-center">
          <div className="relative">
            <button
              id={`team-a-score-trigger-${match.id}`}
              type="button"
              onClick={() => setActivePopover(activePopover === 'teamA' ? null : 'teamA')}
              aria-label="Select score for Team A"
              aria-expanded={activePopover === 'teamA'}
              aria-haspopup="menu"
              className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-center text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {scoreA || 'A'}
            </button>
            {activePopover === 'teamA' && (
              <div
                role="menu"
                aria-labelledby={`team-a-score-trigger-${match.id}`}
                className="absolute left-1/2 top-full z-10 mt-2 w-40 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
              >
                <div className="grid grid-cols-5 gap-2">
                  {SCORE_OPTIONS.map((value) => (
                    <button
                      key={`team-a-score-${value}`}
                      type="button"
                      onClick={() => handleScoreSelect('teamA', value)}
                      aria-label={`Score ${value}`}
                      role="menuitem"
                      className="rounded-lg bg-gray-100 px-0 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-green-100 hover:text-green-800"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <span className="text-gray-500 font-bold">–</span>
          <div className="relative">
            <button
              id={`team-b-score-trigger-${match.id}`}
              type="button"
              onClick={() => setActivePopover(activePopover === 'teamB' ? null : 'teamB')}
              aria-label="Select score for Team B"
              aria-expanded={activePopover === 'teamB'}
              aria-haspopup="menu"
              className="w-16 rounded-lg border border-gray-300 px-2 py-1 text-center text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {scoreB || 'B'}
            </button>
            {activePopover === 'teamB' && (
              <div
                role="menu"
                aria-labelledby={`team-b-score-trigger-${match.id}`}
                className="absolute left-1/2 top-full z-10 mt-2 w-40 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-2 shadow-xl"
              >
                <div className="grid grid-cols-5 gap-2">
                  {SCORE_OPTIONS.map((value) => (
                    <button
                      key={`team-b-score-${value}`}
                      type="button"
                      onClick={() => handleScoreSelect('teamB', value)}
                      aria-label={`Score ${value}`}
                      role="menuitem"
                      className="rounded-lg bg-gray-100 px-0 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-green-100 hover:text-green-800"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
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
      ) : !readOnly ? (
        <div className="mt-3 flex justify-center gap-4">
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
          <button
            onClick={() => onEdit(match)}
            className="text-sm text-green-700 hover:text-green-900 font-medium"
          >
            ⚙️ Edit Match
          </button>
        </div>
      ) : null}
    </div>
  );
}
