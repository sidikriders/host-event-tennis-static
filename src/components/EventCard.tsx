'use client';

import Link from 'next/link';
import { Event } from '@/types';
import { format } from 'date-fns';

interface EventCardProps {
  event: Event;
  onDelete: (id: string) => void;
}

export default function EventCard({ event, onDelete }: EventCardProps) {
  const formattedDate = (() => {
    try {
      return format(new Date(event.date), 'MMM d, yyyy');
    } catch {
      return event.date;
    }
  })();

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-100 overflow-hidden">
      <Link href={`/events/detail?id=${event.id}`} className="block p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-gray-900 truncate">{event.name}</h3>
            <p className="text-sm text-gray-500 mt-1">📅 {formattedDate}</p>
            <p className="text-sm text-gray-500">📍 {event.location}</p>
          </div>
          <span
            className={`ml-3 shrink-0 px-2 py-1 rounded-full text-xs font-semibold ${
              event.matchType === 'double'
                ? 'bg-green-100 text-green-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {event.matchType === 'double' ? '2v2' : '1v1'}
          </span>
        </div>
      </Link>
      <div className="px-5 pb-4 flex justify-end">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete event "${event.name}"?`)) onDelete(event.id);
          }}
          className="text-xs text-red-400 hover:text-red-600 transition-colors"
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}
