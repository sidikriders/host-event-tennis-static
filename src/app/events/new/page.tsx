'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { Event } from '@/types';
import { saveEvent } from '@/lib/storage';
import { useAuth } from '@/components/AuthProvider';
import EventForm from '@/components/EventForm';

export default function NewEventPage() {
  const router = useRouter();
  const { activeClub, isAuthenticated, isClubAdmin, isReady, user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/events/new');
      return;
    }

    if (!activeClub) {
      router.replace('/clubs/new?next=/events/new');
      return;
    }

    if (!isClubAdmin) {
      router.replace('/');
    }
  }, [activeClub, isAuthenticated, isClubAdmin, isReady, router]);

  const handleSubmit = async (values: {
    name: string;
    date: string;
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

  if (!isReady || !isAuthenticated || !activeClub || !isClubAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center">
        <div className="text-green-100 text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700">
      <header className="px-4 pt-8 pb-4">
        <Link href="/" className="text-green-200 hover:text-white text-sm flex items-center gap-1">
          ← Back
        </Link>
        <h1 className="text-2xl font-extrabold text-white mt-3">🎾 New Event</h1>
        <p className="text-green-100 text-sm mt-1">
          Creating for {activeClub.tagName} · {activeClub.name}
        </p>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-20">
        <EventForm
          initialValues={{
            name: '',
            date: new Date().toISOString().split('T')[0],
            location: '',
            courts: ['Court 1'],
            matchType: 'double',
          }}
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
