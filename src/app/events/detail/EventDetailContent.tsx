'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

import {
  Event,
  Participant,
  EventParticipant,
  Match,
  PlayerStats,
} from '@/types';
import {
  getEvent,
  getParticipants,
  saveParticipant,
  getEventParticipants,
  saveEventParticipant,
  updateEventParticipant,
  removeEventParticipant,
  getMatches,
  saveMatch,
  updateMatch,
  deleteMatch,
} from '@/lib/storage';
import { generateAmericanoMatch, generateMexicanoMatch } from '@/lib/matchGenerator';
import { calculateScoreTable } from '@/lib/scoreTable';

import ParticipantForm from '@/components/ParticipantForm';
import AttendanceList from '@/components/AttendanceList';
import MatchCard from '@/components/MatchCard';
import ScoreTable from '@/components/ScoreTable';
import ChampionsCard from '@/components/ChampionsCard';

type Tab = 'participants' | 'attendance' | 'matches' | 'scoreboard';

export default function EventDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get('id') ?? '';

  const [event, setEvent] = useState<Event | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [tab, setTab] = useState<Tab>('participants');
  const [importModal, setImportModal] = useState(false);
  const [generateMode, setGenerateMode] = useState<'americano' | 'mexicano'>('americano');
  const [loaded, setLoaded] = useState(false);

  const scoreTableRef = useRef<HTMLDivElement>(null);
  const championsRef = useRef<HTMLDivElement>(null);

  const reload = useCallback(() => {
    if (!eventId) { router.push('/'); return; }
    const ev = getEvent(eventId);
    if (!ev) { router.push('/'); return; }
    setEvent(ev);

    const eps = getEventParticipants(eventId);
    setEventParticipants(eps);

    const allP = getParticipants();
    setAllParticipants(allP);

    const ms = getMatches(eventId);
    setMatches(ms);

    const epParticipants = eps
      .map((ep) => allP.find((p) => p.id === ep.participantId))
      .filter(Boolean) as Participant[];
    setStats(calculateScoreTable(epParticipants, ms));

    setLoaded(true);
  }, [eventId, router]);

  useEffect(() => { reload(); }, [reload]);

  const eventParticipantObjects = eventParticipants
    .map((ep) => allParticipants.find((p) => p.id === ep.participantId))
    .filter(Boolean) as Participant[];

  const presentIds = eventParticipants
    .filter((ep) => ep.present)
    .map((ep) => ep.participantId);

  const importableParticipants = allParticipants.filter(
    (p) => !eventParticipants.some((ep) => ep.participantId === p.id)
  );

  const handleAddParticipant = (p: Participant) => {
    saveParticipant(p);
    saveEventParticipant({ eventId, participantId: p.id, present: true });
    reload();
  };

  const handleImportParticipant = (p: Participant) => {
    saveEventParticipant({ eventId, participantId: p.id, present: true });
    setImportModal(false);
    reload();
  };

  const handleRemoveParticipant = (participantId: string) => {
    if (!confirm('Remove this participant from the event?')) return;
    removeEventParticipant(eventId, participantId);
    reload();
  };

  const handleAttendanceToggle = (participantId: string, present: boolean) => {
    updateEventParticipant({ eventId, participantId, present });
    reload();
  };

  const handleGenerateMatch = () => {
    if (!event) return;
    const minPlayers = event.matchType === 'double' ? 4 : 2;
    if (presentIds.length < minPlayers) {
      alert(`Need at least ${minPlayers} present players.`);
      return;
    }

    let match: Match | null = null;
    if (generateMode === 'americano') {
      match = generateAmericanoMatch(presentIds, matches, eventId, event.matchType);
    } else {
      match = generateMexicanoMatch(presentIds, matches, stats, eventId, event.matchType);
    }

    if (match) {
      saveMatch(match);
      reload();
      setTab('matches');
    }
  };

  const handleScoreUpdate = (matchId: string, scoreA: number, scoreB: number) => {
    const m = matches.find((x) => x.id === matchId);
    if (!m) return;
    updateMatch({ ...m, scoreA, scoreB, status: 'completed' });
    reload();
  };

  const handleDeleteMatch = (matchId: string) => {
    if (!confirm('Delete this match?')) return;
    deleteMatch(matchId);
    reload();
  };

  const exportElementAsImage = async (element: HTMLElement, filename: string) => {
    const html2canvas = (await import('html2canvas')).default;
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleExportTable = async () => {
    if (!scoreTableRef.current) return;
    await exportElementAsImage(scoreTableRef.current, `${event?.name ?? 'scoretable'}-table.png`);
  };

  const handleExportChampions = async () => {
    if (!championsRef.current) return;
    await exportElementAsImage(championsRef.current, `${event?.name ?? 'champions'}-champions.png`);
  };

  if (!loaded) {
    return (
      <div className="min-h-screen bg-green-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!event) return null;

  const formattedDate = (() => {
    try { return format(new Date(event.date), 'MMMM d, yyyy'); } catch { return event.date; }
  })();

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: 'participants', label: 'Players', emoji: '👥' },
    { key: 'attendance', label: 'Attendance', emoji: '✅' },
    { key: 'matches', label: 'Matches', emoji: '🎾' },
    { key: 'scoreboard', label: 'Scoreboard', emoji: '🏆' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      {/* Header */}
      <header className="px-4 pt-8 pb-4">
        <Link href="/" className="text-green-200 hover:text-white text-sm flex items-center gap-1 mb-3">
          ← All Events
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white leading-tight">{event.name}</h1>
            <p className="text-green-200 text-sm mt-0.5">📅 {formattedDate} · 📍 {event.location}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              event.matchType === 'double' ? 'bg-green-400 text-green-900' : 'bg-blue-300 text-blue-900'
            }`}>
              {event.matchType === 'double' ? '👥 Doubles' : '👤 Singles'}
            </span>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex gap-1 px-4 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-sm font-semibold whitespace-nowrap transition-colors ${
              tab === t.key
                ? 'bg-white text-green-800'
                : 'bg-green-700/60 text-green-100 hover:bg-green-700'
            }`}
          >
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <main className="bg-white min-h-[60vh] px-4 pb-24 pt-5">
        {/* PARTICIPANTS TAB */}
        {tab === 'participants' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">
                Participants ({eventParticipants.length})
              </h2>
              <button
                onClick={() => setImportModal(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
              >
                📋 Import from Past
              </button>
            </div>

            {eventParticipantObjects.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">👤</div>
                <p>No participants yet. Add your first player below!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {eventParticipantObjects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"
                  >
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-lg font-bold text-green-700">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500 flex gap-2 flex-wrap">
                        <span>{p.gender}</span>
                        {p.note && <span>· {p.note}</span>}
                        {p.origin && <span>· {p.origin}</span>}
                        {p.instagram && <span>· @{p.instagram.replace('@', '')}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveParticipant(p.id)}
                      className="text-red-400 hover:text-red-600 text-sm px-2 py-1"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <ParticipantForm onAdd={handleAddParticipant} />
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {tab === 'attendance' && (
          <div className="max-w-2xl mx-auto">
            <div className="mb-4">
              <h2 className="font-bold text-gray-800 text-lg mb-1">Attendance</h2>
              <p className="text-sm text-gray-500">
                Mark who is present today. Only present players will be matched.
              </p>
            </div>
            <AttendanceList
              eventParticipants={eventParticipants}
              participants={allParticipants}
              onToggle={handleAttendanceToggle}
            />
          </div>
        )}

        {/* MATCHES TAB */}
        {tab === 'matches' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <h2 className="font-bold text-gray-800 mb-3">Generate Match</h2>
              <div className="flex gap-2 mb-3">
                {(['americano', 'mexicano'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setGenerateMode(mode)}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      generateMode === mode
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {mode === 'americano' ? '🎲 Americano' : '🏅 Mexicano'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mb-3">
                {generateMode === 'americano'
                  ? 'Americano: Ensures fair play count — players with fewer matches go first.'
                  : 'Mexicano: Pairs based on current ranking (top vs top, bottom vs bottom).'}
              </p>
              <button
                onClick={handleGenerateMatch}
                className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
              >
                🎾 Generate Next Match
              </button>
              <p className="text-xs text-gray-400 mt-2 text-center">
                {presentIds.length} present · {matches.length} matches generated
              </p>
            </div>

            {matches.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-2">🎾</div>
                <p>No matches yet. Generate the first one!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...matches].reverse().map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    participants={allParticipants}
                    onScoreUpdate={handleScoreUpdate}
                    onDelete={handleDeleteMatch}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* SCOREBOARD TAB */}
        {tab === 'scoreboard' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleExportTable}
                className="flex-1 py-2 px-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
              >
                📥 Export Table
              </button>
              <button
                onClick={handleExportChampions}
                className="flex-1 py-2 px-3 bg-yellow-500 text-white rounded-xl font-semibold text-sm hover:bg-yellow-600 transition-colors disabled:opacity-50"
                disabled={stats.length === 0}
              >
                🏆 Export Champions
              </button>
            </div>

            <ScoreTable ref={scoreTableRef} stats={stats} eventName={event.name} />

            {stats.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-gray-800 mb-3">🏆 Champions Podium</h3>
                <div className="overflow-x-auto">
                  <ChampionsCard
                    ref={championsRef}
                    stats={stats}
                    eventName={event.name}
                    eventDate={formattedDate}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Import Modal */}
      {importModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-lg">Import Participants</h3>
              <button onClick={() => setImportModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {importableParticipants.length === 0 ? (
                <p className="text-gray-400 text-center py-6">
                  No other participants to import. All participants are already in this event.
                </p>
              ) : (
                importableParticipants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleImportParticipant(p)}
                    className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-green-50 rounded-xl border border-gray-200 hover:border-green-300 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center font-bold text-green-700">
                      {p.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 truncate">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        {p.gender}{p.note ? ` · ${p.note}` : ''}{p.origin ? ` · ${p.origin}` : ''}
                      </div>
                    </div>
                    <span className="text-green-600 font-bold text-lg">+</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
