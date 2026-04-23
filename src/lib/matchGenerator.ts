import { EventMatchRule, Match, PlayerStats } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export interface MatchRuleViolation {
  rule: EventMatchRule;
  message: string;
}

function normalizeCourts(courts: string[]): string[] {
  const nextCourts = courts.map((court) => court.trim()).filter(Boolean);
  return nextCourts.length > 0 ? nextCourts : ['Court 1'];
}

export function getNextGeneratedRound(courts: string[], existingMatches: Match[]): number {
  const availableCourts = normalizeCourts(courts);

  if (existingMatches.length === 0) {
    return 1;
  }

  const latestRound = Math.max(...existingMatches.map((match) => match.round));
  const usedCourtsInLatestRound = new Set(
    existingMatches
      .filter((match) => match.round === latestRound)
      .map((match) => match.court)
      .filter((court) => availableCourts.includes(court))
  );

  return usedCourtsInLatestRound.size < availableCourts.length
    ? latestRound
    : latestRound + 1;
}

function getCourtForMatch(courts: string[], existingMatches: Match[]): string {
  const availableCourts = normalizeCourts(courts);
  const usageByCourt = new Map(availableCourts.map((court) => [court, 0]));

  for (const match of existingMatches) {
    usageByCourt.set(match.court, (usageByCourt.get(match.court) ?? 0) + 1);
  }

  return availableCourts.reduce((selectedCourt, court) => {
    if ((usageByCourt.get(court) ?? 0) < (usageByCourt.get(selectedCourt) ?? 0)) {
      return court;
    }

    return selectedCourt;
  }, availableCourts[0]);
}

function getPairKey(leftId: string, rightId: string): string {
  return leftId < rightId ? `${leftId}:${rightId}` : `${rightId}:${leftId}`;
}

function buildPairKeys(playerIds: string[]): string[] {
  const pairKeys: string[] = [];

  for (let leftIndex = 0; leftIndex < playerIds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < playerIds.length; rightIndex += 1) {
      pairKeys.push(getPairKey(playerIds[leftIndex], playerIds[rightIndex]));
    }
  }

  return pairKeys;
}

function findMatchRuleViolation(
  teamA: string[],
  teamB: string[],
  matchRules: EventMatchRule[]
): MatchRuleViolation | null {
  const teammatePairs = new Set([...buildPairKeys(teamA), ...buildPairKeys(teamB)]);
  const opponentPairs = new Set(
    teamA.flatMap((playerA) => teamB.map((playerB) => getPairKey(playerA, playerB)))
  );
  const sameMatchPairs = new Set(buildPairKeys([...teamA, ...teamB]));

  for (const rule of matchRules) {
    const pairKey = getPairKey(rule.participant1Id, rule.participant2Id);

    if (rule.ruleType === 'avoid_teammate' && teammatePairs.has(pairKey)) {
      return {
        rule,
        message: 'Selected players include a pair that must not be on the same team.',
      };
    }

    if (rule.ruleType === 'avoid_opponent' && opponentPairs.has(pairKey)) {
      return {
        rule,
        message: 'Selected players include a pair that must not face each other.',
      };
    }

    if (rule.ruleType === 'avoid_same_match' && sameMatchPairs.has(pairKey)) {
      return {
        rule,
        message: 'Selected players include a pair that must not appear in the same match.',
      };
    }
  }

  return null;
}

export function validateMatchAgainstRules(
  teamA: string[],
  teamB: string[],
  matchRules: EventMatchRule[]
): MatchRuleViolation | null {
  return findMatchRuleViolation(teamA, teamB, matchRules);
}

function getRecentTeammatePairs(lastMatch: Match | undefined): Set<string> {
  if (!lastMatch) {
    return new Set<string>();
  }

  return new Set([...buildPairKeys(lastMatch.teamA), ...buildPairKeys(lastMatch.teamB)]);
}

function getCombinationGroups(playerIds: string[], size: number): string[][] {
  const groups: string[][] = [];

  function walk(startIndex: number, currentGroup: string[]) {
    if (currentGroup.length === size) {
      groups.push([...currentGroup]);
      return;
    }

    for (let index = startIndex; index <= playerIds.length - (size - currentGroup.length); index += 1) {
      currentGroup.push(playerIds[index]);
      walk(index + 1, currentGroup);
      currentGroup.pop();
    }
  }

  walk(0, []);
  return groups;
}

function getAmericanoArrangements(selectedIds: string[], matchType: 'single' | 'double'): [string[], string[]][] {
  if (matchType === 'single') {
    return [[[selectedIds[0]], [selectedIds[1]]]];
  }

  return [
    [[selectedIds[0], selectedIds[2]], [selectedIds[1], selectedIds[3]]],
    [[selectedIds[0], selectedIds[3]], [selectedIds[1], selectedIds[2]]],
    [[selectedIds[0], selectedIds[1]], [selectedIds[2], selectedIds[3]]],
  ];
}

function getRecentTeammateScore(team: string[], recentTeammatePairs: Set<string>): number {
  return buildPairKeys(team).reduce((score, pairKey) => {
    return score + (recentTeammatePairs.has(pairKey) ? 1 : 0);
  }, 0);
}

/**
 * Americano: pick players with the fewest matches played first,
 * avoid re-pairing players who were on the same team in the previous round.
 */
export function generateAmericanoMatch(
  presentIds: string[],
  existingMatches: Match[],
  clubId: string,
  eventId: string,
  matchType: 'single' | 'double',
  courts: string[],
  matchRules: EventMatchRule[] = []
): Match | null {
  const teamSize = matchType === 'single' ? 1 : 2;
  const required = teamSize * 2;

  if (presentIds.length < required) return null;

  // Count how many times each player has played, and track the last round they played
  const playCounts: Record<string, number> = {};
  const lastRoundPlayed: Record<string, number> = {};
  for (const id of presentIds) { playCounts[id] = 0; lastRoundPlayed[id] = 0; }

  for (const m of existingMatches) {
    if (m.status === 'pending' || m.status === 'ongoing' || m.status === 'completed') {
      for (const id of [...m.teamA, ...m.teamB]) {
        if (id in playCounts) {
          playCounts[id] = (playCounts[id] || 0) + 1;
          if (m.round > (lastRoundPlayed[id] || 0)) lastRoundPlayed[id] = m.round;
        }
      }
    }
  }

  const lastMatch = existingMatches[existingMatches.length - 1];
  const recentTeammatePairs = getRecentTeammatePairs(lastMatch);

  // Sort by play count ascending; within the same count prefer players who
  // waited longer (lower lastRoundPlayed = sat out more rounds); randomise
  // only when fully tied to ensure fair rotation.
  const sorted = [...presentIds].sort((a, b) => {
    const countDiff = (playCounts[a] || 0) - (playCounts[b] || 0);
    if (countDiff !== 0) return countDiff;
    // Lower lastRoundPlayed means the player has been waiting longer → higher priority
    const restDiff = (lastRoundPlayed[a] || 0) - (lastRoundPlayed[b] || 0);
    if (restDiff !== 0) return restDiff;
    return Math.random() - 0.5;
  });

  let teamA: string[] | null = null;
  let teamB: string[] | null = null;

  for (const selectedIds of getCombinationGroups(sorted, required)) {
    const rankedArrangements = getAmericanoArrangements(selectedIds, matchType)
      .map(([candidateTeamA, candidateTeamB]) => ({
        teamA: candidateTeamA,
        teamB: candidateTeamB,
        violation: findMatchRuleViolation(candidateTeamA, candidateTeamB, matchRules),
        recentScore:
          getRecentTeammateScore(candidateTeamA, recentTeammatePairs)
          + getRecentTeammateScore(candidateTeamB, recentTeammatePairs),
      }))
      .filter((candidate) => candidate.violation === null)
      .sort((left, right) => left.recentScore - right.recentScore);

    if (rankedArrangements.length > 0) {
      teamA = rankedArrangements[0].teamA;
      teamB = rankedArrangements[0].teamB;
      break;
    }
  }

  if (!teamA || !teamB) {
    return null;
  }

  const round = getNextGeneratedRound(courts, existingMatches);

  return {
    id: uuidv4(),
    clubId,
    eventId,
    round,
    court: getCourtForMatch(courts, existingMatches),
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
  clubId: string,
  eventId: string,
  matchType: 'single' | 'double',
  courts: string[]
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
  if (orderedIds.length < required) return null;

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

  const round = getNextGeneratedRound(courts, existingMatches);

  return {
    id: uuidv4(),
    clubId,
    eventId,
    round,
    court: getCourtForMatch(courts, existingMatches),
    teamA,
    teamB,
    scoreA: null,
    scoreB: null,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}
