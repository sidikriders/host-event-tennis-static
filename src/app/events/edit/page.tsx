'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

import { Event } from '@/types';
import { getEvent, saveEvent } from '@/lib/storage';
import { useAuth } from '@/components/AuthProvider';
import EventForm from '@/components/EventForm';

function EditEventPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isReady } = useAuth();
  const eventId = searchParams.get('id') ?? '';

  const [event, setEvent] = useState<Event | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=/events/edit?id=${eventId}`);
      return;
    }

    if (!eventId) {
      router.replace('/');
      return;
    }

    let cancelled = false;

    const loadEvent = async () => {
      try {
        setError(null);
        const data = await getEvent(eventId);
        if (!data) {
          router.replace('/');
          return;
        }

        if (!cancelled) {
          setEvent(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load event.');
        }
      } finally {
        if (!cancelled) {
          setLoaded(true);
        }
      }
    };

    void loadEvent();

    return () => {
      cancelled = true;
    };
  }, [eventId, isAuthenticated, isReady, router]);

  const handleSubmit = async (values: {
    name: string;
    date: string;
    location: string;
    courts: string[];
    matchType: 'single' | 'double';
  }) => {
    if (!event) return;

    setSubmitting(true);
    setError(null);

    try {
      await saveEvent({
        ...event,
        name: values.name,
        date: values.date,
        location: values.location,
        courts: values.courts,
        matchType: values.matchType,
      });
      router.push(`/events/detail?id=${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event.');
      setSubmitting(false);
    }
  };

  if (!isReady || !isAuthenticated || !loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center">
        <div className="text-green-100 text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <header className="px-4 pt-8 pb-4">
        <Link href={`/events/detail?id=${event.id}`} className="text-green-200 hover:text-white text-sm flex items-center gap-1">
          ← Back to Event
        </Link>
        <h1 className="text-2xl font-extrabold text-white mt-3">✏️ Edit Event</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-20">
        <EventForm
          initialValues={{
            name: event.name,
            date: event.date,
            location: event.location,
            courts: event.courts,
            matchType: event.matchType,
          }}
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          error={error}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
}

export default function EditEventPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center">
          <div className="text-green-100 text-lg font-semibold">Loading...</div>
        </div>
      }
    >
      <EditEventPageContent />
    </Suspense>
  );
}