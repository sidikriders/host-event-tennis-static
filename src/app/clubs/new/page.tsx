'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

import { useAuth } from '@/components/AuthProvider';
import { createClub } from '@/lib/storage';
import { Club } from '@/types';

function normalizeTagName(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '')
    .slice(0, 12);
}

function NewClubPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isReady, user } = useAuth();
  const [name, setName] = useState('');
  const [tagName, setTagName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = searchParams.get('next') || '/';

  useEffect(() => {
    if (!isReady) {
      return;
    }

    if (!isAuthenticated) {
      router.replace(`/login?next=/clubs/new`);
    }
  }, [isAuthenticated, isReady, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!user) {
      return;
    }

    const normalizedTag = normalizeTagName(tagName);
    if (!name.trim() || !normalizedTag) {
      setError('Club name and tag name are required.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const club: Club = {
      id: uuidv4(),
      name: name.trim(),
      tagName: normalizedTag,
      description: description.trim(),
      createdById: user.id,
      createdAt: new Date().toISOString(),
    };

    try {
      await createClub(club, user.id);
      router.replace(nextPath);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Failed to create club.');
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
        <h1 className="text-2xl font-extrabold text-white mt-3">🏟️ Create Club</h1>
        <p className="text-green-100 text-sm mt-1">
          Clubs own events, players, and admin permissions.
        </p>
      </header>

      <main className="max-w-xl mx-auto px-4 pb-20">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl p-6 space-y-5">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Club Name *</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. South City Tennis Club"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Tag Name *</label>
            <input
              value={tagName}
              onChange={(event) => setTagName(normalizeTagName(event.target.value))}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 font-semibold uppercase tracking-[0.2em] text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. SCTC"
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              Global unique acronym or short code. Letters, numbers, and underscore only, max 12 characters.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="A short description for members and dashboards."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-base font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-60"
          >
            {submitting ? 'Creating...' : 'Create Club'}
          </button>
        </form>
      </main>
    </div>
  );
}

export default function NewClubPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-700 flex items-center justify-center">
          <div className="text-green-100 text-lg font-semibold">Loading...</div>
        </div>
      }
    >
      <NewClubPageContent />
    </Suspense>
  );
}