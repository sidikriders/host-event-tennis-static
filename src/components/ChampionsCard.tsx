'use client';

import { forwardRef } from 'react';
import { PlayerStats } from '@/types';

interface ChampionsCardProps {
  stats: PlayerStats[];
  eventName: string;
  eventDate: string;
}

const MEDAL = ['🥇', '🥈', '🥉'];
const COLORS = [
  'bg-gradient-to-b from-yellow-400 to-yellow-200 border-yellow-500',
  'bg-gradient-to-b from-gray-300 to-gray-100 border-gray-400',
  'bg-gradient-to-b from-orange-400 to-orange-200 border-orange-500',
];

const ChampionsCard = forwardRef<HTMLDivElement, ChampionsCardProps>(
  ({ stats, eventName, eventDate }, ref) => {
    const top3 = stats.slice(0, 3);

    return (
      <div
        ref={ref}
        className="bg-gradient-to-br from-green-800 to-green-600 rounded-2xl p-8 text-white shadow-xl min-w-[320px]"
      >
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-2xl font-bold">{eventName}</h2>
          <p className="text-green-200 text-sm">{eventDate}</p>
          <p className="text-green-100 font-semibold mt-1">Champions</p>
        </div>

        <div className="flex items-end justify-center gap-4">
          {/* 2nd place */}
          {top3[1] && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">{MEDAL[1]}</span>
              <div
                className={`${COLORS[1]} border-2 rounded-xl px-4 py-5 text-center min-w-[90px] h-28 flex flex-col justify-end`}
              >
                <div className="font-bold text-gray-800 text-sm leading-tight">
                  {top3[1].participant.name}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {top3[1].points % 1 === 0 ? top3[1].points : top3[1].points.toFixed(1)} pts
                </div>
              </div>
            </div>
          )}

          {/* 1st place */}
          {top3[0] && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-4xl">{MEDAL[0]}</span>
              <div
                className={`${COLORS[0]} border-2 rounded-xl px-4 py-7 text-center min-w-[100px] h-36 flex flex-col justify-end`}
              >
                <div className="font-bold text-gray-800 text-base leading-tight">
                  {top3[0].participant.name}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {top3[0].points % 1 === 0 ? top3[0].points : top3[0].points.toFixed(1)} pts
                </div>
              </div>
            </div>
          )}

          {/* 3rd place */}
          {top3[2] && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-3xl">{MEDAL[2]}</span>
              <div
                className={`${COLORS[2]} border-2 rounded-xl px-4 py-4 text-center min-w-[90px] h-24 flex flex-col justify-end`}
              >
                <div className="font-bold text-gray-800 text-sm leading-tight">
                  {top3[2].participant.name}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {top3[2].points % 1 === 0 ? top3[2].points : top3[2].points.toFixed(1)} pts
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-green-200 text-xs">🎾 Tennis Americano</div>
      </div>
    );
  }
);

ChampionsCard.displayName = 'ChampionsCard';

export default ChampionsCard;
