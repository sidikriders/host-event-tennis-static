import { Match, PlayerStats } from '@/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * Americano: pick players with the fewest matches played first,
 * avoid re-pairing players who were on the same team in the previous round.
 */
export function generateAmericanoMatch(
  presentIds: string[],
  existingMatches: Match[],
  eventId: string,
  matchType: 'single' | 'double'
): Match | null {
  const teamSize = matchType === 'single' ? 1 : 2;
  const required = teamSize * 2;

  if (presentIds.length < required) return null;

  // Count how many times each player has played
  const playCounts: Record<string, number> = {};
  for (const id of presentIds) playCounts[id] = 0;

  for (const m of existingMatches) {
    if (m.status === 'pending' || m.status === 'ongoing' || m.status === 'completed') {
      for (const id of [...m.teamA, ...m.teamB]) {
        if (id in playCounts) playCounts[id] = (playCounts[id] || 0) + 1;
      }
    }
  }

  // Find the last match to avoid re-pairing teammates
  const lastMatch = existingMatches[existingMatches.length - 1];
  const recentTeammates = new Set<string>();
  if (lastMatch) {
    // pairs from last match that shouldn't play together again immediately
    if (lastMatch.teamA.length > 1) {
      lastMatch.teamA.forEach((id) => recentTeammates.add(id));
    }
    if (lastMatch.teamB.length > 1) {
      lastMatch.teamB.forEach((id) => recentTeammates.add(id));
    }
  }

  // Sort by play count ascending, then shuffle within same count for fairness
  const sorted = [...presentIds].sort((a, b) => {
    const diff = (playCounts[a] || 0) - (playCounts[b] || 0);
    if (diff !== 0) return diff;
    return Math.random() - 0.5;
  });

  // Select the required number of players with fewest play counts
  const selected = sorted.slice(0, required);

  // For doubles, try to avoid pairs that played together last match
  let teamA: string[];
  let teamB: string[];

  if (matchType === 'single') {
    teamA = [selected[0]];
    teamB = [selected[1]];
  } else {
    // Try pairing: 0+2 vs 1+3, then 0+3 vs 1+2, then 0+1 vs 2+3
    const arrangements: [string[], string[]][] = [
      [[selected[0], selected[2]], [selected[1], selected[3]]],
      [[selected[0], selected[3]], [selected[1], selected[2]]],
      [[selected[0], selected[1]], [selected[2], selected[3]]],
    ];

    const pairScore = (pair: string[]) => {
      // lower score = better (didn't play together recently)
      return pair.every((p) => !recentTeammates.has(p)) ? 0 : 1;
    };

    arrangements.sort(([tA1, tB1], [tA2, tB2]) => {
      return pairScore(tA1) + pairScore(tB1) - (pairScore(tA2) + pairScore(tB2));
    });

    [teamA, teamB] = arrangements[0];
  }

  const round =
    existingMatches.length > 0
      ? Math.max(...existingMatches.map((m) => m.round)) + 1
      : 1;

  return {
    id: uuidv4(),
    eventId,
    round,
    teamA,
    teamB,
    scoreA: null,
    scoreB: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Mexicano: pair players based on current ranking.
 * Top player pairs with the player ranked just below the midpoint, etc.
 */
export function generateMexicanoMatch(
  presentIds: string[],
  existingMatches: Match[],
  stats: PlayerStats[],
  eventId: string,
  matchType: 'single' | 'double'
): Match | null {
  const teamSize = matchType === 'single' ? 1 : 2;
  const required = teamSize * 2;

  if (presentIds.length < required) return null;

  // Sort present players by their current rank
  const presentStats = stats
    .filter((s) => presentIds.includes(s.participantId))
    .sort((a, b) => a.rank - b.rank);

  // Players not yet in stats (no matches) go to the end
  const rankedIds = presentStats.map((s) => s.participantId);
  const unranked = presentIds.filter((id) => !rankedIds.includes(id));
  const orderedIds = [...rankedIds, ...unranked];

  let teamA: string[];
  let teamB: string[];

  if (matchType === 'single') {
    teamA = [orderedIds[0]];
    teamB = [orderedIds[1]];
  } else {
    // 1st + 4th vs 2nd + 3rd (rank-balanced teams)
    teamA = [orderedIds[0], orderedIds[3]];
    teamB = [orderedIds[1], orderedIds[2]];
  }

  const round =
    existingMatches.length > 0
      ? Math.max(...existingMatches.map((m) => m.round)) + 1
      : 1;

  return {
    id: uuidv4(),
    eventId,
    round,
    teamA,
    teamB,
    scoreA: null,
    scoreB: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}
