'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Event } from '@/types';
import {
  getEvents,
  deleteEvent,
  getEventDependencySummary,
} from '@/lib/storage';
import EventCard from '@/components/EventCard';
import { useAuth } from '@/components/AuthProvider';

const EVENTS_PER_PAGE = 10;

type EventDependencyState = Record<
  string,
  {
    canDelete: boolean;
    deleteReason?: string;
    participantCount: number;
  }
>;

export default function HomePage() {
  const router = useRouter();
  const {
    activeClub,
    activeClubRole,
    isAuthenticated,
    isClubAdmin,
    isReady,
    logout,
    memberships,
    setCurrentClub,
    user,
  } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventDependencies, setEventDependencies] = useState<EventDependencyState>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/');
      return;
    }

    let cancelled = false;

    const loadEvents = async () => {
      if (!activeClub) {
        if (!cancelled) {
          setEvents([]);
          setEventDependencies({});
          setLoaded(true);
        }
        return;
      }

      try {
        setError(null);
        const data = await getEvents(activeClub.id);
        const dependencyEntries = await Promise.all(
          data.map(async (event) => {
            const summary = await getEventDependencySummary(event.id);
            const hasDependencies = summary.participantCount > 0 || summary.matchCount > 0;

            return [
              event.id,
              {
                canDelete: !hasDependencies,
                deleteReason: hasDependencies
                  ? 'Cannot delete an event that already has participants or matches.'
                  : undefined,
                participantCount: summary.participantCount,
              },
            ] as const;
          })
        );

        if (!cancelled) {
          setEvents(data);
          setEventDependencies(Object.fromEntries(dependencyEntries));
          setCurrentPage((current) => {
            const totalPages = Math.max(1, Math.ceil(data.length / EVENTS_PER_PAGE));
            return Math.min(current, totalPages);
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load events.');
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [activeClub, isAuthenticated, isReady, router]);

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await deleteEvent(id);
      setEvents((current) => {
        const nextEvents = current.filter((event) => event.id !== id);
        const totalPages = Math.max(1, Math.ceil(nextEvents.length / EVENTS_PER_PAGE));
        setCurrentPage((currentPageValue) => Math.min(currentPageValue, totalPages));
        return nextEvents;
      });
      setEventDependencies((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event.');
    }
  };

  if (!isReady || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center">
        <div className="text-green-100 text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(events.length / EVENTS_PER_PAGE));
  const startIndex = (currentPage - 1) * EVENTS_PER_PAGE;
  const paginatedEvents = events.slice(startIndex, startIndex + EVENTS_PER_PAGE);
  const clubCount = memberships.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <header className="px-4 pt-10 pb-6 text-center">
        <div className="max-w-5xl mx-auto flex flex-col gap-4 mb-5 md:flex-row md:items-center md:justify-between">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm text-green-50 self-end md:self-auto">
            <span>Signed in as {user?.display_name ?? user?.email}</span>
            <button
              onClick={() => {
                logout();
                router.replace('/login');
              }}
              className="font-semibold text-white hover:text-green-200"
            >
              Logout
            </button>
          </div>
          {clubCount > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="text-left text-xs font-semibold uppercase tracking-[0.25em] text-green-200">
                Active Club
              </label>
              <select
                value={activeClub?.id ?? ''}
                onChange={(event) => {
                  void setCurrentClub(event.target.value).catch((nextError: Error) => {
                    setError(nextError.message);
                  });
                }}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white outline-none transition-colors focus:border-white/40"
              >
                {memberships.map((membership) => (
                  <option key={membership.clubId} value={membership.clubId} className="text-gray-900">
                    {membership.club.tagName} · {membership.club.name}
                  </option>
                ))}
              </select>
              <Link
                href="/clubs/new"
                className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-bold text-green-800 shadow-lg transition-colors hover:bg-green-50"
              >
                + New Club
              </Link>
            </div>
          )}
        </div>
        <div className="text-5xl mb-3">🎾</div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Tennis Event Host</h1>
        <p className="text-green-200 mt-1 text-sm">Manage Americano &amp; Mexicano events</p>
        {activeClub && (
          <div className="mt-5 mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/10 px-5 py-4 text-left text-green-50 backdrop-blur-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-green-100">
                  {activeClub.tagName}
                </div>
                <h2 className="mt-3 text-2xl font-bold text-white">{activeClub.name}</h2>
                <p className="mt-1 text-sm text-green-100">
                  {activeClub.description || 'No club description yet.'}
                </p>
              </div>
              <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-green-50">
                <div>Role: {activeClubRole ?? 'member'}</div>
                <div className="mt-1">Memberships: {clubCount}</div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-20">
        {clubCount > 0 && activeClub && (
          <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            {isClubAdmin && (
              <Link
                href="/events/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-800 font-bold rounded-full shadow-lg hover:shadow-xl hover:bg-green-50 transition-all text-base"
              >
                <span className="text-xl">+</span> Create New Event
              </Link>
            )}
            <Link
              href="/players"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-900 font-bold rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all text-base"
            >
              <span className="text-xl">👥</span> Manage Players
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {clubCount === 0 ? (
          <div className="rounded-[32px] border border-white/10 bg-white/10 px-8 py-12 text-center text-green-50 shadow-2xl backdrop-blur-sm">
            <div className="text-6xl mb-4">🏟️</div>
            <h2 className="text-2xl font-extrabold text-white">Create your first club</h2>
            <p className="mt-2 text-sm text-green-100">
              Events, players, and admin permissions are now organized by club. Start by creating one.
            </p>
            <Link
              href="/clubs/new"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-bold text-green-800 shadow-lg transition-colors hover:bg-green-50"
            >
              <span className="text-xl">+</span> Create Club
            </Link>
          </div>
        ) : !loaded ? (
          <div className="text-center text-green-200 py-10">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏟️</div>
            <p className="text-green-100 text-lg font-semibold">No events in {activeClub?.name} yet</p>
            <p className="text-green-300 text-sm mt-1">
              {isClubAdmin ? 'Create your first event to get started!' : 'Ask a club admin to create the first event.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 px-1">
              <h2 className="text-green-200 text-sm font-semibold uppercase tracking-wide">
                {activeClub?.tagName} Events ({events.length})
              </h2>
              <span className="text-xs font-medium text-green-300">
                Page {currentPage} of {totalPages}
              </span>
            </div>
            {paginatedEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                participantCount={eventDependencies[event.id]?.participantCount ?? 0}
                canDelete={eventDependencies[event.id]?.canDelete ?? false}
                canManage={isClubAdmin}
                deleteReason={eventDependencies[event.id]?.deleteReason}
                onDelete={handleDelete}
              />
            ))}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm text-green-50">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-full bg-white/15 px-4 py-2 font-semibold transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>
                <div className="text-center text-xs text-green-100">
                  Showing {startIndex + 1}-{Math.min(startIndex + paginatedEvents.length, events.length)} of {events.length} events
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-full bg-white/15 px-4 py-2 font-semibold transition-colors hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
