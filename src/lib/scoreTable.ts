import { Match, Participant, PlayerStats } from '@/types';

const WIN_POINTS = 3;
const DRAW_POINTS = 1;
const PENDING_POINTS = 1; // same as draw

export function calculateScoreTable(
  participants: Participant[],
  matches: Match[]
): PlayerStats[] {
  const statsMap: Record<string, Omit<PlayerStats, 'rank'>> = {};

  for (const p of participants) {
    statsMap[p.id] = {
      participantId: p.id,
      participant: p,
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      gamesWon: 0,
      gamesLost: 0,
      points: 0,
    };
  }

  for (const match of matches) {
    const allPlayers = [...match.teamA, ...match.teamB];

    for (const playerId of allPlayers) {
      if (!statsMap[playerId]) continue;

      const isTeamA = match.teamA.includes(playerId);

      if (match.status === 'completed' && match.scoreA !== null && match.scoreB !== null) {
        statsMap[playerId].matchesPlayed += 1;

        const myScore = isTeamA ? match.scoreA : match.scoreB;
        const oppScore = isTeamA ? match.scoreB : match.scoreA;

        statsMap[playerId].gamesWon += myScore;
        statsMap[playerId].gamesLost += oppScore;

        if (myScore > oppScore) {
          statsMap[playerId].wins += 1;
          statsMap[playerId].points += WIN_POINTS;
        } else if (myScore < oppScore) {
          statsMap[playerId].losses += 1;
        } else {
          statsMap[playerId].draws += 1;
          statsMap[playerId].points += DRAW_POINTS;
        }
      } else if (match.status === 'pending' || match.status === 'ongoing') {
        // Count as draw for ranking purposes
        statsMap[playerId].matchesPlayed += 1;
        statsMap[playerId].draws += 1;
        statsMap[playerId].points += PENDING_POINTS;
      }
    }
  }

  // Fair bonus: players with fewer matches get a small bonus to level the field
  const maxMatches = Math.max(...Object.values(statsMap).map((s) => s.matchesPlayed), 1);

  const list = Object.values(statsMap).map((s) => {
    const fairBonus = ((maxMatches - s.matchesPlayed) * PENDING_POINTS) / 2;
    return { ...s, points: s.points + fairBonus };
  });

  // Sort: points desc → games won desc → games lost asc → name asc
  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
    if (a.gamesLost !== b.gamesLost) return a.gamesLost - b.gamesLost;
    return a.participant.name.localeCompare(b.participant.name);
  });

  return list.map((s, i) => ({ ...s, rank: i + 1 }));
}
