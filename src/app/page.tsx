'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Event } from '@/types';
import { getEvents, deleteEvent } from '@/lib/storage';
import EventCard from '@/components/EventCard';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEvents(getEvents());
    setLoaded(true);
  }, []);

  const handleDelete = (id: string) => {
    deleteEvent(id);
    setEvents(getEvents());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <header className="px-4 pt-10 pb-6 text-center">
        <div className="text-5xl mb-3">🎾</div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Tennis Event Host</h1>
        <p className="text-green-200 mt-1 text-sm">Manage Americano &amp; Mexicano events</p>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-20">
        <div className="mb-6 flex justify-center">
          <Link
            href="/events/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-green-800 font-bold rounded-full shadow-lg hover:shadow-xl hover:bg-green-50 transition-all text-base"
          >
            <span className="text-xl">+</span> Create New Event
          </Link>
        </div>

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
