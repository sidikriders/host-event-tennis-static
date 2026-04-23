'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { Event, EventMatchRule, Match, Participant } from '@/types';
import MatchCard from '@/components/MatchCard';
import MatchEditorModal, { MatchEditorPayload } from '@/components/MatchEditorModal';
import { deleteMatch, getEventMatchRules, getMatches, saveMatch, updateMatch } from '@/lib/storage';
import { generateAmericanoMatch, getNextGeneratedRound, validateMatchAgainstRules } from '@/lib/matchGenerator';
import { getSupabaseClient } from '@/lib/supabase';

interface EventMatchesTabProps {
  eventId: string;
  event: Event;
  participants: Participant[];
  presentParticipants: Participant[];
  presentIds: string[];
  canOperateEvent: boolean;
  isActive: boolean;
  onMatchesChange: (matches: Match[]) => void;
}

type MatchRealtimeRow = {
  id: string;
  club_id: string;
  event_id: string;
  round: number;
  court: string | null;
  team_a: string[];
  team_b: string[];
  score_a: number | null;
  score_b: number | null;
  status: Match['status'];
  created_at: string;
};

function sortMatches(matchList: Match[]) {
  return [...matchList].sort((left, right) => {
    if (left.round !== right.round) {
      return left.round - right.round;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function mapRealtimeMatchRow(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>
): Match | null {
  if (payload.eventType === 'DELETE') {
    return null;
  }

  const row = payload.new as Partial<MatchRealtimeRow>;

  if (
    typeof row.id !== 'string' ||
    typeof row.club_id !== 'string' ||
    typeof row.event_id !== 'string' ||
    typeof row.round !== 'number' ||
    !Array.isArray(row.team_a) ||
    !Array.isArray(row.team_b) ||
    typeof row.status !== 'string' ||
    typeof row.created_at !== 'string'
  ) {
    return null;
  }

  return {
    id: row.id,
    clubId: row.club_id,
    eventId: row.event_id,
    round: row.round,
    court: typeof row.court === 'string' && row.court.trim() ? row.court : 'Court 1',
    teamA: row.team_a.filter((playerId): playerId is string => typeof playerId === 'string'),
    teamB: row.team_b.filter((playerId): playerId is string => typeof playerId === 'string'),
    scoreA: typeof row.score_a === 'number' ? row.score_a : null,
    scoreB: typeof row.score_b === 'number' ? row.score_b : null,
    status:
      row.status === 'completed' || row.status === 'ongoing' || row.status === 'pending'
        ? row.status
        : 'pending',
    createdAt: row.created_at,
  };
}

function upsertMatch(currentMatches: Match[], nextMatch: Match) {
  const existingIndex = currentMatches.findIndex((match) => match.id === nextMatch.id);

  if (existingIndex === -1) {
    return sortMatches([...currentMatches, nextMatch]);
  }

  const updatedMatches = [...currentMatches];
  updatedMatches[existingIndex] = nextMatch;
  return sortMatches(updatedMatches);
}

export default function EventMatchesTab({
  eventId,
  event,
  participants,
  presentParticipants,
  presentIds,
  canOperateEvent,
  isActive,
  onMatchesChange,
}: EventMatchesTabProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchRules, setMatchRules] = useState<EventMatchRule[]>([]);
  const [generatingMatch, setGeneratingMatch] = useState(false);
  const [selectedCourt, setSelectedCourt] = useState<'all' | string>('all');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);

  const loadMatches = useCallback(async () => {
    const nextMatches = await getMatches(eventId);
    setMatches(sortMatches(nextMatches));
  }, [eventId]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const loadMatchRules = useCallback(async () => {
    const nextRules = await getEventMatchRules(eventId);
    setMatchRules(nextRules);
    return nextRules;
  }, [eventId]);

  useEffect(() => {
    void loadMatchRules();
  }, [loadMatchRules]);

  useEffect(() => {
    onMatchesChange(matches);
  }, [matches, onMatchesChange]);

  useEffect(() => {
    if (selectedCourt !== 'all' && !event.courts.includes(selectedCourt)) {
      setSelectedCourt('all');
    }
  }, [event.courts, selectedCourt]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`event-matches:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as Partial<MatchRealtimeRow>;
            if (typeof oldRow.id !== 'string') {
              return;
            }

            setMatches((currentMatches) => currentMatches.filter((match) => match.id !== oldRow.id));
            return;
          }

          const nextMatch = mapRealtimeMatchRow(payload);
          if (!nextMatch) {
            return;
          }

          setMatches((currentMatches) => upsertMatch(currentMatches, nextMatch));
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [eventId]);

  const handleGenerateMatch = async () => {
    if (!canOperateEvent) return;
    const minPlayers = event.matchType === 'double' ? 4 : 2;
    if (presentIds.length < minPlayers) {
      alert(`Need at least ${minPlayers} present players.`);
      return;
    }

    try {
      setGeneratingMatch(true);
      const latestMatchRules = await loadMatchRules();
      const nextMatch = generateAmericanoMatch(
        presentIds,
        matches,
        event.clubId,
        eventId,
        event.matchType,
        event.courts,
        latestMatchRules
      );

      if (!nextMatch) {
        alert('No valid match can be generated with the current players and match rules.');
        return;
      }

      await saveMatch(nextMatch);
      setMatches((currentMatches) => upsertMatch(currentMatches, nextMatch));
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to generate match.');
    } finally {
      setGeneratingMatch(false);
    }
  };

  const handleCreateCustomMatch = () => {
    if (!canOperateEvent) return;

    const minPlayers = event.matchType === 'double' ? 4 : 2;
    if (presentIds.length < minPlayers) {
      alert(`Need at least ${minPlayers} present players.`);
      return;
    }

    setEditingMatch(null);
    setMatchModalOpen(true);
  };

  const handleEditMatch = (match: Match) => {
    if (!canOperateEvent) return;
    setEditingMatch(match);
    setMatchModalOpen(true);
  };

  const handleCloseMatchModal = () => {
    if (savingMatch) return;
    setEditingMatch(null);
    setMatchModalOpen(false);
  };

  const handleSaveMatch = async (payload: MatchEditorPayload) => {
    if (!canOperateEvent) return;

    setSavingMatch(true);

    try {
      const ruleViolation = validateMatchAgainstRules(payload.teamA, payload.teamB, matchRules);

      if (ruleViolation) {
        throw new Error(ruleViolation.message);
      }

      let nextMatch: Match;

      if (editingMatch) {
        nextMatch = {
          ...editingMatch,
          round: payload.round,
          court: payload.court,
          teamA: payload.teamA,
          teamB: payload.teamB,
          status: payload.status,
          scoreA: payload.scoreA,
          scoreB: payload.scoreB,
        };
        await updateMatch(nextMatch);
      } else {
        nextMatch = {
          id: uuidv4(),
          clubId: event.clubId,
          eventId,
          round: payload.round,
          court: payload.court,
          teamA: payload.teamA,
          teamB: payload.teamB,
          scoreA: payload.scoreA,
          scoreB: payload.scoreB,
          status: payload.status,
          createdAt: new Date().toISOString(),
        };
        await saveMatch(nextMatch);
      }

      setMatches((currentMatches) => upsertMatch(currentMatches, nextMatch));
      setMatchModalOpen(false);
      setEditingMatch(null);
    } finally {
      setSavingMatch(false);
    }
  };

  const handleScoreUpdate = async (matchId: string, scoreA: number, scoreB: number) => {
    if (!canOperateEvent) return;
    const currentMatch = matches.find((match) => match.id === matchId);
    if (!currentMatch) return;

    const nextMatch = { ...currentMatch, scoreA, scoreB, status: 'completed' as const };
    await updateMatch(nextMatch);
    setMatches((currentMatches) => upsertMatch(currentMatches, nextMatch));
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!canOperateEvent) return;
    if (!confirm('Delete this match?')) return;

    await deleteMatch(matchId);
    setMatches((currentMatches) => currentMatches.filter((match) => match.id !== matchId));
  };

  const nextRound = useMemo(() => getNextGeneratedRound(event.courts, matches), [event.courts, matches]);

  const matchEditorParticipants = editingMatch
    ? participants.filter((participant) => {
        if (presentIds.includes(participant.id)) {
          return true;
        }

        return [...editingMatch.teamA, ...editingMatch.teamB].includes(participant.id);
      })
    : presentParticipants;

  const matchesByCourt = matches.reduce<Record<string, Match[]>>((groups, match) => {
    if (!groups[match.court]) {
      groups[match.court] = [];
    }

    groups[match.court].push(match);
    return groups;
  }, {});

  const visibleCourtSections = (selectedCourt === 'all' ? event.courts : [selectedCourt])
    .map((court) => ({
      court,
      matches: [...(matchesByCourt[court] ?? [])].reverse(),
    }))
    .filter((section) => section.matches.length > 0 || selectedCourt !== 'all');

  return (
    <>
      <div className={isActive ? 'max-w-2xl mx-auto space-y-4' : 'hidden'}>
      {canOperateEvent && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <h2 className="font-bold text-gray-800 mb-3">Generate Match</h2>
          <p className="text-xs text-gray-500 mb-3">
            Americano: Ensures fair play count — players with fewer matches go first.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={handleGenerateMatch}
              disabled={generatingMatch}
              className="w-full rounded-xl bg-green-600 py-2.5 font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
            >
              {generatingMatch ? 'Generating Match...' : '🎾 Generate Next Match'}
            </button>
            <button
              onClick={handleCreateCustomMatch}
              className="w-full rounded-xl bg-white py-2.5 font-bold text-green-800 ring-1 ring-inset ring-green-200 transition-colors hover:bg-green-100"
            >
              ✍️ Create Custom Match
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {presentIds.length} present · {event.courts.length} courts configured · {matches.length} matches generated
          </p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-gray-800">Court View</h2>
            <p className="text-xs text-gray-500 mt-1">
              Filter the match list to one court, or view all courts grouped below.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-500">
            {event.courts.length} court{event.courts.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCourt('all')}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
              selectedCourt === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
            }`}
          >
            All Courts
          </button>
          {event.courts.map((court) => {
            const courtMatchCount = matchesByCourt[court]?.length ?? 0;

            return (
              <button
                key={court}
                type="button"
                onClick={() => setSelectedCourt(court)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
                  selectedCourt === court
                    ? 'bg-green-600 text-white'
                    : 'bg-white text-gray-700 ring-1 ring-inset ring-gray-200 hover:bg-gray-100'
                }`}
              >
                {court} ({courtMatchCount})
              </button>
            );
          })}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🎾</div>
          <p>No matches yet. Generate the first one!</p>
        </div>
      ) : visibleCourtSections.every((section) => section.matches.length === 0) ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🎾</div>
          <p>No matches on {selectedCourt} yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleCourtSections.map((section) => (
            <section key={section.court} className="space-y-3">
              {selectedCourt === 'all' && (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-4 py-3 ring-1 ring-inset ring-gray-200">
                  <div>
                    <h3 className="font-bold text-gray-800">{section.court}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {section.matches.length} match{section.matches.length === 1 ? '' : 'es'}
                    </p>
                  </div>
                </div>
              )}

              {section.matches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-6 text-center text-sm text-gray-400">
                  No matches assigned to {section.court} yet.
                </div>
              ) : (
                section.matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    participants={participants}
                    onScoreUpdate={handleScoreUpdate}
                    onEdit={handleEditMatch}
                    onDelete={handleDeleteMatch}
                    readOnly={!canOperateEvent}
                  />
                ))
              )}
            </section>
          ))}
        </div>
      )}
      </div>

      {matchModalOpen && canOperateEvent && (
        <MatchEditorModal
          matchType={event.matchType}
          courts={event.courts}
          participants={matchEditorParticipants}
          matchRules={matchRules}
          nextRound={nextRound}
          match={editingMatch}
          saving={savingMatch}
          onClose={handleCloseMatchModal}
          onSave={handleSaveMatch}
        />
      )}
    </>
  );
}