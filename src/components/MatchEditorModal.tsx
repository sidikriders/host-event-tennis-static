'use client';

import { useEffect, useState } from 'react';

import { Match, Participant } from '@/types';

export interface MatchEditorPayload {
  round: number;
  court: string;
  teamA: string[];
  teamB: string[];
  status: Match['status'];
  scoreA: number | null;
  scoreB: number | null;
}

interface MatchEditorModalProps {
  matchType: 'single' | 'double';
  courts: string[];
  participants: Participant[];
  nextRound: number;
  match?: Match | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: MatchEditorPayload) => Promise<void>;
}

function buildSelections(team: string[] | undefined, size: number) {
  return Array.from({ length: size }, (_, index) => team?.[index] ?? '');
}

export default function MatchEditorModal({
  matchType,
  courts,
  participants,
  nextRound,
  match,
  saving,
  onClose,
  onSave,
}: MatchEditorModalProps) {
  const teamSize = matchType === 'single' ? 1 : 2;
  const availableCourts = courts.length > 0 ? courts : ['Court 1'];
  const [round, setRound] = useState((match?.round ?? nextRound).toString());
  const [court, setCourt] = useState(match?.court ?? availableCourts[0]);
  const [teamA, setTeamA] = useState<string[]>(() => buildSelections(match?.teamA, teamSize));
  const [teamB, setTeamB] = useState<string[]>(() => buildSelections(match?.teamB, teamSize));
  const [status, setStatus] = useState<Match['status']>(match?.status ?? 'pending');
  const [scoreA, setScoreA] = useState(match?.scoreA?.toString() ?? '');
  const [scoreB, setScoreB] = useState(match?.scoreB?.toString() ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRound((match?.round ?? nextRound).toString());
    setCourt(match?.court ?? availableCourts[0]);
    setTeamA(buildSelections(match?.teamA, teamSize));
    setTeamB(buildSelections(match?.teamB, teamSize));
    setStatus(match?.status ?? 'pending');
    setScoreA(match?.scoreA?.toString() ?? '');
    setScoreB(match?.scoreB?.toString() ?? '');
    setError(null);
  }, [availableCourts, match, nextRound, teamSize]);

  const selectedIds = [...teamA, ...teamB].filter(Boolean);

  const getOptions = (currentValue: string) =>
    participants.filter((participant) => {
      if (participant.id === currentValue) {
        return true;
      }

      return !selectedIds.includes(participant.id);
    });

  const handleSelectChange = (
    teamKey: 'teamA' | 'teamB',
    index: number,
    value: string
  ) => {
    const setter = teamKey === 'teamA' ? setTeamA : setTeamB;

    setter((currentTeam) => currentTeam.map((playerId, playerIndex) => {
      if (playerIndex !== index) {
        return playerId;
      }

      return value;
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedRound = Number.parseInt(round, 10);
    if (!Number.isInteger(parsedRound) || parsedRound < 1) {
      setError('Round must be 1 or higher.');
      return;
    }

    if (!court.trim()) {
      setError('Court is required.');
      return;
    }

    const normalizedTeamA = teamA.filter(Boolean);
    const normalizedTeamB = teamB.filter(Boolean);
    const requiredPlayers = teamSize * 2;
    const uniquePlayers = new Set([...normalizedTeamA, ...normalizedTeamB]);

    if (normalizedTeamA.length !== teamSize || normalizedTeamB.length !== teamSize) {
      setError(`Select ${requiredPlayers} players to build the match.`);
      return;
    }

    if (uniquePlayers.size !== requiredPlayers) {
      setError('Each player can only be used once in a match.');
      return;
    }

    let nextScoreA: number | null = null;
    let nextScoreB: number | null = null;

    if (status === 'completed') {
      const parsedScoreA = Number.parseInt(scoreA, 10);
      const parsedScoreB = Number.parseInt(scoreB, 10);

      if (Number.isNaN(parsedScoreA) || Number.isNaN(parsedScoreB)) {
        setError('Completed matches need scores for both teams.');
        return;
      }

      if (parsedScoreA < 0 || parsedScoreB < 0) {
        setError('Scores cannot be negative.');
        return;
      }

      nextScoreA = parsedScoreA;
      nextScoreB = parsedScoreB;
    }

    setError(null);
    await onSave({
      round: parsedRound,
      court: court.trim(),
      teamA: normalizedTeamA,
      teamB: normalizedTeamB,
      status,
      scoreA: nextScoreA,
      scoreB: nextScoreB,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-4 sm:items-center">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {match ? 'Edit Match' : 'Create Custom Match'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {matchType === 'single'
                ? 'Pick one player per side.'
                : 'Pick two players per team.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="text-2xl leading-none text-gray-400 transition-colors hover:text-gray-600 disabled:cursor-not-allowed"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-5">
          <div className="space-y-5">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Round</span>
                <input
                  type="number"
                  min={1}
                  value={round}
                  onChange={(event) => setRound(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Court</span>
                <select
                  value={court}
                  onChange={(event) => setCourt(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  {availableCourts.map((courtName) => (
                    <option key={courtName} value={courtName}>
                      {courtName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-semibold text-gray-700">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Match['status'])}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                >
                  <option value="pending">Pending</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <h4 className="text-sm font-bold text-green-900">Team A</h4>
                <div className="mt-3 space-y-3">
                  {teamA.map((playerId, index) => (
                    <label key={`team-a-${index}`} className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-green-700">
                        Player {index + 1}
                      </span>
                      <select
                        value={playerId}
                        onChange={(event) => handleSelectChange('teamA', index, event.target.value)}
                        className="w-full rounded-xl border border-green-200 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
                      >
                        <option value="">Select player</option>
                        {getOptions(playerId).map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                <h4 className="text-sm font-bold text-blue-900">Team B</h4>
                <div className="mt-3 space-y-3">
                  {teamB.map((playerId, index) => (
                    <label key={`team-b-${index}`} className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-blue-700">
                        Player {index + 1}
                      </span>
                      <select
                        value={playerId}
                        onChange={(event) => handleSelectChange('teamB', index, event.target.value)}
                        className="w-full rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="">Select player</option>
                        {getOptions(playerId).map((participant) => (
                          <option key={participant.id} value={participant.id}>
                            {participant.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Score</h4>
                  <p className="mt-1 text-xs text-gray-500">
                    Scores are only stored when the match status is completed.
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500">
                  {participants.length} selectable players
                </span>
              </div>

              <div className="mt-4 flex items-center justify-center gap-3">
                <input
                  type="number"
                  min={0}
                  value={scoreA}
                  onChange={(event) => setScoreA(event.target.value)}
                  disabled={status !== 'completed'}
                  className="w-20 rounded-xl border border-gray-300 px-3 py-2 text-center text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="A"
                />
                <span className="text-lg font-bold text-gray-400">-</span>
                <input
                  type="number"
                  min={0}
                  value={scoreB}
                  onChange={(event) => setScoreB(event.target.value)}
                  disabled={status !== 'completed'}
                  className="w-20 rounded-xl border border-gray-300 px-3 py-2 text-center text-lg font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                  placeholder="B"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving...' : match ? 'Save Match' : 'Create Match'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}