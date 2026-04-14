'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import PlayerForm from '@/components/PlayerForm';
import { useAuth } from '@/components/AuthProvider';
import {
  deleteParticipant,
  getAllEventParticipants,
  getAllMatches,
  getParticipants,
  saveParticipant,
} from '@/lib/storage';
import { EventParticipant, Match, Participant } from '@/types';

const GENDER_LABELS: Record<Participant['gender'], string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

const ORIGIN_COLORS: Record<string, string> = {
  reclub: 'bg-purple-100 text-purple-700',
  kuyy: 'bg-orange-100 text-orange-700',
  ayo: 'bg-blue-100 text-blue-700',
  wa: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
};

function buildEventCountMap(eventParticipants: EventParticipant[]) {
  const counts = new Map<string, number>();

  for (const eventParticipant of eventParticipants) {
    counts.set(
      eventParticipant.participantId,
      (counts.get(eventParticipant.participantId) ?? 0) + 1
    );
  }

  return counts;
}

function buildMatchCountMap(matches: Match[]) {
  const counts = new Map<string, number>();

  for (const match of matches) {
    for (const participantId of [...match.teamA, ...match.teamB]) {
      counts.set(participantId, (counts.get(participantId) ?? 0) + 1);
    }
  }

  return counts;
}

export default function PlayersPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const [players, setPlayers] = useState<Participant[]>([]);
  const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [savingPlayerId, setSavingPlayerId] = useState<string | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [creatingPlayer, setCreatingPlayer] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [participantData, eventParticipantData, matchData] = await Promise.all([
        getParticipants(),
        getAllEventParticipants(),
        getAllMatches(),
      ]);

      setPlayers(participantData);
      setEventParticipants(eventParticipantData);
      setMatches(matchData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load players.');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace('/login?next=/players');
      return;
    }

    void loadData();
  }, [isAuthenticated, isReady, loadData, router]);

  const handleCreatePlayer = async (participant: Participant) => {
    try {
      setCreatingPlayer(true);
      setError(null);
      await saveParticipant(participant);
      setShowCreateForm(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create player.');
    } finally {
      setCreatingPlayer(false);
    }
  };

  const handleUpdatePlayer = async (participant: Participant) => {
    try {
      setSavingPlayerId(participant.id);
      setError(null);
      await saveParticipant(participant);
      setEditingPlayerId(null);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update player.');
    } finally {
      setSavingPlayerId(null);
    }
  };

  const handleDeletePlayer = async (participant: Participant, matchCount: number) => {
    if (matchCount > 0) {
      setError('Cannot delete player because they already have matches.');
      return;
    }

    if (!confirm(`Permanently delete ${participant.name}?`)) {
      return;
    }

    try {
      setDeletingPlayerId(participant.id);
      setError(null);
      await deleteParticipant(participant.id);

      if (editingPlayerId === participant.id) {
        setEditingPlayerId(null);
      }

      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete player.');
    } finally {
      setDeletingPlayerId(null);
    }
  };

  if (!isReady || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center">
        <div className="text-green-100 text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  const eventCountMap = buildEventCountMap(eventParticipants);
  const matchCountMap = buildMatchCountMap(matches);
  const activePlayers = players.filter((player) => (eventCountMap.get(player.id) ?? 0) > 0).length;
  const playersWithMatches = players.filter((player) => (matchCountMap.get(player.id) ?? 0) > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <header className="px-4 pt-8 pb-4">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-green-200 hover:text-white text-sm flex items-center gap-1 mb-4">
            ← Back to Dashboard
          </Link>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-green-200 text-sm font-semibold uppercase tracking-[0.25em]">
                Master Data
              </p>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
                Player Directory
              </h1>
              <p className="text-green-100 text-sm mt-2 max-w-2xl">
                Add and edit shared player data here. Permanent delete is only allowed when the player has never been used in a match.
              </p>
            </div>
            <button
              onClick={() => {
                setShowCreateForm((current) => !current);
                setEditingPlayerId(null);
              }}
              className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-green-800 shadow-lg hover:bg-green-50 transition-colors"
            >
              {showCreateForm ? 'Close Form' : '+ Add Player'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-20">
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-2xl bg-white/12 border border-white/10 p-5 text-white backdrop-blur-sm">
            <div className="text-sm text-green-100">Total Players</div>
            <div className="text-3xl font-extrabold mt-1">{players.length}</div>
          </div>
          <div className="rounded-2xl bg-white/12 border border-white/10 p-5 text-white backdrop-blur-sm">
            <div className="text-sm text-green-100">Active In Events</div>
            <div className="text-3xl font-extrabold mt-1">{activePlayers}</div>
          </div>
          <div className="rounded-2xl bg-white/12 border border-white/10 p-5 text-white backdrop-blur-sm">
            <div className="text-sm text-green-100">Protected By Match History</div>
            <div className="text-3xl font-extrabold mt-1">{playersWithMatches}</div>
          </div>
        </div>

        <div className="rounded-[28px] bg-white shadow-2xl p-5 md:p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {showCreateForm && (
            <PlayerForm
              title="Add New Player"
              submitLabel="Create Player"
              submitDisabled={creatingPlayer}
              onSubmit={handleCreatePlayer}
              onCancel={() => setShowCreateForm(false)}
            />
          )}

          {!loaded ? (
            <div className="text-center py-12 text-gray-500">Loading players...</div>
          ) : players.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-gray-500">
              No players yet. Create your first player to start building event rosters.
            </div>
          ) : (
            <div className="space-y-4">
              {players.map((player) => {
                const eventCount = eventCountMap.get(player.id) ?? 0;
                const matchCount = matchCountMap.get(player.id) ?? 0;
                const isEditing = editingPlayerId === player.id;
                const isSaving = savingPlayerId === player.id;
                const isDeleting = deletingPlayerId === player.id;

                if (isEditing) {
                  return (
                    <PlayerForm
                      key={player.id}
                      title={`Edit ${player.name}`}
                      submitLabel="Save Changes"
                      initialParticipant={player}
                      submitDisabled={isSaving}
                      onSubmit={handleUpdatePlayer}
                      onCancel={() => setEditingPlayerId(null)}
                    />
                  );
                }

                return (
                  <div
                    key={player.id}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-gray-900">{player.name}</h2>
                          <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                            {GENDER_LABELS[player.gender]}
                          </span>
                          {player.origin && (
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                ORIGIN_COLORS[player.origin] || ORIGIN_COLORS.other
                              }`}
                            >
                              {player.origin}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
                          <span className="rounded-full bg-white px-3 py-1 border border-gray-200">
                            Events: {eventCount}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 border border-gray-200">
                            Matches: {matchCount}
                          </span>
                          {player.instagram && (
                            <span className="rounded-full bg-white px-3 py-1 border border-gray-200">
                              @{player.instagram.replace('@', '')}
                            </span>
                          )}
                        </div>
                        {player.note && (
                          <p className="mt-3 text-sm text-gray-600">{player.note}</p>
                        )}
                        {matchCount > 0 ? (
                          <p className="mt-3 text-xs font-medium text-amber-700">
                            This player cannot be deleted because they already appear in match history.
                          </p>
                        ) : (
                          <p className="mt-3 text-xs font-medium text-gray-500">
                            Delete will permanently remove the player and any event attendance rows linked to them.
                          </p>
                        )}
                      </div>

                      <div className="flex gap-3 lg:justify-end">
                        <button
                          onClick={() => {
                            setEditingPlayerId(player.id);
                            setShowCreateForm(false);
                          }}
                          className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player, matchCount)}
                          disabled={isDeleting || matchCount > 0}
                          className="px-4 py-2 rounded-lg bg-red-600 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete Permanently'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}