'use client';

import { Suspense, FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isReady, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const nextPath = searchParams.get('next') || '/';

  useEffect(() => {
    if (isReady && isAuthenticated) {
      router.replace(nextPath);
    }
  }, [isAuthenticated, isReady, nextPath, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); // Clear previous errors

    // Note: I renamed 'username' to 'email' here to match Supabase defaults
    const { error } = await login(username, password);

    if (error) {
      setError(error.message); // Supabase provides descriptive error messages
      return;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-800 to-green-600 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white/95 backdrop-blur shadow-2xl border border-white/30 overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center bg-gradient-to-r from-green-900 to-green-700 text-white">
          <div className="text-5xl mb-3">🎾</div>
          <h1 className="text-3xl font-extrabold tracking-tight">Admin Login</h1>
          <p className="text-green-100 text-sm mt-2">Sign in to manage events, players, attendance, and scores.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-7 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Username</label>
            <input
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="username"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && <p className="text-sm font-medium text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-green-600 px-4 py-3 text-white font-bold hover:bg-green-700 transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-800 to-green-600 flex items-center justify-center px-4 py-10">
          <div className="text-white text-lg font-semibold">Loading...</div>
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}