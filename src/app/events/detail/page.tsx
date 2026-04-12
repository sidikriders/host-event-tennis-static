'use client';

import { Suspense } from 'react';
import EventDetailContent from './EventDetailContent';

export default function EventDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-green-900 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    }>
      <EventDetailContent />
    </Suspense>
  );
}
