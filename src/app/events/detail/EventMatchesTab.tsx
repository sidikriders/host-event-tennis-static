'use client';

import { Event, Match, Participant } from '@/types';
import MatchCard from '@/components/MatchCard';

interface EventMatchesTabProps {
  event: Event;
  matches: Match[];
  participants: Participant[];
  presentCount: number;
  canOperateEvent: boolean;
  generatingMatch: boolean;
  selectedCourt: 'all' | string;
  onSelectCourt: (court: 'all' | string) => void;
  onGenerateMatch: () => void;
  onCreateCustomMatch: () => void;
  onScoreUpdate: (matchId: string, scoreA: number, scoreB: number) => void;
  onEditMatch: (match: Match) => void;
  onDeleteMatch: (matchId: string) => void;
}

export default function EventMatchesTab({
  event,
  matches,
  participants,
  presentCount,
  canOperateEvent,
  generatingMatch,
  selectedCourt,
  onSelectCourt,
  onGenerateMatch,
  onCreateCustomMatch,
  onScoreUpdate,
  onEditMatch,
  onDeleteMatch,
}: EventMatchesTabProps) {
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
    <div className="max-w-2xl mx-auto space-y-4">
      {canOperateEvent && (
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <h2 className="font-bold text-gray-800 mb-3">Generate Match</h2>
          <p className="text-xs text-gray-500 mb-3">
            Americano: Ensures fair play count — players with fewer matches go first.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              onClick={onGenerateMatch}
              disabled={generatingMatch}
              className="w-full rounded-xl bg-green-600 py-2.5 font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
            >
              {generatingMatch ? 'Generating Match...' : '🎾 Generate Next Match'}
            </button>
            <button
              onClick={onCreateCustomMatch}
              className="w-full rounded-xl bg-white py-2.5 font-bold text-green-800 ring-1 ring-inset ring-green-200 transition-colors hover:bg-green-100"
            >
              ✍️ Create Custom Match
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">
            {presentCount} present · {event.courts.length} courts configured · {matches.length} matches generated
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
            onClick={() => onSelectCourt('all')}
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
                onClick={() => onSelectCourt(court)}
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
                    onScoreUpdate={onScoreUpdate}
                    onEdit={onEditMatch}
                    onDelete={onDeleteMatch}
                    readOnly={!canOperateEvent}
                  />
                ))
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}