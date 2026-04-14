'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Event } from '@/types';
import { getEvents, deleteEvent } from '@/lib/storage';
import EventCard from '@/components/EventCard';
import { useAuth } from '@/components/AuthProvider';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isReady, logout, user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
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
      try {
        setError(null);
        const data = await getEvents();
        if (!cancelled) {
          setEvents(data);
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
  }, [isAuthenticated, isReady, router]);

  const handleDelete = async (id: string) => {
    try {
      setError(null);
      await deleteEvent(id);
      setEvents((current) => current.filter((event) => event.id !== id));
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <header className="px-4 pt-10 pb-6 text-center">
        <div className="max-w-2xl mx-auto flex items-center justify-end mb-5">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/10 px-4 py-2 text-sm text-green-50">
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
        </div>
        <div className="text-5xl mb-3">🎾</div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Tennis Event Host</h1>
        <p className="text-green-200 mt-1 text-sm">Manage Americano &amp; Mexicano events</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-20">
        <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-800 font-bold rounded-full shadow-lg hover:shadow-xl hover:bg-green-50 transition-all text-base"
          >
            <span className="text-xl">+</span> Create New Event
          </Link>
          <Link
            href="/players"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-100 text-green-900 font-bold rounded-full shadow-lg hover:shadow-xl hover:bg-white transition-all text-base"
          >
            <span className="text-xl">👥</span> Manage Players
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loaded ? (
          <div className="text-center text-green-200 py-10">Loading...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🏟️</div>
            <p className="text-green-100 text-lg font-semibold">No events yet</p>
            <p className="text-green-300 text-sm mt-1">Create your first event to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-green-200 text-sm font-semibold uppercase tracking-wide px-1">
              Your Events ({events.length})
            </h2>
            {events.map((event) => (
              <EventCard key={event.id} event={event} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
