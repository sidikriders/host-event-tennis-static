'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Event } from '@/types';
import { getEvent, saveEvent } from '@/lib/storage';
import { buildEventDateTime, DEFAULT_EVENT_END_TIME, DEFAULT_EVENT_START_TIME, extractTimeValue } from '@/lib/eventDateTime';
import { useAuth } from '@/components/AuthProvider';
import EventForm from '@/components/EventForm';

function NewEventPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activeClub, isAuthenticated, isClubAdmin, isReady, user } = useAuth();
  const sourceEventId = searchParams.get('duplicateFrom') ?? '';
  const nextPath = sourceEventId ? `/events/new?duplicateFrom=${sourceEventId}` : '/events/new';
  const [submitting, setSubmitting] = useState(false);
  const [sourceEvent, setSourceEvent] = useState<Event | null>(null);
  const [sourceLoaded, setSourceLoaded] = useState(!sourceEventId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace(`/login?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (!activeClub) {
      router.replace(`/clubs/new?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    if (!isClubAdmin) {
      router.replace('/');
    }
  }, [activeClub, isAuthenticated, isClubAdmin, isReady, nextPath, router]);

  useEffect(() => {
    if (!isReady || !isAuthenticated || !activeClub || !isClubAdmin) {
      return;
    }

    if (!sourceEventId) {
      setSourceEvent(null);
      setSourceLoaded(true);
      return;
    }

    let cancelled = false;

    const loadSourceEvent = async () => {
      try {
        setError(null);
        setSourceLoaded(false);

        const data = await getEvent(sourceEventId);
        if (!data) {
          if (!cancelled) {
            setSourceEvent(null);
            setError('Source event not found.');
          }
          return;
        }

        if (data.clubId !== activeClub.id) {
          if (!cancelled) {
            setSourceEvent(null);
            setError('Source event must belong to the active club.');
          }
          return;
        }

        if (!cancelled) {
          setSourceEvent(data);
        }
      } catch (err) {
        if (!cancelled) {
          setSourceEvent(null);
          setError(err instanceof Error ? err.message : 'Failed to load source event.');
        }
      } finally {
        if (!cancelled) {
          setSourceLoaded(true);
        }
      }
    };

    void loadSourceEvent();

    return () => {
      cancelled = true;
    };
  }, [activeClub, isAuthenticated, isClubAdmin, isReady, sourceEventId]);

  const handleSubmit = async (values: {
    name: string;
    date: string;
    timeStart: string;
    timeEnd: string;
    location: string;
    courts: string[];
    matchType: 'single' | 'double';
  }) => {
    setSubmitting(true);
    setError(null);

    const event: Event = {
      id: uuidv4(),
      clubId: activeClub?.id ?? '',
      createdById: user?.id ?? '',
      name: values.name,
      date: values.date,
      timeStart: buildEventDateTime(values.date, values.timeStart),
      timeEnd: buildEventDateTime(values.date, values.timeEnd),
      location: values.location,
      courts: values.courts,
      matchType: values.matchType,
      createdAt: new Date().toISOString(),
    };

    try {
      await saveEvent(event);
      router.push(`/events/detail?id=${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event.');
      setSubmitting(false);
    }
  };

  if (!isReady || !isAuthenticated || !activeClub || !isClubAdmin || !sourceLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center">
        <div className="text-green-100 text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  const initialValues = sourceEvent
    ? {
        name: sourceEvent.name,
        date: sourceEvent.date,
        timeStart: extractTimeValue(sourceEvent.timeStart, DEFAULT_EVENT_START_TIME),
        timeEnd: extractTimeValue(sourceEvent.timeEnd, DEFAULT_EVENT_END_TIME),
        location: sourceEvent.location,
        courts: sourceEvent.courts,
        matchType: sourceEvent.matchType,
      }
    : {
        name: '',
        date: new Date().toISOString().split('T')[0],
        timeStart: DEFAULT_EVENT_START_TIME,
        timeEnd: DEFAULT_EVENT_END_TIME,
        location: '',
        courts: ['Court 1'],
        matchType: 'double' as const,
      };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <header className="px-4 pt-8 pb-4">
        <Link href="/" className="text-green-200 hover:text-white text-sm flex items-center gap-1">
          ← Back
        </Link>
        <h1 className="text-2xl font-extrabold text-white mt-3">
          {sourceEvent ? '📄 Duplicate Event' : '🎾 New Event'}
        </h1>
        <p className="text-green-100 text-sm mt-1">
          {sourceEvent
            ? `Copying details from "${sourceEvent.name}" for ${activeClub.tagName} · ${activeClub.name}`
            : `Creating for ${activeClub.tagName} · ${activeClub.name}`}
        </p>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-20">
        <EventForm
          initialValues={initialValues}
          submitLabel="🎾 Create Event"
          submittingLabel="Creating..."
          error={error}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </main>
    </div>
  );
}

export default function NewEventPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center">
          <div className="text-green-100 text-lg font-semibold">Loading...</div>
        </div>
      }
    >
      <NewEventPageContent />
    </Suspense>
  );
}
