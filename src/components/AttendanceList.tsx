'use client';

import { EventParticipant, Participant } from '@/types';

interface AttendanceListProps {
  eventParticipants: EventParticipant[];
  participants: Participant[];
  onToggle: (participantId: string, present: boolean) => void;
}

const ORIGIN_COLORS: Record<string, string> = {
  reclub: 'bg-purple-100 text-purple-700',
  kuyy: 'bg-orange-100 text-orange-700',
  ayo: 'bg-blue-100 text-blue-700',
  wa: 'bg-green-100 text-green-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function AttendanceList({
  eventParticipants,
  participants,
  onToggle,
}: AttendanceListProps) {
  if (eventParticipants.length === 0) {
    return (
      <p className="text-gray-500 text-center py-8">
        No participants yet. Add them in the Participants tab.
      </p>
    );
  }

  const presentCount = eventParticipants.filter((ep) => ep.present).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 font-medium">
        {presentCount} / {eventParticipants.length} present
      </p>
      {eventParticipants.map((ep) => {
        const p = participants.find((x) => x.id === ep.participantId);
        if (!p) return null;
        return (
          <div
            key={ep.participantId}
            className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
              ep.present
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200 opacity-60'
            }`}
          >
            <button
              onClick={() => onToggle(ep.participantId, !ep.present)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-transform hover:scale-110 ${
                ep.present ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={ep.present ? 'Mark absent' : 'Mark present'}
            >
              {ep.present ? '✅' : '⬜'}
            </button>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800 truncate">{p.name}</div>
              <div className="text-xs text-gray-500 flex items-center gap-2 flex-wrap">
                <span>{p.gender === 'male' ? '♂' : p.gender === 'female' ? '♀' : '⚧'}</span>
                {p.note && <span>{p.note}</span>}
                {p.instagram && <span>@{p.instagram.replace('@', '')}</span>}
              </div>
            </div>
            {p.origin && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  ORIGIN_COLORS[p.origin] || ORIGIN_COLORS.other
                }`}
              >
                {p.origin}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
