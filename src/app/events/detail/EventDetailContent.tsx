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
  getParticipantsByIds,
  saveParticipant,
  getEventParticipants,
  saveEventParticipant,
  updateEventParticipant,
  removeEventParticipant,
} from '@/lib/storage';
import { calculateScoreTable } from '@/lib/scoreTable';

import ParticipantForm from '@/components/ParticipantForm';
import AttendanceList from '@/components/AttendanceList';
import ScoreTable from '@/components/ScoreTable';
import ChampionsCard from '@/components/ChampionsCard';
import { useAuth } from '@/components/AuthProvider';
import EventMatchesTab from '@/app/events/detail/EventMatchesTab';

type Tab = 'participants' | 'attendance' | 'matches' | 'scoreboard';

export default function EventDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { getClubRole, isAuthenticated, user } = useAuth();
  const eventId = searchParams.get('id') ?? '';

  const [event, setEvent] = useState<Event | null>(null);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [eventParticipants, setEventParticipants] = useState<EventParticipant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [stats, setStats] = useState<PlayerStats[]>([]);
  const [tab, setTab] = useState<Tab>('participants');
  const [importModal, setImportModal] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scoreTableRef = useRef<HTMLDivElement>(null);
  const championsRef = useRef<HTMLDivElement>(null);
  const viewerRole = event ? getClubRole(event.clubId) : null;
  const canOperateEvent = viewerRole !== null;
  const canManageEvent = viewerRole === 'owner' || viewerRole === 'admin';

  const reload = useCallback(async () => {
    if (!eventId) {
      router.push('/');
      return;
    }

    try {
      setError(null);
      const ev = await getEvent(eventId);
      if (!ev) {
        router.push('/');
        return;
      }
      setEvent(ev);

      const eps = await getEventParticipants(eventId);
      setEventParticipants(eps);

      const role = getClubRole(ev.clubId);
      const participantIds = eps.map((eventParticipant) => eventParticipant.participantId);
      const allP = role
        ? await getParticipants(ev.clubId)
        : await getParticipantsByIds(participantIds);
      setAllParticipants(allP);

      setLoaded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event.');
      setLoaded(true);
    }
  }, [eventId, getClubRole, router]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!canOperateEvent && (tab === 'participants' || tab === 'attendance')) {
      setTab('matches');
    }
  }, [canOperateEvent, tab]);

  useEffect(() => {
    const scoreParticipants = eventParticipants
      .map((eventParticipant) => allParticipants.find((participant) => participant.id === eventParticipant.participantId))
      .filter(Boolean) as Participant[];

    setStats(calculateScoreTable(scoreParticipants, matches));
  }, [allParticipants, eventParticipants, matches]);

  const eventParticipantObjects = eventParticipants
    .map((ep) => allParticipants.find((p) => p.id === ep.participantId))
    .filter(Boolean) as Participant[];

  const presentParticipants = eventParticipants
    .filter((ep) => ep.present)
    .map((ep) => allParticipants.find((participant) => participant.id === ep.participantId))
    .filter(Boolean) as Participant[];

  const presentIds = eventParticipants
    .filter((ep) => ep.present)
    .map((ep) => ep.participantId);

  const importableParticipants = allParticipants.filter(
    (p) => !eventParticipants.some((ep) => ep.participantId === p.id)
  );

  const handleAddParticipant = async (p: Participant) => {
    if (!canOperateEvent || !event) return;
    try {
      setError(null);
      await saveParticipant({
        ...p,
        clubId: event.clubId,
      });
      await saveEventParticipant({ eventId, participantId: p.id, present: true });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add participant.');
    }
  };

  const handleImportParticipant = async (p: Participant) => {
    if (!canOperateEvent) return;
    try {
      setError(null);
      await saveEventParticipant({ eventId, participantId: p.id, present: true });
      setImportModal(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import participant.');
    }
  };

  const handleRemoveParticipant = async (participantId: string) => {
    if (!canOperateEvent) return;
    if (!confirm('Remove this participant from the event?')) return;
    try {
      setError(null);
      await removeEventParticipant(eventId, participantId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove participant.');
    }
  };

  const handleAttendanceToggle = async (participantId: string, present: boolean) => {
    if (!canOperateEvent) return;
    try {
      setError(null);
      await updateEventParticipant({ eventId, participantId, present });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update attendance.');
    }
  };
  const exportElementAsImage = async (element: HTMLElement, filename: string) => {
    const html2canvas = (await import('html2canvas')).default;
    const scrollContainer = element.querySelector<HTMLElement>('[data-export-scroll-container]');
    const tableElement = element.querySelector<HTMLElement>('[data-export-table]');

    const exportWidth = Math.ceil(
      Math.max(
        element.scrollWidth,
        element.offsetWidth,
        scrollContainer?.scrollWidth ?? 0,
        scrollContainer?.offsetWidth ?? 0,
        tableElement?.scrollWidth ?? 0,
        tableElement?.offsetWidth ?? 0,
      )
    );
    const exportHeight = Math.ceil(Math.max(element.scrollHeight, element.offsetHeight));

    const canvas = await html2canvas(element, {
      backgroundColor: '#ffffff',
      height: exportHeight,
      scale: 2,
      useCORS: true,
      width: exportWidth,
      windowHeight: exportHeight,
      windowWidth: exportWidth,
      onclone: (clonedDocument) => {
        const clonedElement = clonedDocument.querySelector<HTMLElement>('[data-export-root]');
        if (clonedElement) {
          clonedElement.style.width = `${exportWidth}px`;
          clonedElement.style.maxWidth = 'none';
          clonedElement.style.overflow = 'visible';
        }

        const scrollContainer = clonedDocument.querySelector<HTMLElement>('[data-export-scroll-container]');
        if (scrollContainer) {
          scrollContainer.style.overflow = 'visible';
          scrollContainer.style.width = `${exportWidth}px`;
          scrollContainer.style.maxWidth = 'none';
        }

        const clonedTable = clonedDocument.querySelector<HTMLElement>('[data-export-table]');
        if (clonedTable) {
          clonedTable.style.width = 'max-content';
          clonedTable.style.minWidth = '100%';
        }
      },
    });
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

  const tabs: { key: Tab; label: string; emoji: string }[] = canOperateEvent
    ? [
        { key: 'participants', label: 'Players', emoji: '👥' },
        { key: 'attendance', label: 'Attendance', emoji: '✅' },
        { key: 'matches', label: 'Matches', emoji: '🎾' },
        { key: 'scoreboard', label: 'Scoreboard', emoji: '🏆' },
      ]
    : [
        { key: 'matches', label: 'Matches', emoji: '🎾' },
        { key: 'scoreboard', label: 'Scoreboard', emoji: '🏆' },
      ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      {/* Header */}
      <header className="px-4 pt-8 pb-4">
        {isAuthenticated && (
          <Link href="/" className="text-green-200 hover:text-white text-sm flex items-center gap-1 mb-3">
            ← All Events
          </Link>
        )}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white leading-tight">{event.name}</h1>
            <p className="text-green-200 text-sm mt-0.5">📅 {formattedDate} · 📍 {event.location}</p>
            <p className="text-green-100 text-xs mt-1">🎾 Courts: {event.courts.join(' · ')}</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
              event.matchType === 'double' ? 'bg-green-400 text-green-900' : 'bg-blue-300 text-blue-900'
            }`}>
              {event.matchType === 'double' ? '👥 Doubles' : '👤 Singles'}
            </span>
          </div>
          {canManageEvent && (
            <div className="flex items-center gap-2">
              <Link
                href={`/events/edit?id=${event.id}`}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-green-800 transition-colors hover:bg-green-50"
              >
                ✏️ Edit Event
              </Link>
              <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-green-50">
                {user?.display_name ?? user?.email}
              </div>
            </div>
          )}
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
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* PARTICIPANTS TAB */}
        {tab === 'participants' && (
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">
                Participants ({eventParticipants.length})
              </h2>
              {canOperateEvent && (
                <button
                  onClick={() => setImportModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold"
                >
                  📋 Import from Past
                </button>
              )}
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
                    {canOperateEvent && (
                      <button
                        onClick={() => handleRemoveParticipant(p.id)}
                        className="text-red-400 hover:text-red-600 text-sm px-2 py-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canOperateEvent && <ParticipantForm onAdd={handleAddParticipant} />}
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
        <EventMatchesTab
          eventId={eventId}
          event={event}
          participants={allParticipants}
          presentParticipants={presentParticipants}
          presentIds={presentIds}
          canOperateEvent={canOperateEvent}
          isActive={tab === 'matches'}
          onMatchesChange={setMatches}
        />

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
      {importModal && canOperateEvent && (
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
