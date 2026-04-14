'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { v4 as uuidv4 } from 'uuid';
import { Event } from '@/types';
import { saveEvent } from '@/lib/storage';
import { useAuth } from '@/components/AuthProvider';

export default function NewEventPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [matchType, setMatchType] = useState<'single' | 'double'>('double');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!isAuthenticated) {
      router.replace('/login?next=/events/new');
    }
  }, [isAuthenticated, isReady, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !date || !location.trim()) return;
    setSubmitting(true);
    setError(null);

    const event: Event = {
      id: uuidv4(),
      name: name.trim(),
      date,
      location: location.trim(),
      matchType,
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

  if (!isReady || !isAuthenticated) {
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
      </header>

      <main className="max-w-lg mx-auto px-4 pb-20">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl p-6 space-y-5 mt-2"
        >
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Event Name *
            </label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sunday Americano"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Location *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-400"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Court 1, City Club"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Match Type *</label>
            <div className="grid grid-cols-2 gap-3">
              {(['single', 'double'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setMatchType(type)}
                  className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                    matchType === type
                      ? 'border-green-500 bg-green-50 text-green-800'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {type === 'single' ? '👤 Singles (1v1)' : '👥 Doubles (2v2)'}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-base hover:bg-green-700 transition-colors disabled:opacity-60"
          >
            {submitting ? 'Creating...' : '🎾 Create Event'}
          </button>
        </form>
      </main>
    </div>
  );
}
